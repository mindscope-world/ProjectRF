import hashlib
import hmac
import logging
from decimal import Decimal
from typing import Literal
from urllib.parse import urlsplit, urlunsplit

import httpx

from app.core.config import get_settings
from app.integrations.payments.base import (
    PaymentCaptureResult,
    PaymentProvider,
    PaymentSessionResult,
    RefundResult,
)

logger = logging.getLogger(__name__)

# Bech32 human-readable prefixes that unambiguously mean "not Bitcoin mainnet":
# `bcrt1...` is regtest, `tb1...` is testnet/signet. Mainnet SegWit is `bc1...`
# (and legacy mainnet is `1...`/`3...`). Legacy testnet prefixes (m/n/2) are
# left out on purpose — they'd false-positive against perfectly valid mainnet
# base58 addresses.
_NON_MAINNET_ADDRESS_PREFIXES = ("bcrt1", "tb1")


class BTCPayConfigurationError(RuntimeError):
    """Raised when a BTCPay call is attempted without store/API credentials
    configured, or when a configured instance is on the wrong Bitcoin network
    for the environment (e.g. a regtest instance in production, handing
    customers unspendable `bcrt1...` addresses). get_payment_provider()
    (app/services/orders.py) is supposed to keep the unconfigured case from
    happening by falling back to FakePaymentProvider — seeing that variant
    means the guard was bypassed. The wrong-network case is caught here in
    create_payment_session and means BTCPay/NBXplorer/bitcoind need to be
    reconfigured for mainnet — see docs/btcpay-mainnet-runbook.md."""


