import { CartItem, Product } from '../types';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000/api/v1';

// Admin-uploaded product photos are served from the API's origin at
// /uploads/... (see backend/app/main.py's StaticFiles mount), not under the
// /api/v1 prefix — this strips that prefix off so ProductArtwork can turn a
// relative "/uploads/products/xyz.jpg" imageKey into a full URL.
export const API_ORIGIN = new URL(API_BASE_URL).origin;

const SESSION_STORAGE_KEY = 'brimline_session_id';

/**
 * Guest-cart identity until the backend's Phase 2 (Auth) lands. Generated
 * once per browser and reused on every cart request via X-Session-Id.
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || response.statusText;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    throw new ApiError(response.status, message, code);
  }

  return response.json() as Promise<T>;
}

export function fetchProducts(region: 'usa' | 'eu'): Promise<Product[]> {
  return request<Product[]>(`/products?region=${region}`);
}

export function fetchCart(): Promise<CartItem[]> {
  return request<{ items: CartItem[] }>('/cart').then((res) => res.items);
}

export function addCartItem(variantId: string, quantity: number): Promise<CartItem[]> {
  return request<{ items: CartItem[] }>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ variantId, quantity }),
  }).then((res) => res.items);
}

export function updateCartItem(itemId: string, quantity: number): Promise<CartItem[]> {
  return request<{ items: CartItem[] }>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  }).then((res) => res.items);
}

export function removeCartItem(itemId: string): Promise<CartItem[]> {
  return request<{ items: CartItem[] }>(`/cart/items/${itemId}`, {
    method: 'DELETE',
  }).then((res) => res.items);
}

export function clearCartApi(): Promise<CartItem[]> {
  return request<{ items: CartItem[] }>('/cart', { method: 'DELETE' }).then((res) => res.items);
}

// ---- Checkout / Orders (backend/app/api/v1/checkout.py, orders.py, payments.py) ----

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postalCode?: string;
  countryCode: string;
  phone?: string;
}

export interface CheckoutIssue {
  variantId: string;
  reason: string;
  available?: number;
}

export interface CheckoutValidation {
  valid: boolean;
  issues: CheckoutIssue[];
}

export interface OrderItemResult {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResult {
  id: string;
  orderNumber: string;
  status: string;
  complianceStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  items: OrderItemResult[];
  createdAt: string;
}

export type CheckoutMode = 'none' | 'btcpay' | 'ramp';

export interface PaymentResult {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  // "none": no real provider configured — the existing auto-capture demo
  //   flow applies (see App.tsx handleOrderPlaced).
  // "btcpay": redirect the browser to checkoutUrl — BTCPay's own hosted
  //   checkout page (direct crypto payment, customer's own wallet).
  // "ramp": open a Ramp Network widget targeting cryptoAddress (card
  //   payment that settles as BTC into the same BTCPay-watched wallet).
  checkoutMode: CheckoutMode;
  checkoutUrl: string | null;
  cryptoAddress: string | null;
}

export interface OrderWithPayment {
  order: OrderResult;
  payment: PaymentResult;
}

export type PaymentMethod = 'card_link' | 'crypto';

export interface CreateOrderPayload {
  email: string;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  refundAddress?: string;
  orderNotes?: string;
}

// Mirrors backend/app/services/orders.py::compute_order_totals exactly, so
// CartPage/CheckoutPage can show live totals before an order is actually
// created. The backend recomputes and charges this independently — this
// function is display-only, never trusted as the source of truth.
// Shipping and tax are zeroed so the total equals the product subtotal, for
// cheap end-to-end crypto-checkout testing — keep in sync with the backend
// constants and restore realistic values before launch.
const FLAT_SHIPPING_RATE = 0;
const TAX_RATE = 0;
const CRYPTO_DISCOUNT_RATE = 0.05;

export interface OrderTotals {
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export function computeOrderTotals(
  subtotal: number,
  paymentMethod: PaymentMethod,
  shippingKnown: boolean
): OrderTotals {
  const shippingAmount = shippingKnown ? FLAT_SHIPPING_RATE : 0;
  const discountAmount = paymentMethod === 'crypto' ? subtotal * CRYPTO_DISCOUNT_RATE : 0;
  const taxableBase = subtotal - discountAmount + shippingAmount;
  const taxAmount = Math.round(taxableBase * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((taxableBase + taxAmount) * 100) / 100;
  return { subtotal, shippingAmount, discountAmount, taxAmount, totalAmount };
}

export function validateCheckout(): Promise<CheckoutValidation> {
  return request<CheckoutValidation>('/checkout/validate', { method: 'POST' });
}

export function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey: string
): Promise<OrderWithPayment> {
  return request<OrderWithPayment>('/checkout/create-order', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}

const ADDRESS_STORAGE_KEY = 'brimline_shipping_address';

/** Last address the guest entered at checkout — there's no account to save it
 * to (Phase 2), so CartPage's "Shipping to ..." summary and CheckoutPage's
 * pre-filled form both read/write this instead. */
export function getSavedAddress(): ShippingAddress | null {
  const raw = localStorage.getItem(ADDRESS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ShippingAddress;
  } catch {
    return null;
  }
}

export function saveAddress(address: ShippingAddress): void {
  localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
}

export function capturePayment(
  paymentId: string,
  outcome: 'succeed' | 'fail' = 'succeed'
): Promise<OrderWithPayment> {
  return request<OrderWithPayment>(`/payments/${paymentId}/capture`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}

const RAMP_HOST_API_KEY = (import.meta.env.VITE_RAMP_HOST_API_KEY as string | undefined) || '';

/** Card-to-Bitcoin on-ramp: Ramp buys BTC by card and sends it to
 * `cryptoAddress` — the same BTCPay-watched, self-custodied wallet address
 * a direct crypto payer's invoice would use. See backend/README.md's
 * "Card-to-Bitcoin via Ramp Network" section for the full contract.
 * Returns null if VITE_RAMP_HOST_API_KEY isn't configured — the caller
 * should fall back to a manual-payment display in that case. */
export function buildRampWidgetUrl(cryptoAddress: string, fiatAmount: number, fiatCurrency: string): string | null {
  if (!RAMP_HOST_API_KEY) return null;
  const params = new URLSearchParams({
    hostApiKey: RAMP_HOST_API_KEY,
    swapAsset: 'BTC',
    userAddress: cryptoAddress,
    fiatValue: fiatAmount.toFixed(2),
    fiatCurrency,
  });
  return `https://app.ramp.network/?${params.toString()}`;
}
