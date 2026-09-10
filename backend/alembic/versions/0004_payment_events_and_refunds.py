"""payment_events, refunds, and payment_status 'expired'

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-10

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Postgres allows adding an enum value inside a transaction (PG12+) as
    # long as the new value isn't also *used* in that same transaction —
    # it isn't here, so this is safe as part of this migration.
    op.execute("ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'expired'")

    op.add_column("payments", sa.Column("checkout_url", sa.String(), nullable=True))
    op.add_column("payments", sa.Column("crypto_address", sa.String(), nullable=True))

    op.create_table(
        "payment_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("signature_valid", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("processed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_event_id"),
    )

    op.create_table(
        "refunds",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("provider_refund_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("amount > 0", name="ck_refunds_amount_positive"),
    )


def downgrade() -> None:
    op.drop_table("refunds")
    op.drop_table("payment_events")
    op.drop_column("payments", "crypto_address")
    op.drop_column("payments", "checkout_url")
    # Postgres has no ALTER TYPE ... DROP VALUE — removing 'expired' would
    # require rebuilding the enum type. Not implemented for a downgrade path
    # this unlikely to be needed; any 'expired' rows would need remapping
    # (e.g. to 'failed') before a manual rebuild if this is ever required.
