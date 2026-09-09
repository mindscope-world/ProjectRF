import uuid
from decimal import Decimal
from typing import Literal

from app.integrations.payments.base import PaymentCaptureResult, PaymentProvider, PaymentSessionResult


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
