import uuid

import pytest

from app.core.database import async_session_factory
from app.models.payment import Payment


def _session_header() -> dict[str, str]:
    return {"X-Session-Id": f"pytest-refund-{uuid.uuid4().hex[:8]}"}


def _address() -> dict:
    return {
        "firstName": "Jane",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "Springfield",
        "postalCode": "12345",
        "countryCode": "US",
    }


async def _get_payment_by_order_id(order_id: str) -> Payment:
    from sqlalchemy import select

    async with async_session_factory() as session:
        result = await session.execute(select(Payment).where(Payment.order_id == uuid.UUID(order_id)))
        return result.scalar_one()


@pytest.mark.asyncio
async def test_refund_fake_provider_after_manual_capture(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 1}
    )
    order_resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "buyer@example.com", "shippingAddress": _address(), "paymentMethod": "card_link"},
    )
    payment_id = order_resp.json()["payment"]["id"]
    total = order_resp.json()["order"]["totalAmount"]

    await client.post(f"/api/v1/payments/{payment_id}/capture", headers=headers, json={"outcome": "succeed"})

    refund_response = await client.post(
        f"/api/v1/payments/{payment_id}/refund",
        headers=headers,
        json={"amount": total, "reason": "Customer requested"},
    )
    assert refund_response.status_code == 201, refund_response.text
    refund_body = refund_response.json()
    assert refund_body["paymentId"] == payment_id
    assert refund_body["amount"] == total

    order_response = await client.get(f"/api/v1/orders/{order_resp.json()['order']['id']}", headers=headers)
    assert order_response.json()["status"] == "refunded"


@pytest.mark.asyncio
async def test_refund_rejects_uncaptured_payment(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 1}
    )
    order_resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "buyer@example.com", "shippingAddress": _address(), "paymentMethod": "card_link"},
    )
    payment_id = order_resp.json()["payment"]["id"]

    # Payment is still "created" (never captured) — nothing to refund yet.
    response = await client.post(
        f"/api/v1/payments/{payment_id}/refund", headers=headers, json={"amount": 10}
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PAYMENT_NOT_REFUNDABLE"


@pytest.mark.asyncio
async def test_refund_rejects_amount_over_remaining(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 1}
    )
    order_resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "buyer@example.com", "shippingAddress": _address(), "paymentMethod": "card_link"},
    )
    payment_id = order_resp.json()["payment"]["id"]
    total = order_resp.json()["order"]["totalAmount"]
    await client.post(f"/api/v1/payments/{payment_id}/capture", headers=headers, json={"outcome": "succeed"})

    response = await client.post(
        f"/api/v1/payments/{payment_id}/refund", headers=headers, json={"amount": total + 1}
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "REFUND_EXCEEDS_REMAINING"

    # A second refund attempt after using up the full remaining amount
    # should also be rejected — nothing left to refund.
    full_refund = await client.post(
        f"/api/v1/payments/{payment_id}/refund", headers=headers, json={"amount": total}
    )
    assert full_refund.status_code == 201

    over_refund = await client.post(
        f"/api/v1/payments/{payment_id}/refund", headers=headers, json={"amount": 0.01}
    )
    assert over_refund.status_code in (400, 409)


@pytest.mark.asyncio
async def test_partial_refund_leaves_payment_partially_refunded(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 1}
    )
    order_resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "buyer@example.com", "shippingAddress": _address(), "paymentMethod": "card_link"},
    )
    payment_id = order_resp.json()["payment"]["id"]
    total = order_resp.json()["order"]["totalAmount"]
    order_id = order_resp.json()["order"]["id"]
    await client.post(f"/api/v1/payments/{payment_id}/capture", headers=headers, json={"outcome": "succeed"})

    partial_amount = round(total / 2, 2)
    response = await client.post(
        f"/api/v1/payments/{payment_id}/refund", headers=headers, json={"amount": partial_amount}
    )
    assert response.status_code == 201

    # Order stays in whatever fulfillment state it was in — only a *full*
    # refund flips the order itself to "refunded".
    order_response = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert order_response.json()["status"] == "processing"

    async with async_session_factory() as session:
        payment = await session.get(Payment, uuid.UUID(payment_id))
        assert payment.status.value == "partially_refunded"


@pytest.mark.asyncio
async def test_refund_after_blockonomics_capture(client, blockonomics_configured, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 1}
    )
    order_resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "buyer@example.com", "shippingAddress": _address(), "paymentMethod": "crypto"},
    )
    order_id = order_resp.json()["order"]["id"]
    payment_id = order_resp.json()["payment"]["id"]
    total = order_resp.json()["order"]["totalAmount"]

    payment = await _get_payment_by_order_id(order_id)
    await client.get(
        "/api/v1/webhooks/payments/blockonomics",
        params={
            "secret": "test-callback-secret",
            "addr": payment.provider_payment_id,
            "txid": f"tx-{uuid.uuid4().hex}",
            "status": 2,
            "value": 100_000,
        },
    )

    refund_response = await client.post(
        f"/api/v1/payments/{payment_id}/refund", headers=headers, json={"amount": total}
    )
    assert refund_response.status_code == 201, refund_response.text
    # Blockonomics has no refund API — a human sends it manually from the
    # connected wallet, so the provider just returns a fixed "needs action"
    # status rather than any real gateway-issued one.
    assert refund_response.json()["status"] == "requires_manual_action"

    order_response = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert order_response.json()["status"] == "refunded"
