import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from sqlalchemy import delete

from app.core.database import async_session_factory
from app.main import app
from app.models.cart import CartItem
from app.models.catalog import Category, Inventory, Product, ProductImage, ProductVariant


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def sample_product():
    """An isolated product+variant+inventory row, independent of app/seed/data.py.

    Uses a random slug/SKU per run so tests don't collide with real seed data
    or with each other, and cleans up after itself.
    """
    suffix = uuid.uuid4().hex[:8]

    async with async_session_factory() as session:
        category = Category(name="Test Category", slug=f"test-category-{suffix}")
        session.add(category)
        await session.flush()

        product = Product(
            category_id=category.id,
            name="Test Product",
            slug=f"test-product-{suffix}",
            description="A product created only for automated tests.",
            region="usa",
            is_best_seller=False,
        )
        session.add(product)
        await session.flush()

        session.add(ProductImage(product_id=product.id, storage_key="test-image", is_primary=True))

        variant = ProductVariant(
            product_id=product.id,
            sku=f"TEST-{suffix}-30",
            quantity=30,
            label="30 Tablets",
            price=100,
            currency="USD",
        )
        session.add(variant)
        await session.flush()

        session.add(Inventory(variant_id=variant.id, quantity_available=5))

        await session.commit()

        product_id, variant_id, category_id = product.id, variant.id, category.id

    yield {"product_slug": product.slug, "variant_id": str(variant_id), "available": 5}

    async with async_session_factory() as session:
        # cart_items has no ondelete on its variant_id FK (a deleted/deactivated
        # variant must not silently vanish from a real customer's cart), so
        # any cart items tests created against this variant must be cleared
        # explicitly before the product/variant can be deleted. Variants and
        # images do cascade from the product FK; inventory cascades from the
        # variant.
        await session.execute(delete(CartItem).where(CartItem.variant_id == variant_id))
        db_product = await session.get(Product, product_id)
        if db_product is not None:
            await session.delete(db_product)
        db_category = await session.get(Category, category_id)
        if db_category is not None:
            await session.delete(db_category)
        await session.commit()
