from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import parse_uuid, require_admin
from app.core.database import get_db
from app.schemas.admin import (
    AdminAuditLogListOut,
    AdminCategoryIn,
    AdminCheckoutListOut,
    AdminComplianceDecisionIn,
    AdminComplianceReviewOut,
    AdminInventoryAdjustIn,
    AdminOrderListOut,
    AdminOrderOut,
    AdminOrderUpdateIn,
    AdminProductImageIn,
    AdminProductImageUpdateIn,
    AdminProductIn,
    AdminProductListOut,
    AdminProductOut,
    AdminProductUpdateIn,
    AdminProductVariantIn,
    AdminProductVariantOut,
    AdminProductVariantUpdateIn,
    AdminRefundIn,
    AdminRefundListOut,
    AdminRefundOut,
    AdminUploadOut,
)
from app.schemas.catalog import CategoryOut
from app.schemas.content import (
    AnnouncementContent,
    FooterContent,
    HeroContent,
    LogoContent,
    OfferZoneContent,
    SiteContentOut,
)
from app.services import admin as admin_service
from app.services import content as content_service
from app.services import uploads as uploads_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---- Products ----------------------------------------------------------


@router.get("/products", response_model=AdminProductListOut)
async def list_products(
    region: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminProductListOut:
    return await admin_service.list_products_admin(db, region, status, search, limit, offset)


@router.get("/products/{product_id}", response_model=AdminProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)) -> AdminProductOut:
    return await admin_service.get_product_admin(db, parse_uuid(product_id, "product_id"))


