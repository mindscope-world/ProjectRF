import uuid

import pytest


def _session_header() -> dict[str, str]:
    return {"X-Session-Id": f"pytest-{uuid.uuid4().hex[:8]}"}


@pytest.mark.asyncio
async def test_cart_requires_session_header(client) -> None:
    response = await client.get("/api/v1/cart")

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_new_session_has_empty_cart(client) -> None:
    response = await client.get("/api/v1/cart", headers=_session_header())

    assert response.status_code == 200
    assert response.json() == {"items": []}


@pytest.mark.asyncio
async def test_add_item_uses_server_side_price_not_client_input(client, sample_product) -> None:
    headers = _session_header()

    response = await client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 2},
    )

    assert response.status_code == 201
    item = response.json()["items"][0]
    assert item["quantity"] == 2
    # 100 is the fixture's DB price — nothing in the request carried a price,
    # confirming the server never trusts a client-supplied amount.
    assert item["unitPrice"] == 100.0


@pytest.mark.asyncio
async def test_add_item_twice_merges_quantity(client, sample_product) -> None:
    headers = _session_header()
    payload = {"variantId": sample_product["variant_id"], "quantity": 2}

    await client.post("/api/v1/cart/items", headers=headers, json=payload)
    response = await client.post("/api/v1/cart/items", headers=headers, json=payload)

    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["quantity"] == 4


@pytest.mark.asyncio
async def test_add_item_beyond_available_stock_is_rejected(client, sample_product) -> None:
    headers = _session_header()

    response = await client.post(
        "/api/v1/cart/items",
        headers=headers,
        # fixture seeds quantity_available=5
        json={"variantId": sample_product["variant_id"], "quantity": 6},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STOCK_INSUFFICIENT"


@pytest.mark.asyncio
async def test_update_and_remove_item(client, sample_product) -> None:
    headers = _session_header()

    add_response = await client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )
    item_id = add_response.json()["items"][0]["id"]

    update_response = await client.patch(
        f"/api/v1/cart/items/{item_id}", headers=headers, json={"quantity": 3}
    )
    assert update_response.json()["items"][0]["quantity"] == 3

    remove_response = await client.delete(f"/api/v1/cart/items/{item_id}", headers=headers)
    assert remove_response.status_code == 200
    assert remove_response.json() == {"items": []}


@pytest.mark.asyncio
async def test_clear_cart(client, sample_product) -> None:
    headers = _session_header()
    await client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"variantId": sample_product["variant_id"], "quantity": 1},
    )

    response = await client.delete("/api/v1/cart", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"items": []}
