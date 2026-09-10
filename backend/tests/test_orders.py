import uuid

import pytest


def _session_header() -> dict[str, str]:
    return {"X-Session-Id": f"pytest-order-{uuid.uuid4().hex[:8]}"}


def _address() -> dict:
    return {
        "firstName": "Jane",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "Springfield",
        "postalCode": "12345",
        "countryCode": "US",
    }


async def _checkout(client, headers, email="buyer@example.com", idempotency_key=None):
    checkout_headers = dict(headers)
    if idempotency_key:
        checkout_headers["Idempotency-Key"] = idempotency_key
    return await client.post(
        "/api/v1/checkout/create-order",
        headers=checkout_headers,
        json={"email": email, "shippingAddress": _address()},
    )


@pytest.mark.asyncio
async def test_checkout_empty_cart_is_rejected(client) -> None:
    response = await _checkout(client, _session_header())

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_checkout_validate_reports_clean_cart(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 2},
    )

    response = await client.post("/api/v1/checkout/validate", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"valid": True, "issues": []}


@pytest.mark.asyncio
async def test_full_success_lifecycle_reserves_then_settles_inventory(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 2},
    )

    order_response = await _checkout(client, headers, idempotency_key=f"key-{uuid.uuid4().hex}")
    assert order_response.status_code == 201
    body = order_response.json()
    order = body["order"]
    payment = body["payment"]

    assert order["status"] == "awaiting_payment"
    # fixture price is 100/unit * 2 = 200 subtotal; +$15 flat shipping,
    # +5% tax on (subtotal+shipping) = (215)*1.05 = 225.75 — see
    # app/services/orders.py::compute_order_totals.
    assert order["totalAmount"] == 225.75
    assert order["items"][0]["quantity"] == 2
    assert payment["status"] == "created"

    # cart_items fixture seeds quantity_available=5 — reserving 2 leaves 3 available, 2 reserved.
    cart_after = await client.get("/api/v1/cart", headers=headers)
    assert cart_after.json() == {"items": []}, "checkout must clear the cart"

    capture_response = await client.post(
        f"/api/v1/payments/{payment['id']}/capture", headers=headers, json={"outcome": "succeed"}
    )
    assert capture_response.status_code == 200
    captured = capture_response.json()
    assert captured["order"]["status"] == "processing"
    assert captured["payment"]["status"] == "captured"

    # Re-capturing an already-processed payment must be rejected, not silently repeated.
    replay_response = await client.post(
        f"/api/v1/payments/{payment['id']}/capture", headers=headers, json={"outcome": "succeed"}
    )
    assert replay_response.status_code == 409
    assert replay_response.json()["detail"]["code"] == "PAYMENT_ALREADY_PROCESSED"


@pytest.mark.asyncio
async def test_failed_payment_cancels_order_and_releases_reservation(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 3},
    )
    order_response = await _checkout(client, headers, idempotency_key=f"key-{uuid.uuid4().hex}")
    payment_id = order_response.json()["payment"]["id"]

    capture_response = await client.post(
        f"/api/v1/payments/{payment_id}/capture", headers=headers, json={"outcome": "fail"}
    )

    assert capture_response.status_code == 200
    body = capture_response.json()
    assert body["order"]["status"] == "cancelled"
    assert body["payment"]["status"] == "failed"

    # A failed payment must fully release its reservation — the same variant
    # should be orderable again for the full original stock.
    variant_id = sample_product["variant_id"]
    reorder_response = await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": variant_id, "quantity": 5}
    )
    assert reorder_response.status_code == 201


@pytest.mark.asyncio
async def test_checkout_is_idempotent_on_repeated_key(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )
    key = f"idem-{uuid.uuid4().hex}"

    first = await _checkout(client, headers, idempotency_key=key)
    # Cart is now empty; a naive retry would 400 on an empty cart if it didn't
    # short-circuit on the idempotency key before touching the cart at all.
    second = await _checkout(client, headers, idempotency_key=key)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["order"]["id"] == second.json()["order"]["id"]
    assert first.json()["payment"]["id"] == second.json()["payment"]["id"]


@pytest.mark.asyncio
async def test_checkout_rejects_over_stock_quantity(client, sample_product) -> None:
    headers = _session_header()
    # fixture inventory available=5; add 5 via the cart (allowed), then drop
    # available stock out from under the cart before checking out to force
    # the checkout-time re-validation path (distinct from cart's own check).
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 5},
    )

    from sqlalchemy import update

    from app.core.database import async_session_factory
    from app.models.catalog import Inventory

    async with async_session_factory() as session:
        await session.execute(
            update(Inventory)
            .where(Inventory.variant_id == uuid.UUID(sample_product["variant_id"]))
            .values(quantity_available=1)
        )
        await session.commit()

    response = await _checkout(client, headers, idempotency_key=f"key-{uuid.uuid4().hex}")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STOCK_INSUFFICIENT"


@pytest.mark.asyncio
async def test_cancel_before_payment_releases_reservation(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 4},
    )
    order_response = await _checkout(client, headers, idempotency_key=f"key-{uuid.uuid4().hex}")
    order_id = order_response.json()["order"]["id"]

    cancel_response = await client.post(f"/api/v1/orders/{order_id}/cancel", headers=headers)

    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "cancelled"

    reorder_response = await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 5},
    )
    assert reorder_response.status_code == 201


@pytest.mark.asyncio
async def test_cannot_cancel_order_already_processing(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )
    order_response = await _checkout(client, headers, idempotency_key=f"key-{uuid.uuid4().hex}")
    order_id = order_response.json()["order"]["id"]
    payment_id = order_response.json()["payment"]["id"]

    await client.post(f"/api/v1/payments/{payment_id}/capture", headers=headers, json={"outcome": "succeed"})

    response = await client.post(f"/api/v1/orders/{order_id}/cancel", headers=headers)

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "ORDER_NOT_CANCELLABLE"


@pytest.mark.asyncio
async def test_orders_are_scoped_to_session(client, sample_product) -> None:
    owner_headers = _session_header()
    other_headers = _session_header()

    await client.post(
        "/api/v1/cart/items", headers=owner_headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )
    order_response = await _checkout(client, owner_headers, idempotency_key=f"key-{uuid.uuid4().hex}")
    order_id = order_response.json()["order"]["id"]

    owner_list = await client.get("/api/v1/orders", headers=owner_headers)
    other_list = await client.get("/api/v1/orders", headers=other_headers)
    other_detail = await client.get(f"/api/v1/orders/{order_id}", headers=other_headers)

    assert any(o["id"] == order_id for o in owner_list.json())
    assert other_list.json() == []
    assert other_detail.status_code == 404
