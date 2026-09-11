from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import SiteContent
from app.schemas.content import (
    AnnouncementContent,
    FooterContent,
    HeroContent,
    LogoContent,
    OfferZoneContent,
    SiteContentOut,
)
from app.services.admin import record_audit

# Maps each public key to the Pydantic model that defines its shape and
# defaults. A section with no row yet just returns `model()` — its defaults.
_SECTION_MODELS = {
    "logo": LogoContent,
    "hero": HeroContent,
    "announcement": AnnouncementContent,
    "footer": FooterContent,
    "offerZone": OfferZoneContent,
}


async def _get_section(db: AsyncSession, key: str, model: type):
    row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
    return model(**row.value) if row is not None else model()


async def get_all_content(db: AsyncSession) -> SiteContentOut:
    return SiteContentOut(
        **{key: await _get_section(db, key, model) for key, model in _SECTION_MODELS.items()}
    )


async def get_section_admin(db: AsyncSession, key: str):
    return await _get_section(db, key, _SECTION_MODELS[key])


async def set_section_admin(db: AsyncSession, actor: str, key: str, value: dict):
    """Upserts a whole section. No partial/PATCH semantics — the admin form
    for a section always submits its complete (validated) shape, so there's
    no risk of a partial update leaving old and new fields mixed."""
    row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
    if row is None:
        row = SiteContent(key=key, value=value)
        db.add(row)
    else:
        row.value = value

    await record_audit(db, actor, "content.update", "site_content", key, None)
    await db.commit()
    return _SECTION_MODELS[key](**value)
