from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SiteContent(Base):
    """One row per editable storefront content block (hero, footer, logo,
    ...) — see app/schemas/content.py for the typed shape of each `key`.

    Deliberately a single generic key/value table rather than a column per
    field: the storefront's editable copy (headlines, footer links, the
    offer-zone popup) doesn't need relational structure or querying, just a
    blob the admin panel replaces wholesale per section. A missing row for a
    given key means "use the built-in default" (see
    app/services/content.py) — nothing has to seed this table for the
    storefront to keep working exactly as it does today.
    """

    __tablename__ = "site_content"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
