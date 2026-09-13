from typing import Literal

from pydantic import BaseModel, Field


class CapturePaymentIn(BaseModel):
    # Caller-supplied outcome stands in for a real provider's webhook
    # (Phase 7) — see app/integrations/payments/fake.py. Only valid for
    # provider="fake" payments; Blockonomics payments settle via webhook
    # only.
    outcome: Literal["succeed", "fail"] = "succeed"


class RefundIn(BaseModel):
    amount: float = Field(gt=0)
    reason: str | None = None


class RefundOut(BaseModel):
    id: str
    paymentId: str
    amount: float
    reason: str | None
    providerRefundId: str | None
    status: str
