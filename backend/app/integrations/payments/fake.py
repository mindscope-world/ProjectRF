import uuid
from decimal import Decimal
from typing import Literal

from app.integrations.payments.base import (
    PaymentCaptureResult,
    PaymentProvider,
    PaymentSessionResult,
    RefundResult,
)


class FakePaymentProvider(PaymentProvider):
    """Phase 5 stand-in for a real PCI-compliant provider (Phase 7).

    Never touches real money. `create_payment_session` mimics a real
    provider handing back a session id that isn't captured yet; `capture`
    mimics the provider's webhook later confirming it — except here the
    caller supplies the outcome directly (`app/api/v1/payments.py`) instead
    of a signed webhook payload, so both the success AND failure paths of
    the order lifecycle are exercisable without a payment gateway.
    """

    async def create_payment_session(
        self, order_id: str, amount: Decimal, currency: str, idempotency_key: str
    ) -> PaymentSessionResult:
        return PaymentSessionResult(
            provider_payment_id=f"fake_{uuid.uuid4().hex}", status="requires_capture"
        )

    async def capture(
        self, provider_payment_id: str, outcome: Literal["succeed", "fail"]
    ) -> PaymentCaptureResult:
        return PaymentCaptureResult(
            provider_payment_id=provider_payment_id,
            status="captured" if outcome == "succeed" else "failed",
        )

    async def refund(
        self, provider_payment_id: str, amount: Decimal, reason: str | None = None
    ) -> RefundResult:
        # card_link payments are collected manually (Apple Pay/Zelle/cash app/
        # a payment link) — there's no gateway to call, so this just records
        # that a human needs to action the refund out-of-band.
        return RefundResult(provider_refund_id=f"fake_refund_{uuid.uuid4().hex}", status="succeeded")

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        # The fake provider never sends webhooks — capture() is called
        # directly instead — so this is never exercised in practice.
        return True