@router.post("/products", response_model=AdminProductOut, status_code=201)
async def create_product(
    payload: AdminProductIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.create_product_admin(db, actor, payload)


@router.patch("/products/{product_id}", response_model=AdminProductOut)
async def update_product(
    product_id: str,
    payload: AdminProductUpdateIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.update_product_admin(db, actor, parse_uuid(product_id, "product_id"), payload)


@router.patch("/products/variants/{variant_id}/inventory", response_model=AdminProductVariantOut)
async def adjust_inventory(
    variant_id: str,
    payload: AdminInventoryAdjustIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductVariantOut:
    return await admin_service.adjust_inventory_admin(db, actor, parse_uuid(variant_id, "variant_id"), payload)


# ---- Product variants / price range ----------------------------------------


@router.post("/products/{product_id}/variants", response_model=AdminProductOut, status_code=201)
async def create_variant(
    product_id: str,
    payload: AdminProductVariantIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.create_variant_admin(db, actor, parse_uuid(product_id, "product_id"), payload)


@router.patch("/products/{product_id}/variants/{variant_id}", response_model=AdminProductOut)
async def update_variant(
    product_id: str,
    variant_id: str,
    payload: AdminProductVariantUpdateIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.update_variant_admin(
        db, actor, parse_uuid(product_id, "product_id"), parse_uuid(variant_id, "variant_id"), payload
    )


@router.delete("/products/{product_id}/variants/{variant_id}", response_model=AdminProductOut)
async def delete_variant(
    product_id: str,
    variant_id: str,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.delete_variant_admin(
        db, actor, parse_uuid(product_id, "product_id"), parse_uuid(variant_id, "variant_id")
    )


# ---- Product images ----------------------------------------------------------


@router.post("/uploads/image", response_model=AdminUploadOut, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    actor: str = Depends(require_admin),
) -> AdminUploadOut:
    """Saves the file and hands back its URL — attach it to a product with
    POST /products/{id}/images afterwards."""
    return AdminUploadOut(url=await uploads_service.save_product_image(file))


@router.post("/products/{product_id}/images", response_model=AdminProductOut, status_code=201)
async def add_product_image(
    product_id: str,
    payload: AdminProductImageIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.add_product_image_admin(db, actor, parse_uuid(product_id, "product_id"), payload)


@router.patch("/products/{product_id}/images/{image_id}", response_model=AdminProductOut)
async def update_product_image(
    product_id: str,
    image_id: str,
    payload: AdminProductImageUpdateIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.update_product_image_admin(
        db, actor, parse_uuid(product_id, "product_id"), parse_uuid(image_id, "image_id"), payload
    )


@router.delete("/products/{product_id}/images/{image_id}", response_model=AdminProductOut)
async def delete_product_image(
    product_id: str,
    image_id: str,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProductOut:
    return await admin_service.delete_product_image_admin(
        db, actor, parse_uuid(product_id, "product_id"), parse_uuid(image_id, "image_id")
    )


# ---- Categories ---------------------------------------------------------------


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[CategoryOut]:
    return await admin_service.list_categories_admin(db)


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: AdminCategoryIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CategoryOut:
    return await admin_service.create_category_admin(db, actor, payload)


# ---- Orders --------------------------------------------------------------


@router.get("/orders", response_model=AdminOrderListOut)
async def list_orders(
    status: str | None = None,
    fulfillmentStatus: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderListOut:
    return await admin_service.list_orders_admin(db, status, fulfillmentStatus, search, limit, offset)


@router.get("/orders/{order_id}", response_model=AdminOrderOut)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)) -> AdminOrderOut:
    return await admin_service.get_order_admin(db, parse_uuid(order_id, "order_id"))


@router.patch("/orders/{order_id}", response_model=AdminOrderOut)
async def update_order(
    order_id: str,
    payload: AdminOrderUpdateIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderOut:
    return await admin_service.update_order_admin(db, actor, parse_uuid(order_id, "order_id"), payload)


# ---- Compliance queue -----------------------------------------------------


@router.get("/compliance/reviews", response_model=list[AdminComplianceReviewOut])
async def list_compliance_reviews(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[AdminComplianceReviewOut]:
    return await admin_service.list_compliance_queue_admin(db, limit, offset)


@router.post("/compliance/reviews/{order_id}/approve", response_model=AdminOrderOut)
async def approve_compliance_review(
    order_id: str,
    payload: AdminComplianceDecisionIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderOut:
    return await admin_service.approve_compliance_admin(db, actor, parse_uuid(order_id, "order_id"), payload)


@router.post("/compliance/reviews/{order_id}/reject", response_model=AdminOrderOut)
async def reject_compliance_review(
    order_id: str,
    payload: AdminComplianceDecisionIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderOut:
    return await admin_service.reject_compliance_admin(db, actor, parse_uuid(order_id, "order_id"), payload)


# ---- Refunds ---------------------------------------------------------------


@router.get("/refunds", response_model=AdminRefundListOut)
async def list_refunds(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminRefundListOut:
    return await admin_service.list_refunds_admin(db, limit, offset)


@router.post("/refunds", response_model=AdminRefundOut, status_code=201)
async def create_refund(
    payload: AdminRefundIn,
    actor: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminRefundOut:
    return await admin_service.create_refund_admin(db, actor, payload)


# ---- Checkouts (payment-attempt monitoring) --------------------------------


@router.get("/checkouts", response_model=AdminCheckoutListOut)
async def list_checkouts(
    provider: str | None = None,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminCheckoutListOut:
    return await admin_service.list_checkouts_admin(db, provider, status, limit, offset)


# ---- Audit logs -------------------------------------------------------------


@router.get("/audit-logs", response_model=AdminAuditLogListOut)
async def list_audit_logs(
    entityType: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminAuditLogListOut:
    return await admin_service.list_audit_logs_admin(db, entityType, limit, offset)


# ---- Site content (hero/footer/logo/etc.) ------------------------------------
#
# One explicit GET+PUT pair per section rather than a generic
# /site-content/{key} route: each section has its own Pydantic shape (see
# app/schemas/content.py), and FastAPI needs a concrete body model per route
# to validate and document it — a single dynamic-model route would lose that.


@router.get("/site-content", response_model=SiteContentOut)
async def get_site_content(db: AsyncSession = Depends(get_db)) -> SiteContentOut:
    return await content_service.get_all_content(db)


@router.put("/site-content/logo", response_model=LogoContent)
async def update_logo_content(
    payload: LogoContent, actor: str = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> LogoContent:
    return await content_service.set_section_admin(db, actor, "logo", payload.model_dump())


@router.put("/site-content/hero", response_model=HeroContent)
async def update_hero_content(
    payload: HeroContent, actor: str = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> HeroContent:
    return await content_service.set_section_admin(db, actor, "hero", payload.model_dump())


@router.put("/site-content/announcement", response_model=AnnouncementContent)
async def update_announcement_content(
    payload: AnnouncementContent, actor: str = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> AnnouncementContent:
    return await content_service.set_section_admin(db, actor, "announcement", payload.model_dump())


@router.put("/site-content/footer", response_model=FooterContent)
async def update_footer_content(
    payload: FooterContent, actor: str = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> FooterContent:
    return await content_service.set_section_admin(db, actor, "footer", payload.model_dump())


@router.put("/site-content/offerZone", response_model=OfferZoneContent)
async def update_offer_zone_content(
    payload: OfferZoneContent, actor: str = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> OfferZoneContent:
    return await content_service.set_section_admin(db, actor, "offerZone", payload.model_dump())
