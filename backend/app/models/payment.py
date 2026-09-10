import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.refund import Refund


class PaymentStatus(str, enum.Enum):
    created = "created"
    pending = "pending"
    requires_action = "requires_action"
    authorized = "authorized"
    captured = "captured"
    failed = "failed"
    cancelled = "cancelled"
    refunded = "refunded"
    partially_refunded = "partially_refunded"
    # A crypto invoice that timed out unpaid — distinct from `failed` (a
    # declined/invalid attempt) because nothing was actually rejected, it
    # just wasn't completed in time. Added in migration 0004.
    expired = "expired"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)

    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_payment_id: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)
    # Provider-hosted checkout page (BTCPay). Persisted, not just returned
    # once, so an idempotent checkout replay (customer reloads before paying)
    # can still hand back the same link instead of a dead end.
    checkout_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # On-chain address BTCPay derived for this invoice — needed by a
    # card->BTC on-ramp widget (Ramp Network). Same persistence reasoning as
    # checkout_url above.
    crypto_address: Mapped[str | None] = mapped_column(String, nullable=True)

    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", create_type=False),
        nullable=False,
        default=PaymentStatus.created,
        server_default=PaymentStatus.created.value,
    )
    # Client-supplied (Idempotency-Key header) when checkout is retried after
    # an ambiguous failure (e.g. a frozen UI + 3 clicks on "Pay") — see
    # workplan.md section 39. Falls back to a server-generated key if absent.
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),)

    order: Mapped["Order"] = relationship(back_populates="payments")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="payment")
