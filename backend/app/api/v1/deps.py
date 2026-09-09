import uuid

from fastapi import Header, HTTPException, status


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


def parse_uuid(value: str, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {field}"
        ) from None
