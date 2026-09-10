import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.integrations.payments.btcpay import BTCPayProvider
from app.services import orders as order_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/payments/btcpay", status_code=status.HTTP_200_OK)
async def btcpay_webhook(
    request: Request,
    btcpay_sig: str | None = Header(default=None, alias="BTCPay-Sig"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Real webhook endpoint for BTCPay Server invoice events.

    Signature verification happens on the *raw* request body — this is why
    the payload isn't a Pydantic model parameter: FastAPI would parse (and
    re-serialize on any access) JSON before we could verify the exact bytes
    BTCPay signed. See app/integrations/payments/btcpay.py::verify_webhook.

    Event -> outcome mapping and the idempotency guarantee both live in
    app/services/orders.py::handle_payment_webhook_event — this endpoint
    only authenticates the request and hands off the parsed event.
    """
    raw_body = await request.body()

    if not btcpay_sig:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing BTCPay-Sig header")

    provider = BTCPayProvider()
    if not provider.verify_webhook(raw_body, btcpay_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body") from None

    event_type = payload.get("type")
    invoice_id = payload.get("invoiceId")
    # BTCPay includes a per-delivery id header on retries of the *same*
    # logical event; falling back to invoiceId+type only covers the (much
    # more common) case of one delivery per event, not BTCPay's own retry
    # semantics — deliveryId is the correct dedup key when present.
    delivery_id = payload.get("deliveryId") or f"{invoice_id}:{event_type}:{payload.get('timestamp')}"

    if not event_type or not delivery_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed webhook payload")

    await order_service.handle_payment_webhook_event(
        db,
        provider_event_id=delivery_id,
        provider_payment_id=invoice_id,
        event_type=event_type,
        payload=payload,
    )

    return {"received": True}
