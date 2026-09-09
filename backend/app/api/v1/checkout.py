import uuid

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_session_id
from app.core.database import get_db
from app.schemas.checkout import CheckoutValidationOut, CreateOrderIn
from app.schemas.order import OrderWithPaymentOut
from app.services import orders as order_service

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.post("/validate", response_model=CheckoutValidationOut)
async def validate_checkout(
    session_id: str = Depends(require_session_id), db: AsyncSession = Depends(get_db)
) -> CheckoutValidationOut:
    issues = await order_service.validate_cart_for_checkout(db, session_id)
    return CheckoutValidationOut(valid=not issues, issues=issues)


@router.post("/create-order", response_model=OrderWithPaymentOut, status_code=201)
async def create_order(
    payload: CreateOrderIn,
    session_id: str = Depends(require_session_id),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
) -> OrderWithPaymentOut:
    # Falls back to a server-generated key when the client doesn't send one —
    # still functional, just without the double-submit protection a real
    # client-supplied key gives (see workplan.md section 39).
    key = idempotency_key or f"order-{uuid.uuid4().hex}"
    return await order_service.create_order_from_cart(
        db,
        session_id,
        payload.shippingAddress,
        payload.email,
        key,
        payment_method=payload.paymentMethod,
        refund_address=payload.refundAddress,
        order_notes=payload.orderNotes,
    )
