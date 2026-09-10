import uuid

import httpx
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


def _mock_btcpay_transport() -> httpx.MockTransport:
    """Fakes just enough of BTCPay's Greenfield API for tests: invoice
    creation, payment-methods lookup (for the on-chain address), and
    refund. A fresh invoice/refund id per call avoids collisions across
    tests sharing this same mock (Payment.provider_payment_id has no
    uniqueness requirement in the schema, so a fixed id would let an
    earlier test's payment be matched by a later test's webhook lookup).
    """

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "POST" and path.endswith("/invoices"):
            invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
            return httpx.Response(
                200,
                json={
                    "id": invoice_id,
                    "status": "New",
                    "checkoutLink": f"https://btcpay.test/i/{invoice_id}",
                },
            )
        if request.method == "GET" and path.endswith("/payment-methods"):
            # Real BTCPay 2.4.4 keys this `paymentMethodId` (see the matching
            # comment in btcpay.py). Address is regtest (`bcrt1...`) to mirror
            # the local compose.btcpay-regtest.yaml dev stack — BTCPayProvider
            # only hard-fails on that when app_env == "production".
            return httpx.Response(
                200,
                json=[{"paymentMethodId": "BTC-CHAIN", "destination": f"bcrt1qtest{uuid.uuid4().hex[:20]}"}],
            )
        if request.method == "POST" and path.endswith("/refund"):
            return httpx.Response(
                200, json={"id": f"refund_{uuid.uuid4().hex[:12]}", "status": "AwaitingPayment"}
            )
        return httpx.Response(404, json={"error": f"unhandled mock route: {request.method} {path}"})

    return httpx.MockTransport(handler)


@pytest.fixture
def btcpay_configured(monkeypatch):
    """Configures BTCPayProvider with fake-but-valid-shaped credentials and
    replaces its HTTP client with a mock transport — no real BTCPay Server
    or network access involved. Settings are cached (lru_cache), so the
    cache is cleared on both setup and teardown to avoid leaking a
    BTCPay-selecting settings object into tests that don't request this
    fixture (they'd otherwise try real network calls and hang/fail).
    """
    from app.core.config import get_settings
    from app.integrations.payments import btcpay as btcpay_module

    monkeypatch.setenv("BTCPAY_BASE_URL", "https://btcpay.test")
    monkeypatch.setenv("BTCPAY_STORE_ID", "test-store")
    monkeypatch.setenv("BTCPAY_API_KEY", "test-api-key")
    monkeypatch.setenv("BTCPAY_WEBHOOK_SECRET", "test-webhook-secret")
    get_settings.cache_clear()

    def fake_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=_mock_btcpay_transport(), base_url=self._base_url)

    monkeypatch.setattr(btcpay_module.BTCPayProvider, "_client", fake_client)

    yield

    get_settings.cache_clear()
