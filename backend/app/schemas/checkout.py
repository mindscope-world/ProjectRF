from typing import Literal

from pydantic import BaseModel, EmailStr


class ShippingAddressIn(BaseModel):
    firstName: str
    lastName: str
    companyName: str | None = None
    addressLine1: str
    addressLine2: str | None = None
    city: str
    county: str | None = None
    postalCode: str | None = None
    countryCode: str
    phone: str | None = None


class CreateOrderIn(BaseModel):
    email: EmailStr
    shippingAddress: ShippingAddressIn
    paymentMethod: Literal["card_link", "crypto"] = "card_link"
    refundAddress: str | None = None
    orderNotes: str | None = None


class CheckoutIssueOut(BaseModel):
    variantId: str
    reason: str
    available: int | None = None


class CheckoutValidationOut(BaseModel):
    valid: bool
    issues: list[CheckoutIssueOut]
