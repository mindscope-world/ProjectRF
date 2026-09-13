from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import parse_uuid, require_session_id
from app.core.database import get_db
from app.schemas.order import OrderWithPaymentOut
from app.schemas.payment import CapturePaymentIn, RefundIn, RefundOut
from app.services import orders as order_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/{payment_id}/capture", response_model=OrderWithPaymentOut)
async def capture_payment(
    payment_id: str,
    payload: CapturePaymentIn,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> OrderWithPaymentOut:
    """Manual capture for the fake/manual (card_link, unconfigured) provider only.

    Real crypto payments (provider="blockonomics") settle via
    GET /webhooks/payments/blockonomics instead — this endpoint rejects
    those with 400 PROVIDER_SETTLES_VIA_WEBHOOK.
    """
    parsed_id = parse_uuid(payment_id, "payment_id")
    return await order_service.capture_payment(db, session_id, parsed_id, payload.outcome)


@router.post("/{payment_id}/refund", response_model=RefundOut, status_code=status.HTTP_201_CREATED)
async def refund_payment(
    payment_id: str,
    payload: RefundIn,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> RefundOut:
    parsed_id = parse_uuid(payment_id, "payment_id")
    amount = Decimal(str(payload.amount))
    return await order_service.refund_payment(db, session_id, parsed_id, amount, payload.reason)