class BTCPayProvider(PaymentProvider):
    """Real crypto payment provider: BTCPay Server, self-hosted.

    BTCPay holds no customer card data and, more importantly for a merchant
    who wants to stay non-custodial, needs no private key from us either —
    its on-chain wallet is configured store-side as a watch-only wallet from
    an extended public key (XPUB) exported from an ordinary wallet app (e.g.
    BlueWallet: Wallet → ⋮ → Show Wallet XPUB). BTCPay derives receiving
    addresses and watches the chain; it can never move funds on its own.
    See backend/README.md → "BTCPay Server setup" for the exact steps.

    Settlement is webhook-driven, not client-triggered — see
    app/services/orders.py::handle_payment_webhook_event and
    app/api/v1/webhooks.py. `capture()` therefore isn't supported here;
    only FakePaymentProvider (card_link, manual) uses it.
    """

    def __init__(self) -> None:
        settings = get_settings()
        if not (settings.btcpay_base_url and settings.btcpay_store_id and settings.btcpay_api_key):
            raise BTCPayConfigurationError(
                "BTCPAY_BASE_URL, BTCPAY_STORE_ID and BTCPAY_API_KEY must all be set to use "
                "BTCPayProvider — see backend/README.md."
            )
        self._base_url = settings.btcpay_base_url.rstrip("/")
        self._public_url = (settings.btcpay_public_url or settings.btcpay_base_url).rstrip("/")
        self._store_id = settings.btcpay_store_id
        self._api_key = settings.btcpay_api_key
        self._webhook_secret = settings.btcpay_webhook_secret
        self._app_env = settings.app_env

    def _check_address_network(self, address: str) -> None:
        """Guard against a wrong-network BTCPay instance (the `bcrt1...` bug):
        a regtest/testnet store derives addresses no real wallet — Binance,
        Trust Wallet, anything — will accept. In production that must fail the
        checkout loudly rather than hand the customer a dead address; outside
        production it's just a warning, since regtest is the expected dev
        setup (compose.btcpay-regtest.yaml)."""
        if not address.lower().startswith(_NON_MAINNET_ADDRESS_PREFIXES):
            return
        message = (
            f"BTCPay returned a non-mainnet Bitcoin address ({address!r}). The BTCPay "
            "instance, NBXplorer, and bitcoind are on regtest/testnet, not mainnet — "
            "real customers cannot pay this. See docs/btcpay-mainnet-runbook.md."
        )
        if self._app_env == "production":
            raise BTCPayConfigurationError(message)
        logger.warning(message)

    def _to_public_url(self, url: str | None) -> str | None:
        """Rewrite a BTCPay-generated link's origin to the customer-facing
        one, when it differs from the origin the backend calls the API on
        (see Settings.btcpay_public_url). Keeps the path/query as-is."""
        if not url or self._public_url == self._base_url:
            return url
        generated = urlsplit(url)
        public = urlsplit(self._public_url)
        return urlunsplit((public.scheme, public.netloc, generated.path, generated.query, generated.fragment))

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._base_url,
            headers={"Authorization": f"token {self._api_key}"},
            timeout=15.0,
        )

    async def create_payment_session(
        self, order_id: str, amount: Decimal, currency: str, idempotency_key: str
    ) -> PaymentSessionResult:
        # Greenfield API: POST /api/v1/stores/{storeId}/invoices.
        # https://docs.btcpayserver.org/API/Greenfield/v1/#tag/Invoices/paths/~1api~1v1~1stores~1{storeId}~1invoices/post
        async with self._client() as client:
            response = await client.post(
                f"/api/v1/stores/{self._store_id}/invoices",
                json={
                    "amount": str(amount),
                    "currency": currency,
                    "metadata": {"orderId": order_id},
                },
                headers={"Idempotency-Key": idempotency_key},
            )
            response.raise_for_status()
            body = response.json()
            invoice_id = body["id"]

            # The on-chain address isn't in the invoice-creation response —
            # it's derived per payment method and fetched separately. Needed
            # for a card->BTC on-ramp widget (Ramp Network) to know where to
            # send the BTC it buys; a direct BTC payer never needs this,
            # they just follow checkout_url. Best-effort: if this call or
            # the expected shape fails, we still return the invoice with no
            # address rather than failing checkout. Confirmed against a live
            # BTCPay 2.4.4 instance: the field is `paymentMethodId` (e.g.
            # "BTC-CHAIN"), not `paymentMethod`/`cryptoCode` as originally
            # guessed — that mismatch silently left cryptoAddress null for
            # every card_link/ramp checkout.
            crypto_address = None
            try:
                pm_response = await client.get(
                    f"/api/v1/stores/{self._store_id}/invoices/{invoice_id}/payment-methods"
                )
                pm_response.raise_for_status()
                for method in pm_response.json():
                    if method.get("paymentMethodId") in ("BTC", "BTC-CHAIN"):
                        crypto_address = method.get("destination") or method.get("address")
                        break
            except (httpx.HTTPError, KeyError, ValueError):
                pass

        # Fail closed on a wrong-network instance before returning an address
        # (or a checkout link to one) that no real wallet will accept. Only
        # runs when the address lookup above actually succeeded — a null
        # address can't be network-checked, and the runbook's manual
        # verification step is the backstop for that case.
        if crypto_address:
            self._check_address_network(crypto_address)

        return PaymentSessionResult(
            provider_payment_id=invoice_id,
            status=body.get("status", "New"),
            checkout_url=self._to_public_url(body.get("checkoutLink")),
            crypto_address=crypto_address,
        )

    async def capture(
        self, provider_payment_id: str, outcome: Literal["succeed", "fail"]
    ) -> PaymentCaptureResult:
        raise NotImplementedError(
            "BTCPayProvider settles via webhook only (InvoiceProcessing/InvoiceReceivedPayment "
            "or InvoiceExpired/InvoiceInvalid) — see handle_payment_webhook_event. There is no "
            "client-triggered capture for crypto payments."
        )

    async def refund(
        self, provider_payment_id: str, amount: Decimal, reason: str | None = None
    ) -> RefundResult:
        # Greenfield API: POST /api/v1/stores/{storeId}/invoices/{invoiceId}/refund.
        # Creates a BTCPay "pull payment" the customer claims to their wallet
        # rather than an instant push — there is no way to push funds without
        # the store operator approving/paying out the pull payment (by design:
        # BTCPay holds no key that could do this automatically). The exact
        # request body has varied across BTCPay Server versions — verify
        # against the deployed instance's Swagger UI (/swagger) before relying
        # on this in production; this targets the documented v1 shape.
        # https://docs.btcpayserver.org/API/Greenfield/v1/#tag/Invoices/paths/~1api~1v1~1stores~1{storeId}~1invoices~1{invoiceId}~1refund/post
        async with self._client() as client:
            response = await client.post(
                f"/api/v1/stores/{self._store_id}/invoices/{provider_payment_id}/refund",
                json={
                    "refundVariant": "Custom",
                    "customAmount": str(amount),
                    "customCurrency": "USD",
                    "description": reason or "Order refund",
                },
            )
            response.raise_for_status()
            body = response.json()

        return RefundResult(provider_refund_id=body["id"], status=body.get("status", "AwaitingPayment"))

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        # BTCPay signs webhook bodies as `BTCPay-Sig: sha256=<hex hmac>`
        # using the per-webhook secret configured when the webhook was
        # registered in the BTCPay store settings.
        # https://docs.btcpayserver.org/Development/Webhooks/
        if not signature.startswith("sha256="):
            return False
        expected = hmac.new(self._webhook_secret.encode(), payload, hashlib.sha256).hexdigest()
        provided = signature[len("sha256=") :]
        return hmac.compare_digest(expected, provided)
