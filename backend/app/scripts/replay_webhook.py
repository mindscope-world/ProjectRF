"""Phase 11 hardening: webhook replay testing.

Re-delivers a previously received BTCPay webhook event (by provider_event_id,
or the most recent one if omitted) to this app's own webhook endpoint, to
verify redelivery is handled safely:

  - a *duplicate* delivery of an event already processed must be a no-op
    (payment/order state doesn't change again, no second audit trail entry)
  - the endpoint still requires a valid signature — this script signs with
    the same BTCPAY_WEBHOOK_SECRET the app is configured with, since that's
    the only way to produce a signature the endpoint will accept

This does not (and cannot) verify BTCPay's own retry behavior — only that
*this app* is idempotent when the same delivery arrives twice, which is the
actual risk webhook replay testing is for (see app/services/orders.py::
handle_payment_webhook_event and payment_events' unique provider_event_id
constraint).

Run with:

    docker compose exec api python -m app.scripts.replay_webhook
    docker compose exec api python -m app.scripts.replay_webhook --provider-event-id <id>
"""

import argparse
import asyncio
import hashlib
import hmac
import json

import httpx
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.models.payment_event import PaymentEvent


async def _load_event(provider_event_id: str | None) -> PaymentEvent | None:
    async with async_session_factory() as session:
        stmt = select(PaymentEvent).order_by(PaymentEvent.received_at.desc())
        if provider_event_id:
            stmt = select(PaymentEvent).where(PaymentEvent.provider_event_id == provider_event_id)
        return (await session.execute(stmt)).scalars().first()


async def _count_events(provider_event_id: str) -> int:
    async with async_session_factory() as session:
        stmt = select(PaymentEvent).where(PaymentEvent.provider_event_id == provider_event_id)
        return len((await session.execute(stmt)).scalars().all())


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--provider-event-id", default=None, help="Replay this specific event (default: most recent)")
    parser.add_argument(
        "--url", default="http://localhost:8000/api/v1/webhooks/payments/btcpay", help="Webhook endpoint URL"
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.btcpay_webhook_secret:
        raise SystemExit("BTCPAY_WEBHOOK_SECRET is not configured — nothing to sign the replay with.")

    event = await _load_event(args.provider_event_id)
    if event is None:
        raise SystemExit("No payment_events row found to replay. Run a real checkout first (see backend/README.md).")

    body = json.dumps(event.payload).encode()
    signature = "sha256=" + hmac.new(settings.btcpay_webhook_secret.encode(), body, hashlib.sha256).hexdigest()

    before = await _count_events(event.provider_event_id)
    print(f"Replaying provider_event_id={event.provider_event_id!r} (event_type={event.event_type!r})")
    print(f"Rows for this provider_event_id before replay: {before}")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            args.url, content=body, headers={"Content-Type": "application/json", "BTCPay-Sig": signature}
        )

    print(f"Replay response: {response.status_code} {response.text}")

    after = await _count_events(event.provider_event_id)
    print(f"Rows for this provider_event_id after replay: {after}")

    if response.status_code != 200:
        raise SystemExit("FAIL: replay was not accepted (bad signature or malformed payload).")
    if after != before:
        raise SystemExit(
            f"FAIL: replay created a duplicate payment_events row ({before} -> {after}) — "
            "the unique provider_event_id constraint should have made this a no-op."
        )
    print("PASS: replay was accepted and did not create a duplicate event row.")


if __name__ == "__main__":
    asyncio.run(main())
