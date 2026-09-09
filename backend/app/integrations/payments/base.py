from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal


@dataclass
class PaymentSessionResult:
    provider_payment_id: str
    status: str


@dataclass
class PaymentCaptureResult:
    provider_payment_id: str
    status: Literal["captured", "failed"]


class PaymentProvider(ABC):
    """Interface every payment provider (fake or real) implements.

    OrderService/PaymentService only ever talk to this interface, never to
    a concrete provider — see workplan.md section 33. Swapping in a real
    PCI-compliant provider in Phase 7 means adding a new subclass here, not
    touching checkout/order logic.
    """

    @abstractmethod
    async def create_payment_session(
        self, order_id: str, amount: Decimal, currency: str, idempotency_key: str
    ) -> PaymentSessionResult: ...

    @abstractmethod
    async def capture(
        self, provider_payment_id: str, outcome: Literal["succeed", "fail"]
    ) -> PaymentCaptureResult: ...
