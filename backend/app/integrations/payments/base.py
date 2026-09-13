from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal


@dataclass
class PaymentSessionResult:
    provider_payment_id: str
    status: str
    # Where the customer completes payment (a hosted checkout page). None for
    # providers with no separate checkout page (e.g. the fake provider).
    checkout_url: str | None = None
    # The raw on-chain receive address (Blockonomics derives this from the
    # store's connected watch-only wallet). Shown directly to the customer
    # when there's no checkout_url, and also usable to open a card->BTC
    # on-ramp widget (Ramp Network) pointed at the same address instead —
    # see backend/README.md's "Card-to-Bitcoin via Ramp Network" section.
    crypto_address: str | None = None


@dataclass
class PaymentCaptureResult:
    provider_payment_id: str
    status: Literal["captured", "failed"]


@dataclass
class RefundResult:
    provider_refund_id: str
    status: str


class PaymentProvider(ABC):
    """Interface every payment provider (fake or real) implements.

    OrderService/PaymentService only ever talk to this interface, never to
    a concrete provider — see workplan.md section 33. `capture()` is for
    providers with a synchronous, client-triggered confirmation (the fake
    provider); a webhook-driven provider (BlockonomicsProvider) settles via
    app/services/orders.py::handle_payment_webhook_event instead and treats
    `capture()` as unsupported — see blockonomics.py.
    """

    @abstractmethod
    async def create_payment_session(
        self, order_id: str, amount: Decimal, currency: str, idempotency_key: str
    ) -> PaymentSessionResult: ...

    @abstractmethod
    async def capture(
        self, provider_payment_id: str, outcome: Literal["succeed", "fail"]
    ) -> PaymentCaptureResult: ...

    @abstractmethod
    async def refund(self, provider_payment_id: str, amount: Decimal, reason: str | None = None) -> RefundResult: ...

    @abstractmethod
    def verify_webhook(self, payload: bytes, signature: str) -> bool: ...
