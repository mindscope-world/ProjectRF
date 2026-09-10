import secrets
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.integrations.payments.base import PaymentProvider
from app.integrations.payments.btcpay import BTCPayProvider
from app.integrations.payments.fake import FakePaymentProvider
from app.models.cart import CartItem
from app.models.catalog import Inventory, ProductStatus, ProductVariant
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.payment_event import PaymentEvent
from app.models.refund import Refund
from app.schemas.checkout import CheckoutIssueOut, ShippingAddressIn
from app.schemas.order import OrderItemOut, OrderOut, OrderWithPaymentOut, PaymentOut
from app.schemas.payment import RefundOut
from app.services.cart import get_or_create_cart


def get_payment_provider(payment_method: str) -> tuple[PaymentProvider, str]:
    """Provider selection lives here, not at import time, so tests/dev/CI
    without BTCPay credentials configured transparently fall back to the
    fake provider — see backend/README.md.

    Both payment methods route to BTCPay once it's configured: `crypto`
    customers pay the invoice directly with their own wallet (redirected to
    BTCPay's hosted checkout_url); `card_link` customers are meant to reach
    the same invoice's on-chain address through a card-to-BTC on-ramp widget
    (Ramp Network) instead — see PaymentOut.checkoutMode and
    backend/README.md's "Card-to-Bitcoin via Ramp Network" section. Either
    way, funds land in the same self-custodied, watch-only wallet; only the
    customer-facing payment rail differs.

    Returns (provider, provider_name) — the name is what gets stored on
    `payments.provider` and is how later code (capture/refund/webhook
    lookup) tells fake and real payments apart without an isinstance check.
    """
    settings = get_settings()
    if settings.btcpay_base_url and settings.btcpay_store_id and settings.btcpay_api_key:
        return BTCPayProvider(), "btcpay"
    return FakePaymentProvider(), "fake"


def get_provider_by_name(provider_name: str) -> PaymentProvider:
    """Re-instantiate the provider a *specific, already-created* payment
    actually used — for capture/refund on that payment, not for picking a
    provider for a new one (that's get_payment_provider() above).

    Deliberately keyed off the `payments.provider` column already stored on
    the row, not re-derived from get_payment_provider(payment_method) +
    current settings: if BTCPay gets configured (or its credentials change)
    after a `fake` payment already exists, re-deriving would silently swap
    in BTCPayProvider for a payment BTCPay never created, and capture/refund
    would call it with a provider_payment_id that isn't a valid BTCPay
    invoice id. This bit in practice while testing the Phase 10 admin
    refund endpoint against payments created before BTCPay was configured.
    """
    if provider_name == "btcpay":
        return BTCPayProvider()
    return FakePaymentProvider()


def _checkout_mode(provider_name: str, payment_method: str) -> Literal["none", "btcpay", "ramp"]:
    if provider_name != "btcpay":
        return "none"
    return "btcpay" if payment_method == "crypto" else "ramp"


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
    discount_amount = (subtotal * CRYPTO_DISCOUNT_RATE) if payment_method == "crypto" else Decimal(0)
    taxable_base = subtotal - discount_amount + shipping_amount
    tax_amount = (taxable_base * TAX_RATE).quantize(Decimal("0.01"))
    total_amount = taxable_base + tax_amount
    return shipping_amount, discount_amount, tax_amount, total_amount


def _generate_order_number() -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
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
        checkoutMode=_checkout_mode(payment.provider, payment.payment_method),
        checkoutUrl=payment.checkout_url,
        cryptoAddress=payment.crypto_address,
    )


def serialize_refund(refund: Refund) -> RefundOut:
    return RefundOut(
        id=str(refund.id),
        paymentId=str(refund.payment_id),
        amount=float(refund.amount),
        reason=refund.reason,
        providerRefundId=refund.provider_refund_id,
        status=refund.status,
    )


