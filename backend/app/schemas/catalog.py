from pydantic import BaseModel

# Field names below are intentionally camelCase, matching src/types.ts's
# `Product`/`ProductOption` interfaces exactly. This lets the frontend
# consume API responses with zero mapping/transformation layer — see
# workplan.md Phase 3 notes.


class ProductBadgeOut(BaseModel):
    text: str
    variant: str


class ProductOptionOut(BaseModel):
    variantId: str
    quantity: int
    label: str
    price: float
    savings: str | None = None


class ProductOut(BaseModel):
    id: str  # product slug, not the internal UUID
    name: str
    category: str  # 'bestseller' | 'other'
    categorySlug: str | None = None
    priceRange: str
    rating: float
    ratingCount: int | None = None
    badges: list[ProductBadgeOut] | None = None
    hasUsaDomesticBadge: bool | None = None
    hasUkDomesticBadge: bool | None = None
    imageKey: str
    options: list[ProductOptionOut]
    description: str | None = None
    currency: str | None = None


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
