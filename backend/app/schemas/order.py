from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class OrderItemOut(BaseModel):
    id: str
    productName: str
    sku: str
    quantity: int
    unitPrice: float
    subtotal: float


class PaymentOut(BaseModel):
    id: str
    provider: str
    status: str
    amount: float
    currency: str
    # How the frontend should get the customer to actually pay:
    #  "none"   — fake/manual provider, nothing to redirect to (card_link
    #             with no BTCPay configured — an unconfigured dev/CI default)
    #  "btcpay" — redirect to checkoutUrl, BTCPay's own hosted checkout page
    #             (direct crypto payment, customer uses their own wallet)
    #  "ramp"   — open a Ramp Network widget targeting cryptoAddress (card
    #             payment that settles as BTC — see backend/README.md)
    checkoutMode: Literal["none", "btcpay", "ramp"] = "none"
    checkoutUrl: str | None = None
    cryptoAddress: str | None = None


class OrderOut(BaseModel):
    id: str
    orderNumber: str
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
    items: list[OrderItemOut]
    createdAt: datetime


class OrderWithPaymentOut(BaseModel):
    order: OrderOut
    payment: PaymentOut
