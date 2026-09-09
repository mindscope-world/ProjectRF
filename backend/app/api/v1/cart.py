from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import parse_uuid, require_session_id
from app.core.database import get_db
from app.schemas.cart import AddCartItemIn, CartOut, UpdateCartItemIn
from app.services import cart as cart_service

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartOut)
async def get_cart(
    session_id: str = Depends(require_session_id), db: AsyncSession = Depends(get_db)
) -> CartOut:
    return CartOut(items=await cart_service.get_cart_items(db, session_id))


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
async def add_cart_item(
    payload: AddCartItemIn,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> CartOut:
    variant_id = parse_uuid(payload.variantId, "variantId")
    items = await cart_service.add_item(db, session_id, variant_id, payload.quantity)
    return CartOut(items=items)


@router.patch("/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: str,
    payload: UpdateCartItemIn,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> CartOut:
    parsed_id = parse_uuid(item_id, "item_id")
    items = await cart_service.update_item_quantity(db, session_id, parsed_id, payload.quantity)
    return CartOut(items=items)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_cart_item(
    item_id: str,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> CartOut:
    parsed_id = parse_uuid(item_id, "item_id")
    items = await cart_service.remove_item(db, session_id, parsed_id)
    return CartOut(items=items)


@router.delete("", response_model=CartOut)
async def clear_cart(
    session_id: str = Depends(require_session_id), db: AsyncSession = Depends(get_db)
) -> CartOut:
    return CartOut(items=await cart_service.clear_cart(db, session_id))
