import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.integrations.payments.fake import FakePaymentProvider
from app.models.cart import CartItem
from app.models.catalog import Inventory, ProductStatus, ProductVariant
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.checkout import CheckoutIssueOut, ShippingAddressIn
from app.schemas.order import OrderItemOut, OrderOut, OrderWithPaymentOut, PaymentOut
from app.services.cart import get_or_create_cart

payment_provider = FakePaymentProvider()

# Flat-rate shipping + a combined tax/payment-processing-fee percentage —
# there's no shipping-rate table or tax-jurisdiction logic yet, just these
# two constants applied the same way to every order. The 5% bitcoin/crypto
# discount mirrors the rate already shown in CartDrawer.tsx.
FLAT_SHIPPING_RATE = Decimal("15.00")
TAX_RATE = Decimal("0.05")
CRYPTO_DISCOUNT_RATE = Decimal("0.05")


def compute_order_totals(subtotal: Decimal, payment_method: str) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """Returns (shipping_amount, discount_amount, tax_amount, total_amount).

    Tax is computed on the discounted, shipping-inclusive amount:
    (subtotal - discount + shipping) * TAX_RATE. Mirrored on the frontend
    (src/api/client.ts) for display before the order is actually created —
    this function is the authoritative source the server actually charges.
    """
    shipping_amount = FLAT_SHIPPING_RATE
    discount_amount = (subtotal * CRYPTO_DISCOUNT_RATE) if payment_method == "crypto" else Decimal("0")
    taxable_base = subtotal - discount_amount + shipping_amount
    tax_amount = (taxable_base * TAX_RATE).quantize(Decimal("0.01"))
    total_amount = taxable_base + tax_amount
    return shipping_amount, discount_amount, tax_amount, total_amount


def _generate_order_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"RF-{today}-{secrets.token_hex(4).upper()}"


def serialize_order(order: Order) -> OrderOut:
    return OrderOut(
        id=str(order.id),
        orderNumber=order.order_number,
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
        items=[
            OrderItemOut(
                id=str(item.id),
                productName=item.product_name,
                sku=item.sku,
                quantity=item.quantity,
                unitPrice=float(item.unit_price),
                subtotal=float(item.subtotal),
            )
            for item in order.items
        ],
        createdAt=order.created_at,
    )


def serialize_payment(payment: Payment) -> PaymentOut:
    return PaymentOut(
        id=str(payment.id),
        provider=payment.provider,
        status=payment.status.value,
        amount=float(payment.amount),
        currency=payment.currency,
    )


