from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

# Field names are camelCase to match every other schema module — see
# app/schemas/catalog.py's note on why (zero frontend mapping layer).


class AdminProductVariantIn(BaseModel):
    quantity: int = Field(gt=0)
    label: str
    price: Decimal = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    savingsLabel: str | None = None
    quantityAvailable: int = Field(default=0, ge=0)


class AdminProductVariantUpdateIn(BaseModel):
    """PATCH semantics for an existing pack-size/price tier. `active: false`
    is the "soft delete" — it drops the tier from the storefront's price
    range without touching order history that references the variant (see
    the hard-delete endpoint's docstring for when to use that instead)."""

    label: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    savingsLabel: str | None = None
    quantity: int | None = Field(default=None, gt=0)
    active: bool | None = None


class AdminProductVariantOut(BaseModel):
    id: str
    sku: str
    quantity: int
    label: str
    price: float
    currency: str
    savingsLabel: str | None
    active: bool
    quantityAvailable: int
    quantityReserved: int


class AdminProductImageIn(BaseModel):
    """`url` is whatever POST /admin/uploads/image returned (a
    /uploads/products/... path), or any absolute image URL if the admin
    would rather link out to already-hosted photography."""

    url: str
    altText: str | None = None
    isPrimary: bool = False


class AdminProductImageUpdateIn(BaseModel):
    altText: str | None = None
    isPrimary: bool | None = None
    sortOrder: int | None = None


class AdminProductImageOut(BaseModel):
    id: str
    url: str
    altText: str | None
    sortOrder: int
    isPrimary: bool


class AdminUploadOut(BaseModel):
    url: str


class AdminCategoryIn(BaseModel):
    name: str
    slug: str
    description: str | None = None


class AdminProductIn(BaseModel):
    name: str
    slug: str
    description: str | None = None
    categorySlug: str
    region: Literal["usa", "eu"]
    status: Literal["draft", "active", "inactive", "archived"] = "active"
    isBestSeller: bool = False
    hasUsaDomesticBadge: bool = False
    hasUkDomesticBadge: bool = False
    requiresPrescription: bool = False
    controlledProduct: bool = False
    # Optional: a product can be created bare and get its photos attached
    # afterwards via POST /admin/products/{id}/images (the flow the admin UI
    # actually uses — upload returns a URL, then that URL is attached).
    imageKey: str | None = None
    variants: list[AdminProductVariantIn] = Field(min_length=1)


class AdminProductUpdateIn(BaseModel):
    """Every field optional — PATCH semantics, unlike the POST-only
    AdminProductIn. Variants aren't editable here; use the dedicated
    variant/inventory endpoints so a partial update can't silently wipe a
    product's pack sizes."""

    name: str | None = None
    description: str | None = None
    categorySlug: str | None = None
    status: Literal["draft", "active", "inactive", "archived"] | None = None
    isBestSeller: bool | None = None
    hasUsaDomesticBadge: bool | None = None
    hasUkDomesticBadge: bool | None = None
    requiresPrescription: bool | None = None
    controlledProduct: bool | None = None
    imageKey: str | None = None


class AdminProductOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    categorySlug: str
    region: str
    status: str
    isBestSeller: bool
    hasUsaDomesticBadge: bool
    hasUkDomesticBadge: bool
    requiresPrescription: bool
    controlledProduct: bool
    imageKey: str
    images: list[AdminProductImageOut]
    variants: list[AdminProductVariantOut]
    createdAt: datetime
    updatedAt: datetime


class AdminInventoryAdjustIn(BaseModel):
    quantityAvailable: int = Field(ge=0)
    reason: str | None = None


class AdminOrderItemOut(BaseModel):
    id: str
    productName: str
    sku: str
    quantity: int
    unitPrice: float
    subtotal: float


class AdminPaymentSummaryOut(BaseModel):
    id: str
    provider: str
    paymentMethod: str
    status: str
    amount: float
    currency: str
    checkoutUrl: str | None
    cryptoAddress: str | None
    createdAt: datetime


class AdminOrderOut(BaseModel):
    id: str
    orderNumber: str
    customerEmail: str
    sessionId: str | None
    status: str
    complianceStatus: str
    fulfillmentStatus: str
    currency: str
    subtotal: float
    shippingAmount: float
    taxAmount: float
    discountAmount: float
    totalAmount: float
    shippingAddress: dict
    notes: str | None
    trackingNumber: str | None
    carrier: str | None
    items: list[AdminOrderItemOut]
    payments: list[AdminPaymentSummaryOut]
    createdAt: datetime
    updatedAt: datetime


class AdminOrderUpdateIn(BaseModel):
    fulfillmentStatus: (
        Literal["pending", "processing", "packed", "shipped", "delivered", "returned", "cancelled"] | None
    ) = None
    trackingNumber: str | None = None
    carrier: str | None = None
    notes: str | None = None


class AdminComplianceReviewOut(BaseModel):
    orderId: str
    orderNumber: str
    customerEmail: str
    complianceStatus: str
    totalAmount: float
    currency: str
    items: list[AdminOrderItemOut]
    createdAt: datetime


class AdminComplianceDecisionIn(BaseModel):
    reason: str | None = None


class AdminRefundIn(BaseModel):
    paymentId: str
    amount: Decimal = Field(gt=0)
    reason: str | None = None


class AdminRefundOut(BaseModel):
    id: str
    paymentId: str
    orderId: str
    orderNumber: str
    amount: float
    reason: str | None
    providerRefundId: str | None
    status: str
    createdAt: datetime


class AdminCheckoutOut(BaseModel):
    """A checkout/payment-attempt monitoring row — one per Payment, joined
    with just enough order context to be useful without a second lookup."""

    paymentId: str
    orderId: str
    orderNumber: str
    customerEmail: str
    provider: str
    paymentMethod: str
    checkoutMode: str
    status: str
    amount: float
    currency: str
    createdAt: datetime
    updatedAt: datetime


class AdminAuditLogOut(BaseModel):
    id: str
    actor: str
    action: str
    entityType: str
    entityId: str
    details: dict | None
    createdAt: datetime


class AdminPageMeta(BaseModel):
    total: int
    limit: int
    offset: int


class AdminProductListOut(BaseModel):
    items: list[AdminProductOut]
    meta: AdminPageMeta


class AdminOrderListOut(BaseModel):
    items: list[AdminOrderOut]
    meta: AdminPageMeta


class AdminRefundListOut(BaseModel):
    items: list[AdminRefundOut]
    meta: AdminPageMeta


class AdminCheckoutListOut(BaseModel):
    items: list[AdminCheckoutOut]
    meta: AdminPageMeta


class AdminAuditLogListOut(BaseModel):
    items: list[AdminAuditLogOut]
    meta: AdminPageMeta
