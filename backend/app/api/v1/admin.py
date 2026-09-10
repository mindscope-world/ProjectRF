from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import parse_uuid, require_admin
from app.core.database import get_db
from app.schemas.admin import (
    AdminAuditLogListOut,
    AdminCheckoutListOut,
    AdminComplianceDecisionIn,
    AdminComplianceReviewOut,
    AdminInventoryAdjustIn,
    AdminOrderListOut,
    AdminOrderOut,
    AdminOrderUpdateIn,
    AdminProductIn,
    AdminProductListOut,
    AdminProductOut,
    AdminProductUpdateIn,
    AdminProductVariantOut,
    AdminRefundIn,
    AdminRefundListOut,
    AdminRefundOut,
)
from app.services import admin as admin_service

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
