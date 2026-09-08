export interface ProductOption {
  quantity: number;
  label: string;
  price: number;
  savings?: string;
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
    variant: 'price-drop' | 'back-in-stock' | 'out-of-stock' | 'sealed-bottle' | 'no-fent' | 'eu-delivery';
  }[];
  hasUsaDomesticBadge?: boolean;
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
