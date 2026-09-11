from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.catalog import ProductRegion
from app.schemas.catalog import CategoryOut, ProductOut
from app.schemas.content import SiteContentOut
from app.services import catalog as catalog_service
from app.services import content as content_service

router = APIRouter(tags=["catalog"])


@router.get("/site-content", response_model=SiteContentOut)
async def get_site_content(db: AsyncSession = Depends(get_db)) -> SiteContentOut:
    """Admin-editable storefront copy (hero, footer, logo, ...) — see
    app/schemas/content.py. Public and unauthenticated: it's the same copy
    every visitor sees, not per-user data."""
    return await content_service.get_all_content(db)


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[CategoryOut]:
    return await catalog_service.list_categories(db)


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    region: ProductRegion = Query(default=ProductRegion.usa),
    q: str | None = Query(default=None, description="Free-text search over name/description"),
    db: AsyncSession = Depends(get_db),
) -> list[ProductOut]:
    return await catalog_service.list_products(db, region=region, search=q)


@router.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> ProductOut:
    product = await catalog_service.get_product_by_slug(db, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product
