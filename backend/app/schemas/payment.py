from typing import Literal

from pydantic import BaseModel


class CapturePaymentIn(BaseModel):
    # Caller-supplied outcome stands in for a real provider's webhook
    # (Phase 7) — see app/integrations/payments/fake.py.
    outcome: Literal["succeed", "fail"] = "succeed"
