from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    database_url: str = "postgresql+asyncpg://rapidfinil:rapidfinil_dev_password@postgres:5432/rapidfinil"
    redis_url: str = "redis://redis:6379/0"

    # Matches any localhost port so the Vite dev server's auto-picked port
    # (3000, 3001, 3002, ...) always works without reconfiguring this.
    cors_allow_origin_regex: str = r"^http://localhost:\d+$"

    # BTCPay Server — the real crypto payment provider for Phase 7/8 (see
    # app/integrations/payments/btcpay.py and backend/README.md's "BTCPay
    # Server setup" section). Left blank by default: with no store/API key
    # configured, get_payment_provider() falls back to FakePaymentProvider
    # for the crypto payment method too, so local dev and CI don't need a
    # live BTCPay instance. Point btcpay_base_url at a testnet store first;
    # for the mainnet cutover see docs/btcpay-mainnet-runbook.md. When
    # app_env == "production", BTCPayProvider hard-fails a checkout if the
    # instance is still on regtest/testnet (a bcrt1.../tb1... address).
    btcpay_base_url: str = ""
    btcpay_store_id: str = ""
    btcpay_api_key: str = ""
    btcpay_webhook_secret: str = ""

    # The customer-facing origin for BTCPay checkout links, when it differs
    # from btcpay_base_url — e.g. in local/regtest dev, the backend reaches
    # BTCPay over the Docker network at http://btcpayserver:49392 (a
    # hostname the customer's browser can't resolve), while the browser
    # needs the host-mapped http://localhost:23000 instead. In a real
    # deployment where BTCPay's public URL and the URL the backend calls are
    # the same, leave this blank and btcpay_base_url is used for both.
    btcpay_public_url: str = ""

    # Phase 10 admin panel: a single shared-secret gate on /admin/* rather
    # than full user accounts/RBAC (Phase 2 auth was never built — see
    # backend/README.md). Every request to /admin/* must carry this value in
    # the X-Admin-Token header. Left blank by default so a misconfigured
    # deployment fails closed (see require_admin in app/api/v1/deps.py)
    # instead of silently exposing the panel.
    admin_api_key: str = ""

    # Where admin-uploaded product photos are written on disk. Served back
    # out at /uploads/* (see app/main.py's StaticFiles mount) so a product's
    # imageKey/storage_key can be a real URL the storefront can <img src=>
    # directly, instead of a key the frontend bundle has to know about ahead
    # of time — see app/services/uploads.py.
    uploads_dir: str = "uploads"


@lru_cache
def get_settings() -> Settings:
    return Settings()
