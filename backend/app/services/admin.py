import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditLog
from app.models.catalog import (
    Category,
    Inventory,
    Product,
    ProductImage,
    ProductRegion,
    ProductStatus,
    ProductVariant,
)
from app.models.order import ComplianceStatus, FulfillmentStatus, Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.refund import Refund
from app.schemas.admin import (
    AdminAuditLogListOut,
    AdminAuditLogOut,
    AdminCategoryIn,
    AdminCheckoutListOut,
    AdminCheckoutOut,
    AdminComplianceDecisionIn,
    AdminComplianceReviewOut,
    AdminInventoryAdjustIn,
    AdminOrderItemOut,
    AdminOrderListOut,
    AdminOrderOut,
    AdminOrderUpdateIn,
    AdminPageMeta,
    AdminPaymentSummaryOut,
    AdminProductImageIn,
    AdminProductImageOut,
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
)
from app.schemas.catalog import CategoryOut
from app.services.orders import _checkout_mode, _execute_refund


async def record_audit(
    db: AsyncSession,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: dict | None = None,
) -> None:
    """Adds the row but doesn't commit — call sites add this to the same
    transaction as the mutation it's logging, so an audit entry can never
    exist for a write that didn't actually happen (or vice versa)."""
    db.add(
        AuditLog(actor=actor, action=action, entity_type=entity_type, entity_id=entity_id, details=details)
    )


# ---- Products ----------------------------------------------------------


def _serialize_admin_product(product: Product) -> AdminProductOut:
    return AdminProductOut(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        description=product.description,
        categorySlug=product.category.slug if product.category else "",
        region=product.region.value,
        status=product.status.value,
        isBestSeller=product.is_best_seller,
        hasUsaDomesticBadge=product.has_usa_domestic_badge,
        hasUkDomesticBadge=product.has_uk_domestic_badge,
        requiresPrescription=product.requires_prescription,
        controlledProduct=product.controlled_product,
        imageKey=next((img.storage_key for img in product.images if img.is_primary), None)
        or (product.images[0].storage_key if product.images else ""),
        images=[
            AdminProductImageOut(
                id=str(img.id),
                url=img.storage_key,
                altText=img.alt_text,
                sortOrder=img.sort_order,
                isPrimary=img.is_primary,
            )
            for img in sorted(product.images, key=lambda i: i.sort_order)
        ],
        variants=[
            AdminProductVariantOut(
                id=str(v.id),
                sku=v.sku,
                quantity=v.quantity,
                label=v.label,
                price=float(v.price),
                currency=v.currency,
                savingsLabel=v.savings_label,
                active=v.active,
                quantityAvailable=v.inventory.quantity_available if v.inventory else 0,
                quantityReserved=v.inventory.quantity_reserved if v.inventory else 0,
            )
            for v in product.variants
        ],
        createdAt=product.created_at,
        updatedAt=product.updated_at,
    )


def _product_load_options():
    return (
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(ProductVariant.inventory),
    )


async def list_products_admin(
    db: AsyncSession,
    region: str | None,
    prod_status: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> AdminProductListOut:
    stmt = select(Product).options(*_product_load_options())
    if region:
        stmt = stmt.where(Product.region == ProductRegion(region))
    if prod_status:
        stmt = stmt.where(Product.status == ProductStatus(prod_status))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Product.created_at.desc())
    products = list((await db.execute(stmt)).scalars().unique().all())

    if search:
        needle = search.lower()
        products = [p for p in products if needle in p.name.lower() or needle in p.slug.lower()]
        total = len(products)

    page = products[offset : offset + limit]
    return AdminProductListOut(
        items=[_serialize_admin_product(p) for p in page],
        meta=AdminPageMeta(total=total, limit=limit, offset=offset),
    )


