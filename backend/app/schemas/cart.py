from pydantic import BaseModel, Field

# camelCase to match src/types.ts's `CartItem` interface exactly — see
# app/schemas/catalog.py for the same rationale.


class CartItemOut(BaseModel):
    id: str
    productId: str
    name: str
    imageKey: str
    quantity: int
    packLabel: str
    unitPrice: float
    currency: str | None = None


class CartOut(BaseModel):
    items: list[CartItemOut]


class AddCartItemIn(BaseModel):
    variantId: str
    quantity: int = Field(gt=0)


class UpdateCartItemIn(BaseModel):
    quantity: int = Field(gt=0)
