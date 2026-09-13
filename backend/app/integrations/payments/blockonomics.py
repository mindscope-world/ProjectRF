import hmac
import logging
from decimal import Decimal
from typing import Literal

import httpx

from app.core.config import get_settings
from app.integrations.payments.base import (
    PaymentCaptureResult,
    PaymentProvider,
    PaymentSessionResult,
    RefundResult,
)

logger = logging.getLogger(__name__)


class BlockonomicsError(RuntimeError):
    """A Blockonomics API call failed (non-2xx, or the instance was
    unreachable). Raised instead of letting a raw httpx error propagate as
    an uncaught 500 — main.py maps this to a 502 with a usable message, so
    the storefront shows "payment provider rejected this" rather than an
    opaque browser NetworkError (a 500 raised above the CORS middleware
    carries no Access-Control-Allow-Origin header)."""


class BlockonomicsConfigurationError(RuntimeError):
    """Raised when a Blockonomics call is attempted without an API key
    configured. get_payment_provider() (app/services/orders.py) is supposed
    to keep this from happening by falling back to FakePaymentProvider —
    seeing this means that guard was bypassed."""


class BlockonomicsProvider(PaymentProvider):
    """Real crypto payment provider: Blockonomics.

    Unlike BTCPay (self-hosted, invoice-based) or a hosted-checkout gateway,
    Blockonomics has no per-order invoice and no checkout page of its own:
    POST /new_address just hands back a fresh receive address derived from
    your connected xpub wallet — Blockonomics only watches the chain, it
    never holds funds. There is nothing to redirect the customer to, so
    `checkout_url` is always None here; the storefront shows the address
    directly instead (see CheckoutPage.tsx's `manualCryptoPayment` view,
    which already existed for the no-widget-configured card_link fallback
    and is reused for every "crypto" payment under this provider — see
    `_checkout_mode` in app/services/orders.py).

    Settlement is callback-driven, not client-triggered — see
    app/services/orders.py::handle_payment_webhook_event and
    app/api/v1/webhooks.py::blockonomics_webhook. `capture()` therefore
    isn't supported here; only FakePaymentProvider (card_link, manual) uses
    it.

    Known limitation: a bare address has no fixed expected amount the way a
    BTCPay/crypt.pe invoice does, and the callback's `value` is the amount
    of *that one transaction*, not a running balance — so under/over-payment
    and split payments aren't reconciled here. Every callback for a known
    address is treated as "this order is paid" (matching the previous
    BTCPay integration's own "fulfill on first sight of payment" policy —
    see handle_payment_webhook_event). The raw `value` is still recorded on
    the payment_events row for manual reconciliation if that's ever needed.
    """

    _BASE_URL = "https://www.blockonomics.co/api"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.blockonomics_api_key:
            raise BlockonomicsConfigurationError(
                "BLOCKONOMICS_API_KEY must be set to use BlockonomicsProvider — see backend/README.md."
            )
        self._api_key = settings.blockonomics_api_key
        self._callback_secret = settings.blockonomics_callback_secret

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._BASE_URL,
            headers={"Authorization": f"Bearer {self._api_key}"},
            timeout=15.0,
        )

    async def create_payment_session(
        self, order_id: str, amount: Decimal, currency: str, idempotency_key: str
    ) -> PaymentSessionResult:
        # https://developers.blockonomics.co/docs/merchants
        async with self._client() as client:
            try:
                response = await client.post("/new_address", params={"crypto": "BTC"})
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text[:500]
                logger.warning(
                    "Blockonomics new_address failed (%s) for order %s: %s",
                    exc.response.status_code, order_id, detail,
                )
                raise BlockonomicsError(
                    f"Blockonomics rejected the address request (HTTP {exc.response.status_code})."
                ) from exc
            except httpx.RequestError as exc:
                logger.warning("Blockonomics unreachable creating address for order %s: %r", order_id, exc)
                raise BlockonomicsError("Could not reach Blockonomics.") from exc
            address = response.json()["address"]

        return PaymentSessionResult(
            provider_payment_id=address,
            status="pending",
            checkout_url=None,
            crypto_address=address,
        )

    async def capture(
        self, provider_payment_id: str, outcome: Literal["succeed", "fail"]
    ) -> PaymentCaptureResult:
        raise NotImplementedError(
            "BlockonomicsProvider settles via the /webhooks/payments/blockonomics callback only — "
            "see handle_payment_webhook_event. There is no client-triggered capture for crypto payments."
        )

    async def refund(
        self, provider_payment_id: str, amount: Decimal, reason: str | None = None
    ) -> RefundResult:
        # Blockonomics is non-custodial and exposes no refund API — funds
        # land directly in the merchant's own wallet the moment they're
        # sent, the same as BTCPay's pull-payment refund ultimately required
        # a human to action, except here there isn't even an API call to
        # kick that off. This just records that a human needs to send the
        # refund manually from the connected wallet.
        return RefundResult(provider_refund_id="manual", status="requires_manual_action")

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        # Blockonomics callbacks carry no HMAC — authenticity rests entirely
        # on a shared secret you configure once on the store's callback URL
        # in the Blockonomics dashboard and again here (see
        # BLOCKONOMICS_CALLBACK_SECRET). `payload` is unused; the caller
        # passes the callback's `secret` query param as `signature`.
        # https://developers.blockonomics.co/docs/guides/callbacks
        if not self._callback_secret:
            return False
        return hmac.compare_digest(signature, self._callback_secret)
