import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.payment import Payment


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_refund_id: Mapped[str | None] = mapped_column(String, nullable=True)
    # Free-text status straight from the provider (e.g. "succeeded",
    # "AwaitingPayment" for a BTCPay pull payment awaiting customer claim) —
    # not an enum, since providers use very different vocabularies here and
    # this is a passthrough/audit field, not something our own state machine
    # branches on.
    status: Mapped[str] = mapped_column(String, nullable=False)

    # No `created_by` yet — no `users` table until Phase 2 (Auth).
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint("amount > 0", name="ck_refunds_amount_positive"),)

    payment: Mapped["Payment"] = relationship(back_populates="refunds")
