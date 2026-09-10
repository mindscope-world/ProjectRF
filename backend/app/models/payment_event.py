import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PaymentEvent(Base):
    """Raw webhook deliveries, kept for audit and — crucially — for
    idempotency: `provider_event_id` is UNIQUE, so a duplicate delivery of
    the same event (providers retry on anything but a clean 2xx) fails to
    insert and is treated as already-processed rather than reprocessed.
    See app/services/orders.py::handle_payment_webhook_event.
    """

    __tablename__ = "payment_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    # Nullable: a webhook might arrive referencing a provider_payment_id we
    # don't recognize (e.g. a delivery for a different store); still worth
    # recording, just unlinked.
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True
    )
    provider_event_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
