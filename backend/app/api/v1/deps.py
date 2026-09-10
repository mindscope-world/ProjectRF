import hmac
import uuid

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def require_session_id(x_session_id: str | None = Header(default=None, alias="X-Session-Id")) -> str:
    """Guest identity until Phase 2 (Auth) adds logged-in users.

    The frontend generates this UUID client-side (localStorage) and sends it
    on every cart/checkout/order request — see src/api/client.ts. Shared by
    cart.py, checkout.py, orders.py and payments.py.
    """
    if not x_session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="X-Session-Id header is required"
        )
    return x_session_id


def require_admin(x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> str:
    """Phase 10 admin gate: a single shared secret, not real RBAC.

    Fails closed if ADMIN_API_KEY isn't configured — an empty/unset secret
    must never be treated as "no auth required". Returns the token's value
    so callers can pass it through to audit-log entries without importing
    settings themselves; there's no per-admin identity to log, only that
    *an* admin acted (see app/services/admin.py::record_audit).
    """
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin panel is not configured (ADMIN_API_KEY unset).",
        )
    if not x_admin_token or not hmac.compare_digest(x_admin_token, settings.admin_api_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
    return "admin"


def parse_uuid(value: str, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {field}"
        ) from None