async def _get_product_or_404(db: AsyncSession, product_id: uuid.UUID) -> Product:
    # populate_existing=True: several call sites (create_variant_admin,
    # add_product_image_admin, ...) load a product, add a *sibling* row to
    # one of its collections elsewhere in the same request, then re-fetch it
    # here to serialize the fresh state. Without this, the session's
    # expire_on_commit=False (app/core/database.py) means the identity-mapped
    # Product instance keeps returning its already-loaded (now stale)
    # `.variants`/`.images` collection instead of picking up the new row.
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(*_product_load_options())
        .execution_options(populate_existing=True)
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def get_product_admin(db: AsyncSession, product_id: uuid.UUID) -> AdminProductOut:
    return _serialize_admin_product(await _get_product_or_404(db, product_id))


async def _get_category_or_400(db: AsyncSession, slug: str) -> Category:
    category = (await db.execute(select(Category).where(Category.slug == slug))).scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown category slug '{slug}'"
        )
    return category


async def create_product_admin(db: AsyncSession, actor: str, payload: AdminProductIn) -> AdminProductOut:
    existing = (await db.execute(select(Product).where(Product.slug == payload.slug))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A product with this slug already exists")

    category = await _get_category_or_400(db, payload.categorySlug)

    product = Product(
        category_id=category.id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        region=ProductRegion(payload.region),
        status=ProductStatus(payload.status),
        is_best_seller=payload.isBestSeller,
        has_usa_domestic_badge=payload.hasUsaDomesticBadge,
        has_uk_domestic_badge=payload.hasUkDomesticBadge,
        requires_prescription=payload.requiresPrescription,
        controlled_product=payload.controlledProduct,
    )
    db.add(product)
    await db.flush()

    if payload.imageKey:
        db.add(ProductImage(product_id=product.id, storage_key=payload.imageKey, is_primary=True))

    for variant_in in payload.variants:
        variant = ProductVariant(
            product_id=product.id,
            sku=f"{payload.slug.upper()}-{variant_in.quantity}",
            quantity=variant_in.quantity,
            label=variant_in.label,
            price=variant_in.price,
            currency=variant_in.currency,
            savings_label=variant_in.savingsLabel,
        )
        db.add(variant)
        await db.flush()
        db.add(Inventory(variant_id=variant.id, quantity_available=variant_in.quantityAvailable))

    await record_audit(
        db, actor, "product.create", "product", str(product.id), {"name": product.name, "slug": product.slug}
    )
    await db.commit()

    return await get_product_admin(db, product.id)


async def update_product_admin(
    db: AsyncSession, actor: str, product_id: uuid.UUID, payload: AdminProductUpdateIn
) -> AdminProductOut:
    product = await _get_product_or_404(db, product_id)
    changes = payload.model_dump(exclude_unset=True)

    if "categorySlug" in changes:
        category = await _get_category_or_400(db, changes.pop("categorySlug"))
        product.category_id = category.id
    if "name" in changes:
        product.name = changes["name"]
    if "description" in changes:
        product.description = changes["description"]
    if "status" in changes:
        product.status = ProductStatus(changes["status"])
    if "isBestSeller" in changes:
        product.is_best_seller = changes["isBestSeller"]
    if "hasUsaDomesticBadge" in changes:
        product.has_usa_domestic_badge = changes["hasUsaDomesticBadge"]
    if "hasUkDomesticBadge" in changes:
        product.has_uk_domestic_badge = changes["hasUkDomesticBadge"]
    if "requiresPrescription" in changes:
        product.requires_prescription = changes["requiresPrescription"]
    if "controlledProduct" in changes:
        product.controlled_product = changes["controlledProduct"]
    if "imageKey" in changes:
        primary = next((img for img in product.images if img.is_primary), None)
        if primary is not None:
            primary.storage_key = changes["imageKey"]
        else:
            db.add(ProductImage(product_id=product.id, storage_key=changes["imageKey"], is_primary=True))

    await record_audit(db, actor, "product.update", "product", str(product.id), changes)
    await db.commit()
    return await get_product_admin(db, product_id)


async def adjust_inventory_admin(
    db: AsyncSession, actor: str, variant_id: uuid.UUID, payload: AdminInventoryAdjustIn
) -> AdminProductVariantOut:
    stmt = select(ProductVariant).where(ProductVariant.id == variant_id).options(
        selectinload(ProductVariant.inventory)
    )
    variant = (await db.execute(stmt)).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    previous = variant.inventory.quantity_available if variant.inventory else None
    if variant.inventory is None:
        variant.inventory = Inventory(variant_id=variant.id, quantity_available=payload.quantityAvailable)
        db.add(variant.inventory)
    else:
        variant.inventory.quantity_available = payload.quantityAvailable

    await record_audit(
        db,
        actor,
        "inventory.adjust",
        "product_variant",
        str(variant_id),
        {"previous": previous, "new": payload.quantityAvailable, "reason": payload.reason},
    )
    await db.commit()
    await db.refresh(variant, attribute_names=["inventory"])

    return AdminProductVariantOut(
        id=str(variant.id),
        sku=variant.sku,
        quantity=variant.quantity,
        label=variant.label,
        price=float(variant.price),
        currency=variant.currency,
        savingsLabel=variant.savings_label,
        active=variant.active,
        quantityAvailable=variant.inventory.quantity_available,
        quantityReserved=variant.inventory.quantity_reserved,
    )


def _unique_sku(product_slug: str, quantity: int, existing_skus: set[str]) -> str:
    """product-slug-QUANTITY, matching create_product_admin's convention —
    with a numeric suffix if that collides with a sibling variant already on
    the product (two tiers with the same pack size, e.g. two different
    label/price combos at quantity=30)."""
    base = f"{product_slug.upper()}-{quantity}"
    if base not in existing_skus:
        return base
    n = 2
    while f"{base}-{n}" in existing_skus:
        n += 1
    return f"{base}-{n}"


async def create_variant_admin(
    db: AsyncSession, actor: str, product_id: uuid.UUID, payload: AdminProductVariantIn
) -> AdminProductOut:
    """Adds a new pack-size/price tier to a product's price range."""
    product = await _get_product_or_404(db, product_id)

    variant = ProductVariant(
        product_id=product.id,
        sku=_unique_sku(product.slug, payload.quantity, {v.sku for v in product.variants}),
        quantity=payload.quantity,
        label=payload.label,
        price=payload.price,
        currency=payload.currency,
        savings_label=payload.savingsLabel,
    )
    db.add(variant)
    await db.flush()
    db.add(Inventory(variant_id=variant.id, quantity_available=payload.quantityAvailable))

    await record_audit(
        db,
        actor,
        "variant.create",
        "product_variant",
        str(variant.id),
        {"productId": str(product.id), "label": payload.label, "price": str(payload.price)},
    )
    await db.commit()
    return await get_product_admin(db, product_id)


async def _get_product_variant_or_404(
    db: AsyncSession, product_id: uuid.UUID, variant_id: uuid.UUID
) -> ProductVariant:
    stmt = (
        select(ProductVariant)
        .where(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .options(selectinload(ProductVariant.inventory))
    )
    variant = (await db.execute(stmt)).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    return variant


async def update_variant_admin(
    db: AsyncSession,
    actor: str,
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    payload: AdminProductVariantUpdateIn,
) -> AdminProductOut:
    """Edits an existing tier's price/label/pack size/currency, or flips
    `active` to pull it from the storefront's price range without deleting
    order history that references it."""
    variant = await _get_product_variant_or_404(db, product_id, variant_id)
    changes = payload.model_dump(exclude_unset=True)

    if "label" in changes:
        variant.label = changes["label"]
    if "price" in changes:
        variant.price = changes["price"]
    if "currency" in changes:
        variant.currency = changes["currency"]
    if "savingsLabel" in changes:
        variant.savings_label = changes["savingsLabel"]
    if "quantity" in changes:
        variant.quantity = changes["quantity"]
    if "active" in changes:
        variant.active = changes["active"]

    # JSONB can't serialize Decimal directly (see create_refund_admin's audit
    # call for the same fix) — stringify it for the audit trail.
    if "price" in changes:
        changes["price"] = str(changes["price"])
    await record_audit(db, actor, "variant.update", "product_variant", str(variant_id), changes)
    await db.commit()
    return await get_product_admin(db, product_id)


async def delete_variant_admin(
    db: AsyncSession, actor: str, product_id: uuid.UUID, variant_id: uuid.UUID
) -> AdminProductOut:
    """Hard-deletes a tier. Existing order line items keep pointing at it
    (product_variants.id is ON DELETE SET NULL from order_items — see
    app/models/order.py), so this is safe for tiers that already shipped
    orders; it's still refused on a product's last remaining tier so a
    product can never end up with an empty price range by accident (use
    `active: false` via PATCH for that instead)."""
    variant = await _get_product_variant_or_404(db, product_id, variant_id)

    sibling_count_stmt = select(func.count()).select_from(ProductVariant).where(
        ProductVariant.product_id == product_id
    )
    sibling_count = (await db.execute(sibling_count_stmt)).scalar_one()
    if sibling_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can't delete a product's only price tier — deactivate it or delete the product instead.",
        )

    await db.delete(variant)
    await record_audit(db, actor, "variant.delete", "product_variant", str(variant_id), None)
    await db.commit()
    return await get_product_admin(db, product_id)


# ---- Product images -------------------------------------------------------


async def add_product_image_admin(
    db: AsyncSession, actor: str, product_id: uuid.UUID, payload: AdminProductImageIn
) -> AdminProductOut:
    product = await _get_product_or_404(db, product_id)

    make_primary = payload.isPrimary or not product.images
    if make_primary:
        for img in product.images:
            img.is_primary = False

    next_sort_order = max((img.sort_order for img in product.images), default=-1) + 1
    db.add(
        ProductImage(
            product_id=product.id,
            storage_key=payload.url,
            alt_text=payload.altText,
            sort_order=next_sort_order,
            is_primary=make_primary,
        )
    )

    await record_audit(db, actor, "product.image.add", "product", str(product.id), {"url": payload.url})
    await db.commit()
    return await get_product_admin(db, product_id)


async def _get_product_image_or_404(
    db: AsyncSession, product_id: uuid.UUID, image_id: uuid.UUID
) -> ProductImage:
    stmt = select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    image = (await db.execute(stmt)).scalar_one_or_none()
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return image


async def update_product_image_admin(
    db: AsyncSession,
    actor: str,
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    payload: AdminProductImageUpdateIn,
) -> AdminProductOut:
    image = await _get_product_image_or_404(db, product_id, image_id)
    changes = payload.model_dump(exclude_unset=True)

    if "altText" in changes:
        image.alt_text = changes["altText"]
    if "sortOrder" in changes:
        image.sort_order = changes["sortOrder"]
    if changes.get("isPrimary"):
        # Only one primary image per product — demote the rest.
        product = await _get_product_or_404(db, product_id)
        for other in product.images:
            other.is_primary = other.id == image.id
    elif "isPrimary" in changes:
        image.is_primary = False

    await record_audit(db, actor, "product.image.update", "product_image", str(image_id), changes)
    await db.commit()
    return await get_product_admin(db, product_id)


async def delete_product_image_admin(
    db: AsyncSession, actor: str, product_id: uuid.UUID, image_id: uuid.UUID
) -> AdminProductOut:
    product = await _get_product_or_404(db, product_id)
    image = next((img for img in product.images if str(img.id) == str(image_id)), None)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    was_primary = image.is_primary
    await db.delete(image)
    await db.flush()

    if was_primary:
        # Promote the next-lowest-sort-order image so the product doesn't
        # silently go imageless on the storefront after a delete.
        remaining = sorted((img for img in product.images if img.id != image.id), key=lambda i: i.sort_order)
        if remaining:
            remaining[0].is_primary = True

    await record_audit(db, actor, "product.image.delete", "product_image", str(image_id), None)
    await db.commit()
    return await get_product_admin(db, product_id)


# ---- Categories -------------------------------------------------------------


async def list_categories_admin(db: AsyncSession) -> list[CategoryOut]:
    """Unlike the storefront's list_categories, this doesn't filter to
    active-only — an admin editing a product needs to see every category
    that might already be assigned to something."""
    stmt = select(Category).order_by(Category.name)
    result = await db.execute(stmt)
    return [CategoryOut(id=str(c.id), name=c.name, slug=c.slug) for c in result.scalars().all()]


async def create_category_admin(db: AsyncSession, actor: str, payload: AdminCategoryIn) -> CategoryOut:
    existing = (await db.execute(select(Category).where(Category.slug == payload.slug))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A category with this slug already exists")

    category = Category(name=payload.name, slug=payload.slug, description=payload.description)
    db.add(category)
    await db.flush()

    await record_audit(db, actor, "category.create", "category", str(category.id), {"name": payload.name})
    await db.commit()
    return CategoryOut(id=str(category.id), name=category.name, slug=category.slug)


# ---- Orders --------------------------------------------------------------


def _order_load_options():
    return (selectinload(Order.items), selectinload(Order.payments))


def _serialize_admin_order(order: Order) -> AdminOrderOut:
    return AdminOrderOut(
        id=str(order.id),
        orderNumber=order.order_number,
        customerEmail=order.customer_email,
        sessionId=order.session_id,
        status=order.status.value,
        complianceStatus=order.compliance_status.value,
        fulfillmentStatus=order.fulfillment_status.value,
        currency=order.currency,
        subtotal=float(order.subtotal),
        shippingAmount=float(order.shipping_amount),
        taxAmount=float(order.tax_amount),
        discountAmount=float(order.discount_amount),
        totalAmount=float(order.total_amount),
        shippingAddress=order.shipping_address,
        notes=order.notes,
        trackingNumber=order.tracking_number,
        carrier=order.carrier,
        items=[
            AdminOrderItemOut(
                id=str(item.id),
                productName=item.product_name,
                sku=item.sku,
                quantity=item.quantity,
                unitPrice=float(item.unit_price),
                subtotal=float(item.subtotal),
            )
            for item in order.items
        ],
        payments=[
            AdminPaymentSummaryOut(
                id=str(p.id),
                provider=p.provider,
                paymentMethod=p.payment_method,
                status=p.status.value,
                amount=float(p.amount),
                currency=p.currency,
                checkoutUrl=p.checkout_url,
                cryptoAddress=p.crypto_address,
                createdAt=p.created_at,
            )
            for p in order.payments
        ],
        createdAt=order.created_at,
        updatedAt=order.updated_at,
    )


async def list_orders_admin(
    db: AsyncSession,
    order_status: str | None,
    fulfillment_status: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> AdminOrderListOut:
    stmt = select(Order).options(*_order_load_options())
    if order_status:
        stmt = stmt.where(Order.status == OrderStatus(order_status))
    if fulfillment_status:
        stmt = stmt.where(Order.fulfillment_status == FulfillmentStatus(fulfillment_status))
    if search:
        needle = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(Order.order_number).like(needle) | func.lower(Order.customer_email).like(needle)
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Order.created_at.desc()).limit(limit).offset(offset)
    orders = (await db.execute(stmt)).scalars().unique().all()

    return AdminOrderListOut(
        items=[_serialize_admin_order(o) for o in orders],
        meta=AdminPageMeta(total=total, limit=limit, offset=offset),
    )


async def _get_order_or_404(db: AsyncSession, order_id: uuid.UUID) -> Order:
    stmt = select(Order).where(Order.id == order_id).options(*_order_load_options())
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


async def get_order_admin(db: AsyncSession, order_id: uuid.UUID) -> AdminOrderOut:
    return _serialize_admin_order(await _get_order_or_404(db, order_id))


# Fulfillment statuses that also advance the coarser order.status, since the
# storefront/customer-facing order view reads status, not fulfillment_status
# (see src/components/CartPage.tsx). Anything not listed here only touches
# fulfillment_status.
_FULFILLMENT_TO_ORDER_STATUS = {
    FulfillmentStatus.shipped: OrderStatus.shipped,
    FulfillmentStatus.delivered: OrderStatus.delivered,
}


async def update_order_admin(
    db: AsyncSession, actor: str, order_id: uuid.UUID, payload: AdminOrderUpdateIn
) -> AdminOrderOut:
    order = await _get_order_or_404(db, order_id)
    changes = payload.model_dump(exclude_unset=True)

    if "fulfillmentStatus" in changes:
        new_fulfillment = FulfillmentStatus(changes["fulfillmentStatus"])
        order.fulfillment_status = new_fulfillment
        if new_fulfillment in _FULFILLMENT_TO_ORDER_STATUS:
            order.status = _FULFILLMENT_TO_ORDER_STATUS[new_fulfillment]
    if "trackingNumber" in changes:
        order.tracking_number = changes["trackingNumber"]
    if "carrier" in changes:
        order.carrier = changes["carrier"]
    if "notes" in changes:
        order.notes = changes["notes"]

    await record_audit(db, actor, "order.update", "order", str(order.id), changes)
    await db.commit()
    return await get_order_admin(db, order_id)


# ---- Compliance queue -----------------------------------------------------


async def list_compliance_queue_admin(
    db: AsyncSession, limit: int, offset: int
) -> list[AdminComplianceReviewOut]:
    stmt = (
        select(Order)
        .where(Order.compliance_status.in_([ComplianceStatus.pending, ComplianceStatus.under_review]))
        .options(selectinload(Order.items))
        .order_by(Order.created_at)
        .limit(limit)
        .offset(offset)
    )
    orders = (await db.execute(stmt)).scalars().unique().all()
    return [
        AdminComplianceReviewOut(
            orderId=str(o.id),
            orderNumber=o.order_number,
            customerEmail=o.customer_email,
            complianceStatus=o.compliance_status.value,
            totalAmount=float(o.total_amount),
            currency=o.currency,
            items=[
                AdminOrderItemOut(
                    id=str(item.id),
                    productName=item.product_name,
                    sku=item.sku,
                    quantity=item.quantity,
                    unitPrice=float(item.unit_price),
                    subtotal=float(item.subtotal),
                )
                for item in o.items
            ],
            createdAt=o.created_at,
        )
        for o in orders
    ]


async def approve_compliance_admin(
    db: AsyncSession, actor: str, order_id: uuid.UUID, payload: AdminComplianceDecisionIn
) -> AdminOrderOut:
    order = await _get_order_or_404(db, order_id)
    order.compliance_status = ComplianceStatus.approved
    if order.status == OrderStatus.compliance_review:
        order.status = OrderStatus.processing

    await record_audit(
        db, actor, "compliance.approve", "order", str(order.id), {"reason": payload.reason}
    )
    await db.commit()
    return await get_order_admin(db, order_id)


async def reject_compliance_admin(
    db: AsyncSession, actor: str, order_id: uuid.UUID, payload: AdminComplianceDecisionIn
) -> AdminOrderOut:
    order = await _get_order_or_404(db, order_id)
    order.compliance_status = ComplianceStatus.rejected
    # A rejected compliance review means the order cannot be fulfilled as
    # placed — there's no partial-fulfillment concept here, so the whole
    # order is cancelled rather than left in limbo. Refunding any captured
    # payment is a separate, deliberate action via the refunds endpoint.
    order.status = OrderStatus.cancelled

    await record_audit(
        db, actor, "compliance.reject", "order", str(order.id), {"reason": payload.reason}
    )
    await db.commit()
    return await get_order_admin(db, order_id)


# ---- Refunds ---------------------------------------------------------------


async def list_refunds_admin(db: AsyncSession, limit: int, offset: int) -> AdminRefundListOut:
    stmt = (
        select(Refund)
        .options(selectinload(Refund.payment).selectinload(Payment.order))
        .order_by(Refund.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.limit(limit).offset(offset)
    refunds = (await db.execute(stmt)).scalars().unique().all()

    return AdminRefundListOut(
        items=[
            AdminRefundOut(
                id=str(r.id),
                paymentId=str(r.payment_id),
                orderId=str(r.payment.order.id),
                orderNumber=r.payment.order.order_number,
                amount=float(r.amount),
                reason=r.reason,
                providerRefundId=r.provider_refund_id,
                status=r.status,
                createdAt=r.created_at,
            )
            for r in refunds
        ],
        meta=AdminPageMeta(total=total, limit=limit, offset=offset),
    )


async def create_refund_admin(db: AsyncSession, actor: str, payload: AdminRefundIn) -> AdminRefundOut:
    try:
        payment_uuid = uuid.UUID(payload.paymentId)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid paymentId") from None

    stmt = (
        select(Payment)
        .where(Payment.id == payment_uuid)
        .options(selectinload(Payment.order), selectinload(Payment.refunds))
    )
    payment = (await db.execute(stmt)).scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    refund = await _execute_refund(db, payment, payload.amount, payload.reason)

    await record_audit(
        db,
        actor,
        "refund.create",
        "payment",
        str(payment.id),
        {"amount": str(payload.amount), "reason": payload.reason},
    )
    await db.commit()
    await db.refresh(refund)

    return AdminRefundOut(
        id=str(refund.id),
        paymentId=str(payment.id),
        orderId=str(payment.order.id),
        orderNumber=payment.order.order_number,
        amount=float(refund.amount),
        reason=refund.reason,
        providerRefundId=refund.provider_refund_id,
        status=refund.status,
        createdAt=refund.created_at,
    )


# ---- Checkouts (payment-attempt monitoring) --------------------------------


async def list_checkouts_admin(
    db: AsyncSession, provider: str | None, payment_status: str | None, limit: int, offset: int
) -> AdminCheckoutListOut:
    stmt = select(Payment).options(selectinload(Payment.order)).order_by(Payment.created_at.desc())
    if provider:
        stmt = stmt.where(Payment.provider == provider)
    if payment_status:
        stmt = stmt.where(Payment.status == PaymentStatus(payment_status))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.limit(limit).offset(offset)
    payments = (await db.execute(stmt)).scalars().unique().all()

    return AdminCheckoutListOut(
        items=[
            AdminCheckoutOut(
                paymentId=str(p.id),
                orderId=str(p.order.id),
                orderNumber=p.order.order_number,
                customerEmail=p.order.customer_email,
                provider=p.provider,
                paymentMethod=p.payment_method,
                checkoutMode=_checkout_mode(p.provider, p.payment_method),
                status=p.status.value,
                amount=float(p.amount),
                currency=p.currency,
                createdAt=p.created_at,
                updatedAt=p.updated_at,
            )
            for p in payments
        ],
        meta=AdminPageMeta(total=total, limit=limit, offset=offset),
    )


# ---- Audit logs -------------------------------------------------------------


async def list_audit_logs_admin(
    db: AsyncSession, entity_type: str | None, limit: int, offset: int
) -> AdminAuditLogListOut:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.limit(limit).offset(offset)
    logs = (await db.execute(stmt)).scalars().all()

    return AdminAuditLogListOut(
        items=[
            AdminAuditLogOut(
                id=str(log.id),
                actor=log.actor,
                action=log.action,
                entityType=log.entity_type,
                entityId=log.entity_id,
                details=log.details,
                createdAt=log.created_at,
            )
            for log in logs
        ],
        meta=AdminPageMeta(total=total, limit=limit, offset=offset),
    )
