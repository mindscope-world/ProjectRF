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

    # Blockonomics — the real crypto payment provider (see
    # app/integrations/payments/blockonomics.py). Left blank by default:
    # with no API key configured, get_payment_provider() falls back to
    # FakePaymentProvider for the crypto payment method too, so local dev
    # and CI don't need a live Blockonomics account.
    #
    # blockonomics_api_key: Bearer token from Merchants → API on the
    # Blockonomics dashboard.
    #
    # blockonomics_callback_secret: a secret you choose yourself and paste
    # into BOTH places — here, and the "Secret" field on the Blockonomics
    # store's callback URL config (Stores → your store → callback URL:
    # https://<this-backend>/api/v1/webhooks/payments/blockonomics). It's
    # sent back on every callback as the `secret` query param so we can
    # verify the request actually came from Blockonomics before trusting it
    # — see BlockonomicsProvider.verify_webhook.
    blockonomics_api_key: str = ""
    blockonomics_callback_secret: str = ""

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
