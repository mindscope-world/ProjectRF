const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000/api/v1';

const TOKEN_STORAGE_KEY = 'brimline_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Admin-Token': token } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    // Stored token is missing/wrong/stale — drop it so AdminApp re-shows the
    // gate instead of quietly refetching with a token that will never work.
    clearAdminToken();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || response.statusText;
    throw new AdminApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ---- Shared shapes (mirrors backend/app/schemas/admin.py) -----------------

export interface AdminPageMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface AdminProductVariant {
  id: string;
  sku: string;
  quantity: number;
  label: string;
  price: number;
  currency: string;
  savingsLabel: string | null;
  active: boolean;
  quantityAvailable: number;
  quantityReserved: number;
}

export interface AdminProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categorySlug: string;
  region: string;
  status: string;
  isBestSeller: boolean;
  hasUsaDomesticBadge: boolean;
  hasUkDomesticBadge: boolean;
  requiresPrescription: boolean;
  controlledProduct: boolean;
  imageKey: string;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AdminOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface AdminPaymentSummary {
  id: string;
  provider: string;
  paymentMethod: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  cryptoAddress: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerEmail: string;
  sessionId: string | null;
  status: string;
  complianceStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: Record<string, unknown>;
  notes: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  items: AdminOrderItem[];
  payments: AdminPaymentSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminComplianceReview {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  complianceStatus: string;
  totalAmount: number;
  currency: string;
  items: AdminOrderItem[];
  createdAt: string;
}

export interface AdminRefund {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string | null;
  providerRefundId: string | null;
  status: string;
  createdAt: string;
}

export interface AdminCheckout {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  provider: string;
  paymentMethod: string;
  checkoutMode: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

// ---- Verifies a token actually works, without assuming any specific route ----

export function verifyAdminToken(token: string): Promise<void> {
  return fetch(`${API_BASE_URL}/admin/audit-logs?limit=1`, {
    headers: { 'X-Admin-Token': token },
  }).then((res) => {
    if (!res.ok) throw new AdminApiError(res.status, 'Invalid admin token');
  });
}

// ---- Products ---------------------------------------------------------------

export function fetchAdminProducts(params: {
  region?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminProduct[]; meta: AdminPageMeta }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return request(`/admin/products?${qs.toString()}`);
}

export function createAdminProduct(payload: Record<string, unknown>): Promise<AdminProduct> {
  return request('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAdminProduct(id: string, payload: Record<string, unknown>): Promise<AdminProduct> {
  return request(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function adjustAdminInventory(
  variantId: string,
  quantityAvailable: number,
  reason?: string
): Promise<AdminProductVariant> {
  return request(`/admin/products/variants/${variantId}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify({ quantityAvailable, reason }),
  });
}

// ---- Product variants / price range -----------------------------------------

export function createAdminVariant(productId: string, payload: Record<string, unknown>): Promise<AdminProduct> {
  return request(`/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAdminVariant(
  productId: string,
  variantId: string,
  payload: Record<string, unknown>
): Promise<AdminProduct> {
  return request(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminVariant(productId: string, variantId: string): Promise<AdminProduct> {
  return request(`/admin/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
}

// ---- Product images -----------------------------------------------------------

/** Uploads a file and returns its URL — attach it to a product with addAdminProductImage. */
export async function uploadAdminImage(file: File): Promise<{ url: string }> {
  const token = getAdminToken();
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/admin/uploads/image`, {
    method: 'POST',
    // No Content-Type here — the browser sets multipart/form-data with the
    // right boundary itself; setting it manually breaks the boundary.
    headers: token ? { 'X-Admin-Token': token } : undefined,
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || response.statusText;
    throw new AdminApiError(response.status, message);
  }
  return response.json();
}

export function addAdminProductImage(
  productId: string,
  payload: { url: string; altText?: string; isPrimary?: boolean }
): Promise<AdminProduct> {
  return request(`/admin/products/${productId}/images`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAdminProductImage(
  productId: string,
  imageId: string,
  payload: { altText?: string; isPrimary?: boolean; sortOrder?: number }
): Promise<AdminProduct> {
  return request(`/admin/products/${productId}/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminProductImage(productId: string, imageId: string): Promise<AdminProduct> {
  return request(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' });
}

// ---- Categories -----------------------------------------------------------------

export function fetchAdminCategories(): Promise<AdminCategory[]> {
  return request('/admin/categories');
}

export function createAdminCategory(name: string, slug: string): Promise<AdminCategory> {
  return request('/admin/categories', { method: 'POST', body: JSON.stringify({ name, slug }) });
}

// ---- Site content (hero/footer/logo/offer zone) --------------------------------
// Mirrors backend/app/schemas/content.py — see src/siteContent.ts for the
// same shapes on the public storefront side.

export interface AdminLogoContent {
  imageUrl: string | null;
  brandName: string;
}

export interface AdminHeroContent {
  headline: string;
  badgeText: string;
  ctaLabel: string;
  backgroundImageUrl: string | null;
}

export interface AdminAnnouncementContent {
  usaText: string;
  euText: string;
}

export interface AdminFooterContent {
  copyrightText: string;
  supportEmail: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

export interface AdminOfferZoneOffer {
  title: string;
  description: string;
  couponCode?: string | null;
}

export interface AdminOfferZoneContent {
  title: string;
  offers: AdminOfferZoneOffer[];
}

export interface AdminSiteContent {
  logo: AdminLogoContent;
  hero: AdminHeroContent;
  announcement: AdminAnnouncementContent;
  footer: AdminFooterContent;
  offerZone: AdminOfferZoneContent;
}

export function fetchAdminSiteContent(): Promise<AdminSiteContent> {
  return request('/admin/site-content');
}

export function updateAdminSiteContent<K extends keyof AdminSiteContent>(
  section: K,
  value: AdminSiteContent[K]
): Promise<AdminSiteContent[K]> {
  return request(`/admin/site-content/${section}`, { method: 'PUT', body: JSON.stringify(value) });
}

// ---- Orders -------------------------------------------------------------------

export function fetchAdminOrders(params: {
  status?: string;
  fulfillmentStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminOrder[]; meta: AdminPageMeta }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return request(`/admin/orders?${qs.toString()}`);
}

export function updateAdminOrder(id: string, payload: Record<string, unknown>): Promise<AdminOrder> {
  return request(`/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// ---- Compliance -----------------------------------------------------------------

export function fetchComplianceQueue(): Promise<AdminComplianceReview[]> {
  return request('/admin/compliance/reviews?limit=200');
}

export function approveCompliance(orderId: string, reason?: string): Promise<AdminOrder> {
  return request(`/admin/compliance/reviews/${orderId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function rejectCompliance(orderId: string, reason?: string): Promise<AdminOrder> {
  return request(`/admin/compliance/reviews/${orderId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ---- Refunds -----------------------------------------------------------------

export function fetchAdminRefunds(params: {
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminRefund[]; meta: AdminPageMeta }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.set(k, String(v));
  });
  return request(`/admin/refunds?${qs.toString()}`);
}

export function createAdminRefund(paymentId: string, amount: number, reason?: string): Promise<AdminRefund> {
  return request('/admin/refunds', { method: 'POST', body: JSON.stringify({ paymentId, amount, reason }) });
}

// ---- Checkouts -----------------------------------------------------------------

export function fetchAdminCheckouts(params: {
  provider?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminCheckout[]; meta: AdminPageMeta }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return request(`/admin/checkouts?${qs.toString()}`);
}

// ---- Audit logs -----------------------------------------------------------------

export function fetchAuditLogs(params: {
  entityType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminAuditLog[]; meta: AdminPageMeta }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return request(`/admin/audit-logs?${qs.toString()}`);
}
