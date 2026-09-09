from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import parse_uuid, require_session_id
from app.core.database import get_db
from app.schemas.order import OrderOut
from app.services import orders as order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderOut])
async def list_orders(
    session_id: str = Depends(require_session_id), db: AsyncSession = Depends(get_db)
) -> list[OrderOut]:
    return await order_service.list_orders(db, session_id)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> OrderOut:
    parsed_id = parse_uuid(order_id, "order_id")
    return await order_service.get_order(db, session_id, parsed_id)


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: str,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> OrderOut:
    parsed_id = parse_uuid(order_id, "order_id")
    return await order_service.cancel_order(db, session_id, parsed_id)
