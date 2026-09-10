import uuid

import pytest

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.models.catalog import Category


async def _make_category() -> str:
    slug = f"test-admin-category-{uuid.uuid4().hex[:8]}"
    async with async_session_factory() as session:
        session.add(Category(name="Test Admin Category", slug=slug))
        await session.commit()
    return slug


def _admin_headers() -> dict[str, str]:
    key = get_settings().admin_api_key
    assert key, "ADMIN_API_KEY must be set to run admin tests (see backend/README.md)"
    return {"X-Admin-Token": key}


def _session_header() -> dict[str, str]:
    return {"X-Session-Id": f"pytest-admin-{uuid.uuid4().hex[:8]}"}


def _address() -> dict:
    return {
        "firstName": "Jane",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "Springfield",
        "postalCode": "12345",
        "countryCode": "US",
    }


async def _place_order(client, variant_id: str) -> dict:
    headers = _session_header()
    await client.post("/api/v1/cart/items", headers=headers, json={"variantId": variant_id, "quantity": 1})
    resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "admintest@example.com", "shippingAddress": _address(), "paymentMethod": "card_link"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_admin_requires_a_valid_token(client) -> None:
    no_header = await client.get("/api/v1/admin/orders")
    assert no_header.status_code == 401

    wrong_token = await client.get("/api/v1/admin/orders", headers={"X-Admin-Token": "not-the-real-key"})
    assert wrong_token.status_code == 401


@pytest.mark.asyncio
async def test_admin_list_and_get_product(client, sample_product) -> None:
    listed = await client.get(
        "/api/v1/admin/products", headers=_admin_headers(), params={"search": sample_product["product_slug"]}
    )
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert len(items) == 1
    assert items[0]["slug"] == sample_product["product_slug"]

    fetched = await client.get(f"/api/v1/admin/products/{items[0]['id']}", headers=_admin_headers())
    assert fetched.status_code == 200
    assert fetched.json()["variants"][0]["quantityAvailable"] == sample_product["available"]


@pytest.mark.asyncio
async def test_admin_create_update_and_adjust_inventory(client) -> None:
    slug = f"admin-created-{uuid.uuid4().hex[:8]}"
    category_slug = await _make_category()
    created = await client.post(
        "/api/v1/admin/products",
        headers=_admin_headers(),
        json={
            "name": "Admin Created Product",
            "slug": slug,
            "categorySlug": category_slug,
            "region": "usa",
            "imageKey": "classic-bear-bucket-hat",
            "variants": [{"quantity": 10, "label": "10-Pack", "price": "85", "quantityAvailable": 20}],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["slug"] == slug
    assert body["variants"][0]["quantityAvailable"] == 20
    variant_id = body["variants"][0]["id"]
    product_id = body["id"]

    updated = await client.patch(
        f"/api/v1/admin/products/{product_id}",
        headers=_admin_headers(),
        json={"status": "inactive", "isBestSeller": True},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "inactive"
    assert updated.json()["isBestSeller"] is True

    adjusted = await client.patch(
        f"/api/v1/admin/products/variants/{variant_id}/inventory",
        headers=_admin_headers(),
        json={"quantityAvailable": 5, "reason": "manual recount"},
    )
    assert adjusted.status_code == 200, adjusted.text
    assert adjusted.json()["quantityAvailable"] == 5

    # Both mutations should be traceable in the audit log.
    logs = await client.get(
        "/api/v1/admin/audit-logs", headers=_admin_headers(), params={"entityType": "product"}
    )
    actions = [row["action"] for row in logs.json()["items"] if row["entityId"] == product_id]
    assert "product.create" in actions
    assert "product.update" in actions


@pytest.mark.asyncio
async def test_admin_orders_list_get_and_fulfillment_update(client, sample_product) -> None:
    order = await _place_order(client, sample_product["variant_id"])
    order_id = order["order"]["id"]

    listed = await client.get(
        "/api/v1/admin/orders", headers=_admin_headers(), params={"search": order["order"]["orderNumber"]}
    )
    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] == 1

    fetched = await client.get(f"/api/v1/admin/orders/{order_id}", headers=_admin_headers())
    assert fetched.status_code == 200
    assert fetched.json()["customerEmail"] == "admintest@example.com"
    assert len(fetched.json()["payments"]) == 1

    updated = await client.patch(
        f"/api/v1/admin/orders/{order_id}",
        headers=_admin_headers(),
        json={"fulfillmentStatus": "shipped", "trackingNumber": "1Z999", "carrier": "UPS"},
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["fulfillmentStatus"] == "shipped"
    assert body["status"] == "shipped"  # coarse order.status advances alongside it
    assert body["trackingNumber"] == "1Z999"


@pytest.mark.asyncio
async def test_admin_compliance_queue_excludes_orders_not_requiring_review(client, sample_product) -> None:
    order = await _place_order(client, sample_product["variant_id"])

    queue = await client.get("/api/v1/admin/compliance/reviews", headers=_admin_headers())
    assert queue.status_code == 200
    # sample_product never sets requires_prescription, so compliance_status
    # stays "not_required" and the order must not appear in the queue.
    assert order["order"]["id"] not in [row["orderId"] for row in queue.json()]


@pytest.mark.asyncio
async def test_admin_refund_admin_initiated(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items", headers=headers, json={"variantId": sample_product["variant_id"], "quantity": 1}
    )
    order_resp = await client.post(
        "/api/v1/checkout/create-order",
        headers={**headers, "Idempotency-Key": f"key-{uuid.uuid4().hex}"},
        json={"email": "refundtest@example.com", "shippingAddress": _address(), "paymentMethod": "card_link"},
    )
    assert order_resp.status_code == 201
    payment_id = order_resp.json()["payment"]["id"]
    total = order_resp.json()["order"]["totalAmount"]

    captured = await client.post(
        f"/api/v1/payments/{payment_id}/capture", headers=headers, json={"outcome": "succeed"}
    )
    assert captured.status_code == 200, captured.text

    refunded = await client.post(
        "/api/v1/admin/refunds",
        headers=_admin_headers(),
        json={"paymentId": payment_id, "amount": total, "reason": "Admin-initiated test refund"},
    )
    assert refunded.status_code == 201, refunded.text
    assert refunded.json()["status"] == "succeeded"

    refund_list = await client.get("/api/v1/admin/refunds", headers=_admin_headers())
    assert any(r["paymentId"] == payment_id for r in refund_list.json()["items"])

    checkouts = await client.get(
        "/api/v1/admin/checkouts", headers=_admin_headers(), params={"provider": "fake"}
    )
    assert any(c["paymentId"] == payment_id for c in checkouts.json()["items"])

    logs = await client.get(
        "/api/v1/admin/audit-logs", headers=_admin_headers(), params={"entityType": "payment"}
    )
    assert any(row["entityId"] == payment_id and row["action"] == "refund.create" for row in logs.json()["items"])
