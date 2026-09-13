import uuid

import pytest
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.catalog import Inventory
from app.models.order import Order
from app.models.payment import Payment
from app.models.payment_event import PaymentEvent


def _session_header() -> dict[str, str]:
    return {"X-Session-Id": f"pytest-webhook-{uuid.uuid4().hex[:8]}"}


def _address() -> dict:
    return {
        "firstName": "Jane",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "Springfield",
        "postalCode": "12345",
        "countryCode": "US",
    }


async def _create_crypto_order(client, sample_product, quantity: int = 2):
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": quantity},
    )
    response = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "buyer@example.com", "shippingAddress": _address(), "paymentMethod": "crypto"},
    )
    assert response.status_code == 201, response.text
    return response.json(), headers


async def _get_payment_by_order_id(order_id: str) -> Payment:
    async with async_session_factory() as session:
        result = await session.execute(select(Payment).where(Payment.order_id == uuid.UUID(order_id)))
        return result.scalar_one()


async def _get_available(variant_id: str) -> int:
    async with async_session_factory() as session:
        result = await session.execute(
            select(Inventory).where(Inventory.variant_id == uuid.UUID(variant_id))
        )
        return result.scalar_one().quantity_available


def _callback_params(
    addr: str, status: int = 2, value: int = 100_000, txid: str | None = None, secret: str = "test-callback-secret"
) -> dict:
    return {
        "secret": secret,
        "addr": addr,
        "txid": txid or f"tx-{uuid.uuid4().hex}",
        "status": status,
        "value": value,
    }


@pytest.mark.asyncio
async def test_webhook_missing_secret_rejected(client) -> None:
    response = await client.get(
        "/api/v1/webhooks/payments/blockonomics",
        params={"addr": "bc1qtest", "txid": "tx1", "status": 1, "value": 1000},
    )
    assert response.status_code == 422  # secret is a required query param


@pytest.mark.asyncio
async def test_webhook_invalid_secret_rejected(client, blockonomics_configured) -> None:
    response = await client.get(
        "/api/v1/webhooks/payments/blockonomics",
        params=_callback_params("bc1qdoesnotmatter", secret="wrong-secret"),
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_success_settles_order(client, blockonomics_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    assert body["payment"]["provider"] == "blockonomics"
    assert body["payment"]["checkoutMode"] == "blockonomics"
    assert body["payment"]["checkoutUrl"] is None
    assert body["payment"]["cryptoAddress"]
    assert body["payment"]["status"] == "created"
    assert body["order"]["status"] == "awaiting_payment"

    payment = await _get_payment_by_order_id(body["order"]["id"])
    response = await client.get(
        "/api/v1/webhooks/payments/blockonomics", params=_callback_params(payment.provider_payment_id)
    )
    assert response.status_code == 200

    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "processing"

    # fixture starts at 5 available; 2 consumed by a settled sale — 3 remain,
    # nothing left reserved.
    assert await _get_available(sample_product["variant_id"]) == 3


@pytest.mark.asyncio
async def test_webhook_duplicate_delivery_is_idempotent(client, blockonomics_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    payment = await _get_payment_by_order_id(body["order"]["id"])
    params = _callback_params(payment.provider_payment_id, txid="tx-fixed")
    provider_event_id = f"{params['txid']}:{params['status']}:{params['addr']}"

    first = await client.get("/api/v1/webhooks/payments/blockonomics", params=params)
    second = await client.get("/api/v1/webhooks/payments/blockonomics", params=params)

    assert first.status_code == 200
    assert second.status_code == 200  # still success, not reprocessed — never a retry-worthy error

    # The state guard (`if payment.status == PaymentStatus.created`) would by
    # itself stop a reprocessed event from double-applying business logic, so
    # checking inventory alone wouldn't isolate the dedup layer this test is
    # actually about. The precise claim — the second delivery never got as
    # far as being treated as a new event — is that exactly one
    # payment_events row exists for this provider_event_id, proving the
    # UNIQUE constraint (not the state guard) is what caught the duplicate.
    async with async_session_factory() as session:
        result = await session.execute(
            select(PaymentEvent).where(PaymentEvent.provider_event_id == provider_event_id)
        )
        matching_events = result.scalars().all()
    assert len(matching_events) == 1
    assert matching_events[0].processed is True

    assert await _get_available(sample_product["variant_id"]) == 3

    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "processing"


@pytest.mark.asyncio
async def test_webhook_confirmation_after_processing_is_informational_only(
    client, blockonomics_configured, sample_product
) -> None:
    """Phase 8: fulfillment must not wait on full confirmation. Once an
    earlier (status=0/1) callback has already settled the order, a later,
    higher-confirmation callback (status=2+) for the same address must not
    be re-applied (there's nothing left to consume — the reservation was
    already released)."""
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    payment = await _get_payment_by_order_id(body["order"]["id"])

    first_params = _callback_params(payment.provider_payment_id, status=0, txid="tx-a")
    await client.get("/api/v1/webhooks/payments/blockonomics", params=first_params)

    later_params = _callback_params(payment.provider_payment_id, status=2, txid="tx-a")
    response = await client.get("/api/v1/webhooks/payments/blockonomics", params=later_params)
    assert response.status_code == 200

    # Still exactly 3 available (5 - 2), not double-released or re-consumed.
    assert await _get_available(sample_product["variant_id"]) == 3
    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "processing"


@pytest.mark.asyncio
async def test_manual_capture_rejected_for_blockonomics_payment(
    client, blockonomics_configured, sample_product
) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=1)
    response = await client.post(
        f"/api/v1/payments/{body['payment']['id']}/capture",
        headers=headers,
        json={"outcome": "succeed"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PROVIDER_SETTLES_VIA_WEBHOOK"


@pytest.mark.asyncio
async def test_blockonomics_address_rejection_returns_502_not_500(
    client, blockonomics_configured, sample_product, monkeypatch
) -> None:
    # A Blockonomics API failure (rate limit, outage, etc.) must surface as a
    # handled 502 with a readable message and CORS headers, not an uncaught
    # 500 that the browser reports as a bare NetworkError.
    from app.integrations.payments import blockonomics as blockonomics_module

    async def boom(self, *a, **kw):
        raise blockonomics_module.BlockonomicsError("Blockonomics rejected the address request (HTTP 429).")

    monkeypatch.setattr(blockonomics_module.BlockonomicsProvider, "create_payment_session", boom)

    headers = _session_header()
    await client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )
    response = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}", "Origin": "http://localhost:5173"},
        json={"email": "b@e.com", "shippingAddress": _address(), "paymentMethod": "crypto"},
    )
    assert response.status_code == 502
    assert "Blockonomics" in response.json()["detail"]
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

    async with async_session_factory() as session:
        orders = (
            await session.execute(select(Order).where(Order.session_id == headers["X-Session-Id"]))
        ).scalars().all()
    assert orders == [], "a failed payment session must roll the order back"
