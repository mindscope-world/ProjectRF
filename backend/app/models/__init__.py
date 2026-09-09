from app.core.database import Base
from app.models.cart import Cart, CartItem
from app.models.catalog import (
    Category,
    Inventory,
    Product,
    ProductImage,
    ProductRegion,
    ProductStatus,
    ProductVariant,
)
from app.models.order import ComplianceStatus, FulfillmentStatus, Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus

__all__ = [
    "Base",
    "Category",
    "Product",
    "ProductStatus",
    "ProductRegion",
    "ProductVariant",
    "ProductImage",
    "Inventory",
    "Cart",
    "CartItem",
    "Order",
    "OrderItem",
    "OrderStatus",
    "ComplianceStatus",
    "FulfillmentStatus",
    "Payment",
    "PaymentStatus",
]

# Each new model module must be imported here so Alembic's autogenerate can
# see it via Base.metadata.
