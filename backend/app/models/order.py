import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.payment import Payment


class OrderStatus(str, enum.Enum):
    pending = "pending"
    awaiting_payment = "awaiting_payment"
    payment_received = "payment_received"
    compliance_review = "compliance_review"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class ComplianceStatus(str, enum.Enum):
    not_required = "not_required"
    pending = "pending"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"


class FulfillmentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    packed = "packed"
    shipped = "shipped"
    delivered = "delivered"
    returned = "returned"
    cancelled = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    # No FK yet — `users` doesn't exist until Phase 2 (Auth). Guest orders
    # are identified by session_id, same pattern as carts (app/models/cart.py).
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    customer_email: Mapped[str] = mapped_column(String, nullable=False)

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", create_type=False),
        nullable=False,
        default=OrderStatus.pending,
        server_default=OrderStatus.pending.value,
    )
    # No compliance workflow exists yet (Phase 6) — every seeded product has
    # requires_prescription=False, so this column stays at its default and
    # every order skips straight past compliance_review. Kept here now so
    # Phase 6 doesn't need another migration to add it.
    compliance_status: Mapped[ComplianceStatus] = mapped_column(
        Enum(ComplianceStatus, name="compliance_status", create_type=False),
        nullable=False,
        default=ComplianceStatus.not_required,
        server_default=ComplianceStatus.not_required.value,
    )
    fulfillment_status: Mapped[FulfillmentStatus] = mapped_column(
        Enum(FulfillmentStatus, name="fulfillment_status", create_type=False),
        nullable=False,
        default=FulfillmentStatus.pending,
        server_default=FulfillmentStatus.pending.value,
    )

    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    shipping_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0, server_default="0"
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Snapshotted at checkout time — see OrderItem for the same reasoning
    # applied to product name/sku/price.
    shipping_address: Mapped[dict] = mapped_column(JSONB, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Minimal viable fulfillment tracking — Phase 9 (a full shipments
    # subsystem: carriers, rate shopping, label purchase) was never built,
    # but the Phase 10 admin panel still needs somewhere to record "this
    # shipped, here's the tracking number" without waiting on that.
    tracking_number: Mapped[str | None] = mapped_column(String, nullable=True)
    carrier: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    # SET NULL (not CASCADE/RESTRICT): order history must survive a variant
    # being removed from the catalog later. product_name/sku/unit_price below
    # are already snapshotted, so losing this link loses nothing customers see.
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True
    )

    product_name: Mapped[str] = mapped_column(String, nullable=False)
    sku: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),)

    order: Mapped["Order"] = relationship(back_populates="items")
