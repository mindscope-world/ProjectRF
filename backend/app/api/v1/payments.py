from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import parse_uuid, require_session_id
from app.core.database import get_db
from app.schemas.order import OrderWithPaymentOut
from app.schemas.payment import CapturePaymentIn
from app.services import orders as order_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/{payment_id}/capture", response_model=OrderWithPaymentOut)
async def capture_payment(
    payment_id: str,
    payload: CapturePaymentIn,
    session_id: str = Depends(require_session_id),
    db: AsyncSession = Depends(get_db),
) -> OrderWithPaymentOut:
    """Stands in for the real payment provider's webhook (Phase 7).

    In production this transition is driven by a signature-verified
    provider event, never a direct client call — this endpoint only exists
    because there's no real provider yet (see
    app/integrations/payments/fake.py).
    """
    parsed_id = parse_uuid(payment_id, "payment_id")
    return await order_service.capture_payment(db, session_id, parsed_id, payload.outcome)