async def _load_inventories_for_items(db: AsyncSession, items: list[OrderItem]) -> dict[uuid.UUID, Inventory]:
    variant_ids = [item.variant_id for item in items if item.variant_id is not None]
    if not variant_ids:
        return {}
    inv_stmt = select(Inventory).where(Inventory.variant_id.in_(variant_ids)).with_for_update()
    return {inv.variant_id: inv for inv in (await db.execute(inv_stmt)).scalars().all()}


def _consume_reservation(order: Order, inventories: dict[uuid.UUID, Inventory]) -> None:
    """Payment succeeded: the reservation becomes a firm sale — release the
    `quantity_reserved` hold without restoring `quantity_available` (that
    stock is genuinely spent now)."""
    for item in order.items:
        inv = inventories.get(item.variant_id) if item.variant_id else None
        if inv is not None:
            inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)


def _release_reservation(order: Order, inventories: dict[uuid.UUID, Inventory]) -> None:
    """Payment failed/expired/was cancelled: give the stock back."""
    for item in order.items:
        inv = inventories.get(item.variant_id) if item.variant_id else None
        if inv is not None:
            inv.quantity_available += item.quantity
            inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)


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
    subtotal: Decimal = sum((ci.variant.price * ci.quantity for ci in cart_items), Decimal(0))
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

    provider, provider_name = get_payment_provider(payment_method)
    session_result = await provider.create_payment_session(
        order_id=str(order.id), amount=total_amount, currency=currency, idempotency_key=idempotency_key
    )
    payment = Payment(
        order_id=order.id,
        provider=provider_name,
        provider_payment_id=session_result.provider_payment_id,
        payment_method=payment_method,
        currency=currency,
        amount=total_amount,
        status=PaymentStatus.created,
        idempotency_key=idempotency_key,
        checkout_url=session_result.checkout_url,
        crypto_address=session_result.crypto_address,
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

    if payment.provider != "fake":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "PROVIDER_SETTLES_VIA_WEBHOOK",
                "message": (
                    f"'{payment.provider}' payments settle automatically via webhook, not manual "
                    "capture — see POST /webhooks/payments/btcpay."
                ),
            },
        )

    if payment.status != PaymentStatus.created:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "PAYMENT_ALREADY_PROCESSED",
                "message": f"Payment is already '{payment.status.value}'.",
            },
        )

    provider = get_provider_by_name(payment.provider)
    result = await provider.capture(payment.provider_payment_id, outcome)
    order = payment.order
    inventories = await _load_inventories_for_items(db, order.items)

    if result.status == "captured":
        payment.status = PaymentStatus.captured
        # No compliance workflow exists yet (Phase 6) — every order skips
        # straight from payment_received to processing.
        order.status = OrderStatus.processing
        _consume_reservation(order, inventories)
    else:
        payment.status = PaymentStatus.failed
        order.status = OrderStatus.cancelled
        _release_reservation(order, inventories)

    await db.commit()

    order = await _get_order_with_relations(db, order.id)
    return OrderWithPaymentOut(order=serialize_order(order), payment=serialize_payment(payment))


