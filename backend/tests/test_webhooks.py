import hashlib
import hmac
import json
import uuid

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.models.catalog import Inventory
from app.models.order import Order
from app.models.payment import Payment
from app.models.payment_event import PaymentEvent


def _sign(payload: bytes, secret: str = "test-webhook-secret") -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


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


def _event(event_type: str, invoice_id: str, delivery_id: str | None = None) -> bytes:
    return json.dumps(
        {
            "deliveryId": delivery_id or f"del-{uuid.uuid4().hex}",
            "type": event_type,
            "invoiceId": invoice_id,
            "timestamp": 1,
        }
    ).encode()


@pytest.mark.asyncio
async def test_webhook_missing_signature_rejected(client) -> None:
    response = await client.post("/api/v1/webhooks/payments/btcpay", content=b"{}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_invalid_signature_rejected(client, btcpay_configured) -> None:
    body = _event("InvoiceSettled", "inv_doesnotmatter")
    response = await client.post(
        "/api/v1/webhooks/payments/btcpay", content=body, headers={"BTCPay-Sig": "sha256=deadbeef"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_success_settles_order(client, btcpay_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    assert body["payment"]["provider"] == "btcpay"
    assert body["payment"]["checkoutMode"] == "btcpay"
    assert body["payment"]["checkoutUrl"]
    assert body["payment"]["status"] == "created"
    assert body["order"]["status"] == "awaiting_payment"

    payment = await _get_payment_by_order_id(body["order"]["id"])
    event = _event("InvoiceReceivedPayment", payment.provider_payment_id)

    response = await client.post(
        "/api/v1/webhooks/payments/btcpay", content=event, headers={"BTCPay-Sig": _sign(event)}
    )
    assert response.status_code == 200

    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "processing"

    # fixture starts at 5 available; 2 consumed by a settled sale — 3 remain,
    # nothing left reserved.
    assert await _get_available(sample_product["variant_id"]) == 3


@pytest.mark.asyncio
async def test_webhook_invalid_invoice_fails_order(client, btcpay_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    payment = await _get_payment_by_order_id(body["order"]["id"])
    event = _event("InvoiceInvalid", payment.provider_payment_id)

    response = await client.post(
        "/api/v1/webhooks/payments/btcpay", content=event, headers={"BTCPay-Sig": _sign(event)}
    )
    assert response.status_code == 200

    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "cancelled"
    assert await _get_available(sample_product["variant_id"]) == 5  # fully released


@pytest.mark.asyncio
async def test_webhook_expired_invoice_cancels_order(client, btcpay_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=4)
    payment = await _get_payment_by_order_id(body["order"]["id"])
    event = _event("InvoiceExpired", payment.provider_payment_id)

    response = await client.post(
        "/api/v1/webhooks/payments/btcpay", content=event, headers={"BTCPay-Sig": _sign(event)}
    )
    assert response.status_code == 200

    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "cancelled"

    async with async_session_factory() as session:
        refreshed = await session.get(Payment, uuid.UUID(body["payment"]["id"]))
        assert refreshed.status.value == "expired"

    # stock fully released — the same quantity is orderable again
    reorder = await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 5}
    )
    assert reorder.status_code == 201, reorder.text


@pytest.mark.asyncio
async def test_webhook_duplicate_delivery_is_idempotent(client, btcpay_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    payment = await _get_payment_by_order_id(body["order"]["id"])
    delivery_id = f"del-{uuid.uuid4().hex}"
    event = _event("InvoiceReceivedPayment", payment.provider_payment_id, delivery_id=delivery_id)
    sig = _sign(event)

    first = await client.post("/api/v1/webhooks/payments/btcpay", content=event, headers={"BTCPay-Sig": sig})
    second = await client.post("/api/v1/webhooks/payments/btcpay", content=event, headers={"BTCPay-Sig": sig})

    assert first.status_code == 200
    assert second.status_code == 200  # still success, not reprocessed — never a retry-worthy error

    # The state guard (`if payment.status == PaymentStatus.created`) would
    # by itself stop a reprocessed event from double-applying business
    # logic, so checking inventory alone wouldn't isolate the dedup layer
    # this test is actually about. The precise claim — the second delivery
    # never got as far as being treated as a new event — is that exactly
    # one payment_events row exists for this provider_event_id, proving the
    # UNIQUE constraint (not the state guard) is what caught the duplicate.
    async with async_session_factory() as session:
        result = await session.execute(
            select(PaymentEvent).where(PaymentEvent.provider_event_id == delivery_id)
        )
        matching_events = result.scalars().all()
    assert len(matching_events) == 1
    assert matching_events[0].processed is True

    assert await _get_available(sample_product["variant_id"]) == 3

    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "processing"


@pytest.mark.asyncio
async def test_webhook_settled_after_processing_is_informational_only(
    client, btcpay_configured, sample_product
) -> None:
    """Phase 8: fulfillment must not wait on full confirmation. Once an
    InvoiceProcessing/InvoiceReceivedPayment has already settled the order,
    a later InvoiceSettled for the same invoice must not be re-applied
    (there's nothing left to consume — the reservation was already
    released)."""
    body, headers = await _create_crypto_order(client, sample_product, quantity=2)
    payment = await _get_payment_by_order_id(body["order"]["id"])

    first_event = _event("InvoiceReceivedPayment", payment.provider_payment_id)
    await client.post(
        "/api/v1/webhooks/payments/btcpay", content=first_event, headers={"BTCPay-Sig": _sign(first_event)}
    )

    settled_event = _event("InvoiceSettled", payment.provider_payment_id)
    response = await client.post(
        "/api/v1/webhooks/payments/btcpay", content=settled_event, headers={"BTCPay-Sig": _sign(settled_event)}
    )
    assert response.status_code == 200

    # Still exactly 3 available (5 - 2), not double-released or re-consumed.
    assert await _get_available(sample_product["variant_id"]) == 3
    order_response = await client.get(f"/api/v1/orders/{body['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "processing"


@pytest.mark.asyncio
async def test_manual_capture_rejected_for_btcpay_payment(client, btcpay_configured, sample_product) -> None:
    body, headers = await _create_crypto_order(client, sample_product, quantity=1)
    response = await client.post(
        f"/api/v1/payments/{body['payment']['id']}/capture",
        headers=headers,
        json={"outcome": "succeed"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PROVIDER_SETTLES_VIA_WEBHOOK"


@pytest.mark.asyncio
async def test_btcpay_invoice_rejection_returns_502_not_500(
    client, btcpay_configured, sample_product, monkeypatch
) -> None:
    # A BTCPay API failure (e.g. an order total below the BTC dust threshold)
    # must surface as a handled 502 with a readable message and CORS headers,
    # not an uncaught 500 that the browser reports as a bare NetworkError.
    from app.integrations.payments import btcpay as btcpay_module

    async def boom(self, *a, **kw):
        raise btcpay_module.BTCPayError("BTCPay rejected the invoice (HTTP 400).")

    monkeypatch.setattr(btcpay_module.BTCPayProvider, "create_payment_session", boom)

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
    assert "BTCPay" in response.json()["detail"]
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

    async with async_session_factory() as session:
        orders = (
            await session.execute(select(Order).where(Order.session_id == headers["X-Session-Id"]))
        ).scalars().all()
    assert orders == [], "a failed payment session must roll the order back"


@pytest.mark.asyncio
async def test_regtest_address_is_tolerated_outside_production(
    client, btcpay_configured, sample_product
) -> None:
    # The mock BTCPay returns a `bcrt1...` address (regtest). Outside
    # production that's the expected local dev setup, so checkout still
    # succeeds and the address is surfaced as-is (a warning is logged).
    body, _ = await _create_crypto_order(client, sample_product, quantity=1)
    assert body["payment"]["cryptoAddress"].startswith("bcrt1")
    assert body["order"]["status"] == "awaiting_payment"


@pytest.mark.asyncio
async def test_regtest_address_blocks_checkout_in_production(
    client, btcpay_configured, sample_product, monkeypatch
) -> None:
    # A regtest/testnet BTCPay instance in production hands real customers
    # `bcrt1...` addresses that Binance / Trust Wallet reject outright. That
    # must fail the checkout loudly, not silently create a dead order.
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()

    session_headers = _session_header()
    await client.post(
        "/api/v1/cart/items",
        headers=session_headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )
    response = await client.post(
        "/api/v1/checkout/create-order",
        headers={**session_headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={
            "email": "buyer@example.com",
            "shippingAddress": _address(),
            "paymentMethod": "crypto",
        },
    )
    # BTCPayConfigurationError is caught by the handler in main.py and mapped
    # to a 502 (so the response carries CORS headers) rather than propagating
    # as an uncaught 500.
    assert response.status_code == 502
    assert "mainnet" in response.json()["detail"].lower()

    # The whole checkout transaction rolled back — no order, no payment.
    async with async_session_factory() as session:
        orders = (
            await session.execute(select(Order).where(Order.session_id == session_headers["X-Session-Id"]))
        ).scalars().all()
    assert orders == []
