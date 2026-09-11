import base64
import uuid

import pytest

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.models.catalog import Category

# A minimal valid 1x1 transparent PNG, for exercising the upload endpoint
# without shipping a binary fixture file.
_ONE_PIXEL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


async def _make_category() -> str:
    slug = f"test-admin-category-{uuid.uuid4().hex[:8]}"
    async with async_session_factory() as session:
        session.add(Category(name="Test Admin Category", slug=slug))
        await session.commit()
    return slug


async def _create_product(client, **overrides) -> dict:
    slug = f"admin-created-{uuid.uuid4().hex[:8]}"
    payload = {
        "name": "Admin Created Product",
        "slug": slug,
        "categorySlug": await _make_category(),
        "region": "usa",
        "imageKey": "classic-bear-bucket-hat",
        "variants": [{"quantity": 10, "label": "10-Pack", "price": "85", "quantityAvailable": 20}],
    }
    payload.update(overrides)
    resp = await client.post("/api/v1/admin/products", headers=_admin_headers(), json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


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


@pytest.mark.asyncio
async def test_admin_create_product_without_image_key(client) -> None:
    """A product can be created bare and get its photo attached afterwards
    via the images endpoint — the admin UI's actual create-then-upload flow."""
    created = await _create_product(client, imageKey=None)
    assert created["images"] == []
    assert created["imageKey"] == ""


@pytest.mark.asyncio
async def test_admin_upload_image_and_attach_to_product(client) -> None:
    product = await _create_product(client)
    product_id = product["id"]

    uploaded = await client.post(
        "/api/v1/admin/uploads/image",
        headers=_admin_headers(),
        files={"file": ("photo.png", _ONE_PIXEL_PNG, "image/png")},
    )
    assert uploaded.status_code == 201, uploaded.text
    url = uploaded.json()["url"]
    assert url.startswith("/uploads/products/")

    attached = await client.post(
        f"/api/v1/admin/products/{product_id}/images",
        headers=_admin_headers(),
        json={"url": url, "altText": "Front view", "isPrimary": True},
    )
    assert attached.status_code == 201, attached.text
    images = attached.json()["images"]
    assert len(images) == 2  # the create-time imageKey image, plus this one
    new_image = next(img for img in images if img["url"] == url)
    assert new_image["isPrimary"] is True
    assert attached.json()["imageKey"] == url

    image_id = new_image["id"]
    updated = await client.patch(
        f"/api/v1/admin/products/{product_id}/images/{image_id}",
        headers=_admin_headers(),
        json={"altText": "Updated alt"},
    )
    assert updated.status_code == 200, updated.text
    assert next(i for i in updated.json()["images"] if i["id"] == image_id)["altText"] == "Updated alt"

    deleted = await client.delete(
        f"/api/v1/admin/products/{product_id}/images/{image_id}", headers=_admin_headers()
    )
    assert deleted.status_code == 200, deleted.text
    remaining = deleted.json()["images"]
    assert all(i["id"] != image_id for i in remaining)
    assert any(i["isPrimary"] for i in remaining)  # promoted back after the primary was deleted


@pytest.mark.asyncio
async def test_admin_upload_image_rejects_bad_content_type(client) -> None:
    resp = await client.post(
        "/api/v1/admin/uploads/image",
        headers=_admin_headers(),
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_variant_price_range_crud(client) -> None:
    product = await _create_product(client)
    product_id = product["id"]

    added = await client.post(
        f"/api/v1/admin/products/{product_id}/variants",
        headers=_admin_headers(),
        json={
            "quantity": 30,
            "label": "30-Pack",
            "price": "220",
            "quantityAvailable": 15,
            "savingsLabel": "Save 15%",
        },
    )
    assert added.status_code == 201, added.text
    variants = added.json()["variants"]
    assert len(variants) == 2
    new_variant = next(v for v in variants if v["label"] == "30-Pack")
    assert new_variant["quantityAvailable"] == 15

    variant_id = new_variant["id"]
    edited = await client.patch(
        f"/api/v1/admin/products/{product_id}/variants/{variant_id}",
        headers=_admin_headers(),
        json={"price": "199.99", "active": False},
    )
    assert edited.status_code == 200, edited.text
    edited_variant = next(v for v in edited.json()["variants"] if v["id"] == variant_id)
    assert edited_variant["price"] == 199.99
    assert edited_variant["active"] is False

    original_variant_id = next(v["id"] for v in variants if v["id"] != variant_id)
    deleted = await client.delete(
        f"/api/v1/admin/products/{product_id}/variants/{original_variant_id}", headers=_admin_headers()
    )
    assert deleted.status_code == 200, deleted.text
    assert len(deleted.json()["variants"]) == 1

    # A product's last remaining tier is protected from deletion.
    last_variant_id = deleted.json()["variants"][0]["id"]
    refused = await client.delete(
        f"/api/v1/admin/products/{product_id}/variants/{last_variant_id}", headers=_admin_headers()
    )
    assert refused.status_code == 400


@pytest.mark.asyncio
async def test_admin_categories_list_and_create(client) -> None:
    slug = f"admin-new-category-{uuid.uuid4().hex[:8]}"
    created = await client.post(
        "/api/v1/admin/categories",
        headers=_admin_headers(),
        json={"name": "Admin New Category", "slug": slug},
    )
    assert created.status_code == 201, created.text
    assert created.json()["slug"] == slug

    duplicate = await client.post(
        "/api/v1/admin/categories",
        headers=_admin_headers(),
        json={"name": "Admin New Category Again", "slug": slug},
    )
    assert duplicate.status_code == 409

    listed = await client.get("/api/v1/admin/categories", headers=_admin_headers())
    assert listed.status_code == 200
    assert any(c["slug"] == slug for c in listed.json())
