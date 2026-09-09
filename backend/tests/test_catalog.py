import pytest


@pytest.mark.asyncio
async def test_categories_list_returns_seeded_shape(client) -> None:
    response = await client.get("/api/v1/categories")

    assert response.status_code == 200
    categories = response.json()
    assert isinstance(categories, list)
    for category in categories:
        assert {"id", "name", "slug"} <= category.keys()


@pytest.mark.asyncio
async def test_products_list_includes_fixture_product(client, sample_product) -> None:
    response = await client.get("/api/v1/products", params={"region": "usa"})

    assert response.status_code == 200
    products = response.json()
    match = next((p for p in products if p["id"] == sample_product["product_slug"]), None)

    assert match is not None
    assert match["priceRange"] == "$100"
    assert match["options"][0]["variantId"] == sample_product["variant_id"]
    assert match["currency"] == "$"


@pytest.mark.asyncio
async def test_product_detail_by_slug(client, sample_product) -> None:
    response = await client.get(f"/api/v1/products/{sample_product['product_slug']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == sample_product["product_slug"]
    assert body["options"][0]["price"] == 100.0


@pytest.mark.asyncio
async def test_product_detail_unknown_slug_is_404(client) -> None:
    response = await client.get("/api/v1/products/does-not-exist")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_eu_region_excludes_usa_products(client, sample_product) -> None:
    response = await client.get("/api/v1/products", params={"region": "eu"})

    assert response.status_code == 200
    products = response.json()
    assert all(p["id"] != sample_product["product_slug"] for p in products)
