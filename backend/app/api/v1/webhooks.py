from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.integrations.payments.blockonomics import BlockonomicsProvider
from app.services import orders as order_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("/payments/blockonomics", status_code=status.HTTP_200_OK)
async def blockonomics_webhook(
    secret: str = Query(...),
    addr: str = Query(...),
    txid: str = Query(...),
    status_param: int = Query(..., alias="status"),
    value: int = Query(...),
    crypto: str = Query(default="BTC"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Real callback endpoint for Blockonomics payment notifications.

    Blockonomics delivers this as a plain GET request with no request body
    and no HMAC-signed header (unlike BTCPay) — authenticity rests entirely
    on the shared `secret` query param, configured once on the store's
    callback URL in the Blockonomics dashboard and compared against
    BLOCKONOMICS_CALLBACK_SECRET here. See
    app/integrations/payments/blockonomics.py::verify_webhook.

    Fires once per unique (txid, status, addr) combination as a payment
    progresses: status 0 (seen, unconfirmed) -> 1 -> 2+ (final) — see
    https://developers.blockonomics.co/docs/guides/callbacks. Every
    delivery is treated as "this order is paid" (see
    handle_payment_webhook_event's `payment.received` branch), matching how
    the previous BTCPay integration fulfilled on first sight of payment
    rather than waiting for confirmations.
    """
    provider = BlockonomicsProvider()
    if not provider.verify_webhook(b"", secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid callback secret")

    await order_service.handle_payment_webhook_event(
        db,
        provider_event_id=f"{txid}:{status_param}:{addr}",
        provider_payment_id=addr,
        event_type="payment.received",
        payload={"addr": addr, "txid": txid, "status": status_param, "value": value, "crypto": crypto},
    )

    return {"received": True}
