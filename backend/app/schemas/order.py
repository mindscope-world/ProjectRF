from datetime import datetime

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
