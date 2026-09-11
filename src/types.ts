export interface ProductOption {
  quantity: number;
  label: string;
  price: number;
  savings?: string;
  // Backend product_variants.id — needed to add this exact pack size to the
  // server-side cart (see src/api/client.ts). Absent for any product not
  // sourced from the API.
  variantId?: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'bestseller' | 'other';
  priceRange: string;
  rating: number; // 0 to 5
  ratingCount?: number;
  badges?: {
    text: string;
    variant: 'price-drop' | 'back-in-stock' | 'out-of-stock' | 'quality-checked' | 'ships-fast' | 'best-seller' | 'eu-delivery';
  }[];
  hasUsaDomesticBadge?: boolean;
  hasUkDomesticBadge?: boolean;
  imageKey: string;
  options: ProductOption[];
  description?: string;
  currency?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  imageKey: string;
  quantity: number;
  packSize?: number;
  packLabel: string;
  unitPrice: number;
  currency?: string;
}