async def handle_payment_webhook_event(
    db: AsyncSession,
    provider_event_id: str,
    provider_payment_id: str | None,
    event_type: str,
    payload: dict,
) -> bool:
    """Processes one already-signature-verified webhook delivery.

    Returns True if this call actually processed the event, False if it was
    a duplicate delivery (already recorded) that was correctly ignored — the
    caller (app/api/v1/webhooks.py) still returns 200 either way, since
    "already processed" is success from the provider's point of view, not
    an error to retry.

    Idempotency is enforced by the database, not a check-then-insert in
    Python: `payment_events.provider_event_id` is UNIQUE, so two concurrent
    deliveries of the same event both attempt the insert but only one can
    win — the loser's IntegrityError means "someone else is handling this,
    do nothing," which is race-safe in a way a SELECT-then-INSERT isn't.
    """
    event = PaymentEvent(
        provider_event_id=provider_event_id,
        event_type=event_type,
        payload=payload,
        signature_valid=True,
    )
    db.add(event)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return False

    if provider_payment_id:
        stmt = (
            select(Payment)
            .where(Payment.provider_payment_id == provider_payment_id)
            .options(selectinload(Payment.order).selectinload(Order.items))
        )
        payment = (await db.execute(stmt)).scalar_one_or_none()

        if payment is not None:
            event.payment_id = payment.id

            # Only act on events that actually change something — e.g. an
            # InvoiceSettled arriving after we already fulfilled on an
            # earlier InvoiceProcessing is purely informational at that
            # point (see workplan.md Phase 8: fulfillment doesn't wait on
            # full confirmation), so it's recorded but not re-applied.
            if payment.status == PaymentStatus.created:
                order = payment.order
                inventories = await _load_inventories_for_items(db, order.items)

                if event_type in ("InvoiceProcessing", "InvoiceReceivedPayment", "InvoiceSettled"):
                    # Fulfill on first sight of payment (even unconfirmed) —
                    # do not hold the order hostage to block confirmations.
                    payment.status = PaymentStatus.captured
                    order.status = OrderStatus.processing
                    _consume_reservation(order, inventories)
                elif event_type == "InvoiceExpired":
                    payment.status = PaymentStatus.expired
                    order.status = OrderStatus.cancelled
                    _release_reservation(order, inventories)
                elif event_type == "InvoiceInvalid":
                    payment.status = PaymentStatus.failed
                    order.status = OrderStatus.cancelled
                    _release_reservation(order, inventories)

    event.processed = True
    event.processed_at = datetime.now(UTC)
    await db.commit()
    return True


async def _execute_refund(
    db: AsyncSession, payment: Payment, amount: Decimal, reason: str | None
) -> Refund:
    """Core refund logic, shared by the customer-facing endpoint (ownership
    checked by the caller via session_id) and the Phase 10 admin panel
    (gated by require_admin instead — see app/services/admin.py). Does not
    commit; the caller does, so it can add an audit-log row to the same
    transaction."""
    if payment.status not in (PaymentStatus.captured, PaymentStatus.partially_refunded):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "PAYMENT_NOT_REFUNDABLE",
                "message": f"Cannot refund a payment in status '{payment.status.value}'.",
            },
        )

    already_refunded = sum((r.amount for r in payment.refunds), Decimal(0))
    remaining = payment.amount - already_refunded
    if amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "REFUND_EXCEEDS_REMAINING",
                "message": f"Only {remaining} of {payment.currency} remains refundable on this payment.",
            },
        )

    provider = get_provider_by_name(payment.provider)
    result = await provider.refund(payment.provider_payment_id, amount, reason)

    refund = Refund(
        payment_id=payment.id,
        amount=amount,
        reason=reason,
        provider_refund_id=result.provider_refund_id,
        status=result.status,
    )
    db.add(refund)

    payment.status = (
        PaymentStatus.refunded if amount == remaining else PaymentStatus.partially_refunded
    )
    if payment.status == PaymentStatus.refunded:
        payment.order.status = OrderStatus.refunded

    return refund


async def refund_payment(
    db: AsyncSession, session_id: str, payment_id: uuid.UUID, amount: Decimal, reason: str | None
) -> RefundOut:
    stmt = (
        select(Payment)
        .where(Payment.id == payment_id)
        .options(selectinload(Payment.order), selectinload(Payment.refunds))
    )
    payment = (await db.execute(stmt)).scalar_one_or_none()
    if payment is None or payment.order.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    refund = await _execute_refund(db, payment, amount, reason)

    await db.commit()
    await db.refresh(refund)
    return serialize_refund(refund)


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
                    "— a captured payment needs a refund (POST /payments/{id}/refund), not a cancel."
                ),
            },
        )

    inventories = await _load_inventories_for_items(db, order.items)
    _release_reservation(order, inventories)

    order.status = OrderStatus.cancelled
    for payment in order.payments:
        if payment.status == PaymentStatus.created:
            payment.status = PaymentStatus.cancelled

    await db.commit()

    order = await _get_order_with_relations(db, order.id)
    return serialize_order(order)