async def _load_cart_items_for_checkout(db: AsyncSession, session_id: str) -> list[CartItem]:
    cart = await get_or_create_cart(db, session_id)
    stmt = (
        select(CartItem)
        .where(CartItem.cart_id == cart.id)
        .options(
            selectinload(CartItem.variant).selectinload(ProductVariant.product),
            selectinload(CartItem.variant).selectinload(ProductVariant.inventory),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def validate_cart_for_checkout(db: AsyncSession, session_id: str) -> list[CheckoutIssueOut]:
    cart_items = await _load_cart_items_for_checkout(db, session_id)
    issues: list[CheckoutIssueOut] = []

    for item in cart_items:
        variant = item.variant
        if not variant.active or variant.product.status != ProductStatus.active:
            issues.append(CheckoutIssueOut(variantId=str(variant.id), reason="PRODUCT_UNAVAILABLE"))
            continue

        available = variant.inventory.quantity_available if variant.inventory else 0
        if item.quantity > available:
            issues.append(
                CheckoutIssueOut(
                    variantId=str(variant.id), reason="STOCK_INSUFFICIENT", available=available
                )
            )

    return issues


async def _get_payment_by_idempotency_key(db: AsyncSession, key: str) -> Payment | None:
    stmt = (
        select(Payment)
        .where(Payment.idempotency_key == key)
        .options(selectinload(Payment.order).selectinload(Order.items))
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_order_from_cart(
    db: AsyncSession,
    session_id: str,
    shipping_address: ShippingAddressIn,
    email: str,
    idempotency_key: str,
    payment_method: Literal["card_link", "crypto"] = "card_link",
    refund_address: str | None = None,
    order_notes: str | None = None,
) -> OrderWithPaymentOut:
    # Idempotent replay: a client retrying "Pay" after a frozen/ambiguous
    # response must not create a second order. See workplan.md section 39.
    existing_payment = await _get_payment_by_idempotency_key(db, idempotency_key)
    if existing_payment is not None:
        return OrderWithPaymentOut(
            order=serialize_order(existing_payment.order), payment=serialize_payment(existing_payment)
        )

    cart_items = await _load_cart_items_for_checkout(db, session_id)
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Lock every inventory row this checkout touches before checking stock,
    # so two concurrent checkouts racing for the last unit can't both win.
    variant_ids = [ci.variant_id for ci in cart_items]
    inv_stmt = select(Inventory).where(Inventory.variant_id.in_(variant_ids)).with_for_update()
    inventories = {inv.variant_id: inv for inv in (await db.execute(inv_stmt)).scalars().all()}

    for ci in cart_items:
        inv = inventories.get(ci.variant_id)
        available = inv.quantity_available if inv else 0
        if ci.quantity > available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "STOCK_INSUFFICIENT",
                    "message": (
                        f"{ci.variant.product.name} ({ci.variant.label}): "
                        f"only {available} unit(s) available."
                    ),
                    "variantId": str(ci.variant_id),
                },
            )

    currency = cart_items[0].variant.currency
    subtotal: Decimal = sum((ci.variant.price * ci.quantity for ci in cart_items), Decimal("0"))
    shipping_amount, discount_amount, tax_amount, total_amount = compute_order_totals(
        subtotal, payment_method
    )

    notes_parts = [p for p in (order_notes, f"Refund address: {refund_address}" if refund_address else None) if p]

    order = Order(
        order_number=_generate_order_number(),
        session_id=session_id,
        customer_email=email,
        status=OrderStatus.pending,
        currency=currency,
        subtotal=subtotal,
        shipping_amount=shipping_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        shipping_address=shipping_address.model_dump(),
        notes="\n".join(notes_parts) or None,
    )
    db.add(order)
    await db.flush()

    for ci in cart_items:
        variant = ci.variant
        db.add(
            OrderItem(
                order_id=order.id,
                variant_id=variant.id,
                product_name=variant.product.name,
                sku=variant.sku,
                quantity=ci.quantity,
                unit_price=variant.price,
                subtotal=variant.price * ci.quantity,
            )
        )
        inv = inventories[ci.variant_id]
        inv.quantity_available -= ci.quantity
        inv.quantity_reserved += ci.quantity

    session_result = await payment_provider.create_payment_session(
        order_id=str(order.id), amount=total_amount, currency=currency, idempotency_key=idempotency_key
    )
    payment = Payment(
        order_id=order.id,
        provider="fake",
        provider_payment_id=session_result.provider_payment_id,
        payment_method=payment_method,
        currency=currency,
        amount=total_amount,
        status=PaymentStatus.created,
        idempotency_key=idempotency_key,
    )
    db.add(payment)

    order.status = OrderStatus.awaiting_payment

    # The cart's contents are now an order — clear it, same as a real checkout.
    for ci in cart_items:
        await db.delete(ci)

    await db.commit()

    order = await _get_order_with_relations(db, order.id)
    return OrderWithPaymentOut(order=serialize_order(order), payment=serialize_payment(payment))


async def _get_order_with_relations(db: AsyncSession, order_id: uuid.UUID) -> Order:
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    return (await db.execute(stmt)).scalar_one()


async def capture_payment(
    db: AsyncSession, session_id: str, payment_id: uuid.UUID, outcome: Literal["succeed", "fail"]
) -> OrderWithPaymentOut:
    stmt = (
        select(Payment)
        .where(Payment.id == payment_id)
        .options(selectinload(Payment.order).selectinload(Order.items))
    )
    payment = (await db.execute(stmt)).scalar_one_or_none()
    if payment is None or payment.order.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if payment.status != PaymentStatus.created:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "PAYMENT_ALREADY_PROCESSED",
                "message": f"Payment is already '{payment.status.value}'.",
            },
        )

    result = await payment_provider.capture(payment.provider_payment_id, outcome)
    order = payment.order

    variant_ids = [item.variant_id for item in order.items if item.variant_id is not None]
    inventories: dict[uuid.UUID, Inventory] = {}
    if variant_ids:
        inv_stmt = select(Inventory).where(Inventory.variant_id.in_(variant_ids)).with_for_update()
        inventories = {inv.variant_id: inv for inv in (await db.execute(inv_stmt)).scalars().all()}

    if result.status == "captured":
        payment.status = PaymentStatus.captured
        # No compliance workflow exists yet (Phase 6) — every order skips
        # straight from payment_received to processing.
        order.status = OrderStatus.processing
        for item in order.items:
            inv = inventories.get(item.variant_id) if item.variant_id else None
            if inv is not None:
                inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)
    else:
        payment.status = PaymentStatus.failed
        order.status = OrderStatus.cancelled
        for item in order.items:
            inv = inventories.get(item.variant_id) if item.variant_id else None
            if inv is not None:
                inv.quantity_available += item.quantity
                inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)

    await db.commit()

    order = await _get_order_with_relations(db, order.id)
    return OrderWithPaymentOut(order=serialize_order(order), payment=serialize_payment(payment))


async def list_orders(db: AsyncSession, session_id: str) -> list[OrderOut]:
    stmt = (
        select(Order)
        .where(Order.session_id == session_id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    orders = (await db.execute(stmt)).scalars().all()
    return [serialize_order(o) for o in orders]


async def get_order(db: AsyncSession, session_id: str, order_id: uuid.UUID) -> OrderOut:
    stmt = (
        select(Order)
        .where(Order.id == order_id, Order.session_id == session_id)
        .options(selectinload(Order.items))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return serialize_order(order)


async def cancel_order(db: AsyncSession, session_id: str, order_id: uuid.UUID) -> OrderOut:
    stmt = (
        select(Order)
        .where(Order.id == order_id, Order.session_id == session_id)
        .options(selectinload(Order.items), selectinload(Order.payments))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status not in (OrderStatus.pending, OrderStatus.awaiting_payment):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ORDER_NOT_CANCELLABLE",
                "message": (
                    f"Order in status '{order.status.value}' can no longer be cancelled this way "
                    "— a captured payment needs a refund (Phase 7), not a cancel."
                ),
            },
        )

    variant_ids = [item.variant_id for item in order.items if item.variant_id is not None]
    inventories: dict[uuid.UUID, Inventory] = {}
    if variant_ids:
        inv_stmt = select(Inventory).where(Inventory.variant_id.in_(variant_ids)).with_for_update()
        inventories = {inv.variant_id: inv for inv in (await db.execute(inv_stmt)).scalars().all()}

    for item in order.items:
        inv = inventories.get(item.variant_id) if item.variant_id else None
        if inv is not None:
            inv.quantity_available += item.quantity
            inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)

    order.status = OrderStatus.cancelled
    for payment in order.payments:
        if payment.status == PaymentStatus.created:
            payment.status = PaymentStatus.cancelled

    await db.commit()

    order = await _get_order_with_relations(db, order.id)
    return serialize_order(order)
