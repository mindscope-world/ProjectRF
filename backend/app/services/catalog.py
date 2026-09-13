from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import Category, Product, ProductRegion, ProductStatus
from app.schemas.catalog import CategoryOut, ProductBadgeOut, ProductOptionOut, ProductOut

# The frontend's Product.currency field is a display symbol ('$', '€'), not
# an ISO 4217 code — see src/components/ProductModal.tsx (`product.currency
# || '$'`). Variants/products store the ISO code; this is the boundary
# translation.
CURRENCY_SYMBOLS = {"USD": "$", "EUR": "€"}


def _currency_symbol(currency: str) -> str:
    return CURRENCY_SYMBOLS.get(currency.upper(), currency)


def _format_amount(amount: Decimal) -> str:
    if amount == amount.to_integral_value():
        return f"{int(amount):,}"
    return f"{amount:,.2f}"


def serialize_product(product: Product) -> ProductOut:
    active_variants = [v for v in product.variants if v.active]
    prices = [v.price for v in active_variants]
    currency = active_variants[0].currency if active_variants else "USD"
    symbol = _currency_symbol(currency)

    if not prices:
        price_range = ""
    elif min(prices) == max(prices):
        price_range = f"{symbol}{_format_amount(prices[0])}"
    else:
        price_range = f"{symbol}{_format_amount(min(prices))} – {symbol}{_format_amount(max(prices))}"

    primary_image = next((img for img in product.images if img.is_primary), None)
    if primary_image is not None:
        image_key = primary_image.storage_key
    elif product.images:
        image_key = product.images[0].storage_key
    else:
        image_key = ""

    return ProductOut(
        id=product.slug,
        name=product.name,
        category="bestseller" if product.is_best_seller else "other",
        categorySlug=product.category.slug if product.category else None,
        priceRange=price_range,
        rating=float(product.rating),
        ratingCount=product.rating_count,
        badges=[ProductBadgeOut(**badge) for badge in product.badges] if product.badges else None,
        hasUsaDomesticBadge=product.has_usa_domestic_badge,
        hasUkDomesticBadge=product.has_uk_domestic_badge,
        imageKey=image_key,
        options=[
            ProductOptionOut(
                variantId=str(variant.id),
                quantity=variant.quantity,
                label=variant.label,
                price=float(variant.price),
                savings=variant.savings_label,
            )
            for variant in active_variants
        ],
        description=product.description,
        currency=symbol,
    )


async def list_products(
    db: AsyncSession,
    region: ProductRegion,
    search: str | None = None,
) -> list[ProductOut]:
    stmt = (
        select(Product)
        .where(Product.region == region, Product.status == ProductStatus.active)
        .options(selectinload(Product.variants), selectinload(Product.images), selectinload(Product.category))
        .order_by(Product.created_at)
    )
    result = await db.execute(stmt)
    products = list(result.scalars().all())

    if search:
        needle = search.lower()
        products = [
            p
            for p in products
            if needle in p.name.lower() or (p.description and needle in p.description.lower())
        ]

    return [serialize_product(p) for p in products]


async def get_product_by_slug(db: AsyncSession, slug: str) -> ProductOut | None:
    stmt = (
        select(Product)
        .where(Product.slug == slug, Product.status == ProductStatus.active)
        .options(selectinload(Product.variants), selectinload(Product.images), selectinload(Product.category))
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    return serialize_product(product) if product else None


async def list_categories(db: AsyncSession) -> list[CategoryOut]:
    stmt = select(Category).where(Category.active.is_(True)).order_by(Category.name)
    result = await db.execute(stmt)
    return [CategoryOut(id=str(c.id), name=c.name, slug=c.slug) for c in result.scalars().all()]
