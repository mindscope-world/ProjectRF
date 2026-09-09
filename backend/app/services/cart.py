import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cart import Cart, CartItem
from app.models.catalog import Product, ProductVariant
from app.schemas.cart import CartItemOut
from app.services.catalog import CURRENCY_SYMBOLS


async def get_or_create_cart(db: AsyncSession, session_id: str) -> Cart:
    stmt = select(Cart).where(Cart.session_id == session_id)
    cart = (await db.execute(stmt)).scalar_one_or_none()
    if cart is not None:
        return cart

    cart = Cart(session_id=session_id)
    db.add(cart)
    await db.commit()
    await db.refresh(cart)
    return cart


async def _get_variant_with_inventory(db: AsyncSession, variant_id: uuid.UUID) -> ProductVariant:
    stmt = (
        select(ProductVariant)
        .where(ProductVariant.id == variant_id, ProductVariant.active.is_(True))
        .options(selectinload(ProductVariant.inventory))
    )
    variant = (await db.execute(stmt)).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product variant not found")
    return variant


def _check_stock(variant: ProductVariant, requested_quantity: int) -> None:
    available = variant.inventory.quantity_available if variant.inventory else 0
    if requested_quantity > available:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "STOCK_INSUFFICIENT",
                "message": f"Only {available} unit(s) available for this pack size.",
            },
        )


def _serialize_item(item: CartItem) -> CartItemOut:
    variant = item.variant
    product = variant.product
    symbol = CURRENCY_SYMBOLS.get(variant.currency.upper(), variant.currency)
    primary_image = next((img for img in product.images if img.is_primary), None)
    image_key = primary_image.storage_key if primary_image else (
        product.images[0].storage_key if product.images else ""
    )

    return CartItemOut(
        id=str(item.id),
        productId=product.slug,
        name=product.name,
        imageKey=image_key,
        quantity=item.quantity,
        packLabel=variant.label,
        unitPrice=float(variant.price),
        currency=symbol,
    )


async def get_cart_items(db: AsyncSession, session_id: str) -> list[CartItemOut]:
    cart = await get_or_create_cart(db, session_id)
    stmt = (
        select(CartItem)
        .where(CartItem.cart_id == cart.id)
        .options(
            selectinload(CartItem.variant).selectinload(ProductVariant.product).selectinload(Product.images)
        )
        .order_by(CartItem.created_at)
    )
    items = (await db.execute(stmt)).scalars().all()
    return [_serialize_item(item) for item in items]


async def add_item(
    db: AsyncSession, session_id: str, variant_id: uuid.UUID, quantity: int
) -> list[CartItemOut]:
    cart = await get_or_create_cart(db, session_id)
    variant = await _get_variant_with_inventory(db, variant_id)

    stmt = select(CartItem).where(CartItem.cart_id == cart.id, CartItem.variant_id == variant.id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    new_quantity = quantity + (existing.quantity if existing else 0)

    _check_stock(variant, new_quantity)

    if existing:
        existing.quantity = new_quantity
    else:
        db.add(CartItem(cart_id=cart.id, variant_id=variant.id, quantity=new_quantity))

    await db.commit()
    return await get_cart_items(db, session_id)


async def update_item_quantity(
    db: AsyncSession, session_id: str, item_id: uuid.UUID, quantity: int
) -> list[CartItemOut]:
    cart = await get_or_create_cart(db, session_id)
    stmt = (
        select(CartItem)
        .where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        .options(selectinload(CartItem.variant).selectinload(ProductVariant.inventory))
    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    _check_stock(item.variant, quantity)
    item.quantity = quantity
    await db.commit()
    return await get_cart_items(db, session_id)


async def remove_item(db: AsyncSession, session_id: str, item_id: uuid.UUID) -> list[CartItemOut]:
    cart = await get_or_create_cart(db, session_id)
    stmt = select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    await db.delete(item)
    await db.commit()
    return await get_cart_items(db, session_id)


async def clear_cart(db: AsyncSession, session_id: str) -> list[CartItemOut]:
    cart = await get_or_create_cart(db, session_id)
    stmt = select(CartItem).where(CartItem.cart_id == cart.id)
    items = (await db.execute(stmt)).scalars().all()
    for item in items:
        await db.delete(item)
    await db.commit()
    return []
