# RapidFinil Backend Implementation Plan

**Status:** Draft v1.0 — planning document, no backend exists yet
**Frontend:** React 19 + Vite + TypeScript (this repo) — currently 100% static data (`src/data/products.ts`, `euProducts.ts`)
**Target backend:** FastAPI + PostgreSQL 18 + Redis + Celery, deployed via Docker Compose
**Regulatory note:** Kenya's Pharmacy and Poisons Board published draft *Digital Pharmacy Services Guidelines* (Aug 13, 2026) covering digital-pharmacy operations. Compliance rules (prescription requirements, controlled-product flags, review workflow) must be **configurable data, not hard-coded logic**, and the implementation must be reviewed against final PPB requirements before production launch.

---

## 1. Goal

Replace the frontend's static product/cart state with a real backend that becomes the source of truth for **price, stock, order, compliance, payment, fulfillment, and settlement**. The frontend (`App.tsx` + components) becomes a thin client that calls the API instead of importing static arrays.

Non-goals for v1: microservices split, multi-currency settlement engine, native mobile apps.

---

## 2. Architecture summary

```
Browser ─▶ Cloudflare/WAF ─▶ Nginx ─▶ FastAPI ─┬─▶ PostgreSQL (system of record)
                                                ├─▶ Redis (cache, queue, sessions)
                                                ├─▶ S3/R2 (product images, prescriptions)
                                                └─▶ Celery workers ─┬─▶ Payment provider
                                                                    ├─▶ Crypto settlement provider
                                                                    ├─▶ Email/SMS
                                                                    └─▶ Shipping API
```

Backend is a **modular monolith** (not microservices) organized by domain:

```
app/
├── auth/        ├── catalog/     ├── cart/
├── orders/      ├── compliance/  ├── payments/
├── inventory/   ├── shipping/    └── admin/
```

Modules can be split into services later if scale requires it — not needed at launch volume.

---

## 3. Data model (PostgreSQL)

UUID primary keys throughout (`pgcrypto` for `gen_random_uuid()`), `citext` for case-insensitive email.

### Enums
`user_status`, `product_status`, `order_status`, `payment_status`, `compliance_status`, `fulfillment_status`, `prescription_status`, `inventory_transaction_type`, `crypto_settlement_status` — see Appendix A for full DDL.

### Core tables
| Table | Purpose |
|---|---|
| `users`, `roles`, `user_roles` | Auth + RBAC (customer, support, pharmacist, compliance, warehouse, finance, admin, super_admin) |
| `addresses` | Customer shipping addresses |
| `categories`, `products`, `product_variants`, `product_images` | Catalog. **Products don't hold price** — `product_variants` do (SKU, strength, pack quantity, price). Frontend's `priceRange` string (`"$85 – $800"`) becomes a computed `price_min`/`price_max` from variants, not a stored string. |
| `inventory`, `inventory_transactions` | Stock levels + auditable ledger of every stock movement |
| `carts`, `cart_items` | Server-side cart (works for guest via `session_id` or logged-in via `user_id`) |
| `orders`, `order_items` | Orders. Address and price/name are **snapshotted** into the order at checkout time so later catalog/address edits don't rewrite history |
| `prescriptions`, `compliance_reviews` | Prescription upload (file in private object storage, only `storage_key` in DB) + reviewer audit trail |
| `payments`, `payment_events`, `refunds` | Payment provider abstraction. `payment_events` dedupes webhooks via `UNIQUE(provider_event_id)` |
| `crypto_settlements` | Settlement-layer only — **never** the customer-facing payment method. Card is captured first; settlement to crypto happens after, via a provider adapter |
| `shipments` | Carrier + tracking |
| `audit_logs` | First-class subsystem (not optional) — every privileged mutation logged with actor, before/after values, IP, UA |
| `financial_ledger_entries` | Double-entry-style ledger (`SALE`, `PAYMENT_CAPTURE`, `REFUND`, `CHARGEBACK`, `CRYPTO_SETTLEMENT`, …) — this, not a `wallet_balance` field, is the financial source of truth |

Full CREATE TABLE statements are in Appendix A.

**Key invariant:** the backend never trusts a price sent by the frontend — every price is re-read from `product_variants` at cart/checkout time.

---

## 4. API contract (`/api/v1`)

Versioned from day one so `/api/v2` can exist later without breaking the frontend.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/verify-email`, `/forgot-password`, `/reset-password`; `GET/PATCH /account` |
| Catalog | `GET /products`, `/products/{slug}`, `/products/{id}/variants`, `/categories`, `/categories/{slug}` — supports `?category=&min_price=&max_price=&page=&limit=` |
| Cart | `GET/DELETE /cart`, `POST/PATCH/DELETE /cart/items/{id}` |
| Checkout | `POST /checkout/validate`, `/checkout/create-order`, `/checkout/payment-session` |
| Orders | `GET /orders`, `/orders/{id}`, `POST /orders/{id}/cancel`, `GET /orders/{id}/tracking` |
| Prescriptions | `POST/GET /prescriptions`, `GET /prescriptions/{id}` (signed URLs, never public) |
| Payments | `POST /payments/create-session`, `GET /payments/{id}`, `POST /webhooks/payments` |
| Admin | `/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/payments`, `/admin/refunds`, `/admin/compliance/reviews(/approve\|/reject)`, `/admin/inventory`, `/admin/shipments`, `/admin/audit-logs` |

Standard response envelope:
```json
{ "data": {}, "meta": {} }
```
```json
{ "error": { "code": "PRODUCT_OUT_OF_STOCK", "message": "...", "request_id": "..." } }
```
Every request carries `X-Request-ID` for tracing.

Checkout validation checks (in order): product exists → product active → variant active → inventory available → quantity valid → price current → customer authenticated → prescription requirement → shipping restriction → compliance requirement.

---

## 5. Payment & order state machines

**Payment status** (`payments.status`): `created → pending → (requires_action) → authorized → captured → (partially_refunded | refunded)`, with `failed`/`cancelled` off-ramps from `pending`.

Hard rule: **the frontend never transitions a payment to `captured`** — only a signature-verified provider webhook event can.

**Order status** (`orders.status`), separate from payment status:
```
pending → awaiting_payment → payment_received → compliance_review → processing → shipped → delivered
                                        └─(if rejected)→ cancelled/refunded
```
Products with `requires_prescription = false` skip `compliance_review` and go straight to `processing`.

---

## 6. Payment & settlement provider abstraction

Both payments and crypto settlement sit behind an interface so the order/checkout logic is never coupled to one vendor:

```python
class PaymentProvider:
    async def create_payment_session(self, order_id, amount, currency, idempotency_key): ...
    async def get_payment(self, provider_payment_id): ...
    async def refund(self, provider_payment_id, amount): ...
    def verify_webhook(self, payload: bytes, signature: str): ...

class SettlementProvider:
    async def create_settlement(self, payment_id, amount, currency): ...
    async def get_settlement(self, settlement_id): ...
    async def verify_webhook(self, payload: bytes, signature: str): ...
```
Flow: `card payment → payment provider → capture → order confirmed → settlement request → SettlementProvider → licensed settlement infra → merchant wallet/custodian`. The backend never handles a private key.

Provider selection (payment + crypto settlement) must be confirmed against: jurisdiction legality, pharmacy/regulated-product category acceptance, and PPB digital-pharmacy guideline compatibility — this is a decision to make during Phase 7, not now.

---

## 7. Concurrency, idempotency, correctness controls

These are non-negotiable, not "nice to have":

- **Inventory reservation** uses `SELECT ... FOR UPDATE` row locks so two customers can't both buy the last unit.
- **Checkout is one DB transaction**: validate cart → validate inventory → determine compliance → create order → reserve inventory → create order items → clear cart. Payment session is only created *after* the order exists, so a payment can never succeed against a nonexistent order.
- **Client-supplied idempotency keys** (`Idempotency-Key` header) on checkout/payment endpoints — a frozen UI with 3 clicks on "Pay" must create one order, not three.
- **Webhook idempotency** via `UNIQUE(provider_event_id)` on `payment_events` — duplicate webhook delivery is a no-op on the second receipt.

---

## 8. Security baseline

HTTPS everywhere; JWT access + rotating refresh tokens; 2FA required for admin/pharmacist/compliance roles; RBAC on every admin route; rate limiting; strict CORS; webhook signature verification; audit logging on privileged mutations; encryption at rest; prescriptions in private object storage served only via short-lived signed URLs; secrets via Docker secrets/managed secret store, never plain env vars in source control.

Never store: raw card number, CVV, payment PIN, or wallet private keys. Card capture goes through the payment provider's hosted/tokenized flow.

---

## 9. Frontend integration points (this repo)

Concrete changes needed in the existing codebase once the API exists — tracked here so this plan stays tied to the actual code, not just the abstract spec.

**Done (Phase 3 + 4):**

- `src/data/products.ts`, `src/data/euProducts.ts` → deleted, replaced by `src/api/client.ts` (`fetchProducts`, `fetchCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCartApi`), called from `App.tsx`. `euReviews.ts` untouched (unrelated to the catalog). No React Query/SWR — plain `useEffect` + `useState`, which is all this phase needed.
- `src/types.ts`: kept `priceRange` as a string (computed server-side, byte-identical to the old static data) rather than switching to `price_min`/`price_max` as originally sketched here — that would have required rewriting `ProductCard`'s display logic for no behavioral gain. Only addition: `ProductOption.variantId?: string`, so `handleAddToCart` can tell the backend which `product_variants` row to add. `ProductCard`/`ProductModal`/`CartDrawer`/`ProductArtwork` needed **zero** changes.
- Cart: `X-Session-Id` header (a `crypto.randomUUID()` persisted in `localStorage`), not a cookie as originally sketched — simpler, no cookie/CORS-credential complications, fine for a guest-only cart. Revisit when Phase 2/Auth adds logged-in carts to merge into.
- Found and fixed a real bug while wiring this up: `filteredBestSellers`/`filteredOtherProducts`/`filteredEuProducts`'s `useMemo` dependency arrays never included the product lists (harmless when those were static top-level constants; silently broken — permanently empty — once they became `useState` populated asynchronously by a fetch).
- Env: `VITE_API_BASE_URL` added to `.env.example`, defaults to `http://localhost:8000/api/v1` in `src/api/client.ts` if unset.

**Still open:**

- `ContactUs.tsx` form → needs a real submission endpoint (or third-party form handler) instead of the current placeholder.
- `OfferZoneModal.tsx` / promo content → candidate for an admin-managed `promotions` table rather than hard-coded JSX, once admin panel exists (Phase 9+).
- **Done**: `src/components/CartPage.tsx` (full cart table — remove/thumbnail/product/price/quantity/subtotal, coupon input (UI-only, no coupon system exists), batched "Update cart", live totals) and `src/components/CheckoutPage.tsx` (billing form, ship-to-different-address toggle, order summary, payment method choice between `card_link` and `crypto` with the 5% crypto discount + optional refund address, required terms checkbox, order confirmation screen). Both are rendered as additional branches in `App.tsx`'s existing page-switching ternary (`isCartPageOpen`/`isCheckoutPageOpen`), not a router — consistent with how `ContactUs`/EU pages already work in this codebase. `CartDrawer.tsx`'s old fake "checkout complete after 2.5s" simulation is gone, replaced by real "View Cart"/"Proceed to Checkout" navigation into these pages. Backend gained real (non-zero) shipping/tax/discount computation and payment-method storage to support this — see `backend/README.md`'s "Shipping, tax, and payment method" section. Verified with a full Playwright walkthrough: add to cart → cart page → checkout → country-selected shipping reveal → switch to crypto (discount + refund address appear) → terms-required validation → place order → confirmed order inspected directly in Postgres (correct status, payment_method, totals, notes).

---

## 10. Implementation phases

Ordered so commerce/compliance logic is fully tested **before real money moves**. Each phase has a concrete deliverable and should ship as its own PR/milestone.

- [x] **Phase 1 — Infrastructure**: Docker Compose (api, worker, postgres, redis, nginx), Alembic wired up, CI skeleton. *Deliverable: `GET /health`, `GET /ready` respond in all environments.* — implemented in `backend/` (FastAPI app, Dockerfile, Alembic with a first migration enabling `pgcrypto`/`citext`) + root `compose.yaml` + `.github/workflows/backend-ci.yml`. Verified end-to-end: clean `docker compose up --build` brings up all 5 services healthy, `/health` and `/ready` return correct status both directly (`:8000`) and through nginx (`:8080`), `/ready` correctly degrades to 503 when Redis is stopped and recovers to 200 when it's back, `alembic upgrade head` applies against the containerized Postgres, and `pytest`/`ruff` pass. See `backend/README.md` for run instructions.
- [ ] **Phase 2 — Auth & RBAC**: register/login/refresh/logout, email verification, password reset, roles table + seed roles. *Deliverable: customer and admin accounts both work end-to-end.*
- [x] **Phase 3 — Catalog**: categories, products, variants, images, inventory tables; migrate the current static product data into Postgres. *Deliverable: frontend catalog reads from API instead of `src/data/*.ts`.* — `categories`/`products`/`product_variants`/`product_images`/`inventory` added in migration `0002_catalog_and_cart`; all 31 products from the deleted `src/data/products.ts`/`euProducts.ts` migrated via `app/seed/seed_catalog.py` (idempotent). `GET /api/v1/categories`, `/products?region=usa|eu`, `/products/{slug}` return data shaped to match `src/types.ts`'s `Product` exactly (camelCase, `priceRange` computed server-side), so `ProductCard`/`ProductModal`/`ProductArtwork` needed zero changes — only `App.tsx`'s data source changed (`src/api/client.ts`). Verified in a real browser (Playwright + system Chrome, since `/chrome` tools weren't enabled this session): all 25 USA + 6 EU products render with correct prices/badges/ratings, matching the original static data byte-for-byte on `priceRange`.
- [x] **Phase 4 — Cart**: server-side cart CRUD, stock + price validation server-side. *Deliverable: frontend `CartDrawer` backed by API, not local state.* — `carts`/`cart_items` tables (same migration); guest-only for now since Phase 2/Auth doesn't exist yet (`carts.user_id` has no FK — see backend/README.md). Cart identity is a `crypto.randomUUID()` the frontend generates once into `localStorage` and sends as `X-Session-Id`. Price and stock are always read from `product_variants`/`inventory` server-side; `POST/PATCH /cart/items` returns `409 STOCK_INSUFFICIENT` when a request would exceed `quantity_available`, merging into an existing line's quantity rather than trusting the client. `CartDrawer.tsx` needed zero changes. Verified end-to-end in a real browser: add → merge-quantity → over-stock 409 (surfaced via `window.alert`, confirmed by lowering a variant's stock to 1 and requesting 5) → quantity update → remove → clear, plus cart persisting correctly across a full page reload via the localStorage session id.
- [x] **Phase 5 — Orders (no real payment yet)**: checkout transaction, inventory reservation, address/price snapshotting, order status. Use a **fake payment provider** at this stage. *Deliverable: full order lifecycle testable without touching real money.* — migration `0003_orders_and_payments` adds `orders`/`order_items`/`payments` + the `order_status`/`compliance_status`/`fulfillment_status`/`payment_status` enums from `docs/backend-spec.md`. `POST /api/v1/checkout/validate` and `/checkout/create-order` (address + product name/sku/price snapshotted onto the order; row-locked `SELECT ... FOR UPDATE` on `inventory` before reserving, so two concurrent checkouts can't both win the last unit), `POST /api/v1/payments/{id}/capture` (the `FakePaymentProvider` — `app/integrations/payments/`, built to the `PaymentProvider` interface so Phase 7 swaps in a real provider without touching order/checkout logic — takes a caller-supplied `succeed`/`fail` outcome standing in for a real webhook), `GET /api/v1/orders(/{id})`, `POST /api/v1/orders/{id}/cancel`. Client-supplied `Idempotency-Key` header prevents double-order on retry (workplan section 39) — verified a repeated key returns the identical order rather than creating a second one. Like carts, orders are guest-only (`session_id`, no `user_id` FK yet — Phase 2). No `addresses` table yet either: with no logged-in user to own a saved address, the shipping address is just an inline JSONB snapshot on the order, same reasoning as `carts.session_id`. Verified via a full request-level lifecycle walkthrough (not just unit-level): empty-cart rejection, success path (reserve → capture succeed → processing, inventory settles), failure path (capture fail → cancelled, inventory fully released), pre-payment cancel, rejection of cancelling an already-processing order, checkout-time stock re-validation (distinct from cart's own check — catches stock that changed after add-to-cart), and session-scoped order listing/detail (a different session can't see or fetch another's order). Ran against a from-scratch `docker compose down -v && up --build` to confirm full reproducibility.
- [ ] **Phase 6 — Compliance**: prescription upload to private storage, review workflow, pharmacist/compliance roles, audit trail. *Deliverable: prescription-required order correctly blocks on review and correctly unblocks on approval; rejection correctly routes to cancellation.*
- [ ] **Phase 7 — Real payments**: integrate chosen PCI-compliant provider, webhook handling + signature verification + idempotency. *Deliverable: success, failure, duplicate-webhook, expired-session, and refund paths all covered by tests.*
- [ ] **Phase 8 — Crypto settlement**: `SettlementProvider` adapter, sandbox/testnet first. *Deliverable: settlement is decoupled from order fulfillment — fulfillment never blocks on a blockchain confirmation unless explicitly required.*
- [ ] **Phase 9 — Shipping**: shipment creation, tracking, delivery confirmation, returns.
- [ ] **Phase 10 — Admin panel**: the `/admin/*` endpoints plus a UI for products, orders, compliance queue, refunds, audit logs.
- [ ] **Phase 11 — Production hardening**: load testing, dependency scanning, backup/restore drill, webhook replay testing, access-control testing, PPB compliance review of the finished compliance workflow.

---

## 11. Testing priorities

- **Inventory race**: 1 unit in stock, 2 concurrent buyers → exactly one order succeeds.
- **Webhook replay**: same `provider_event_id` delivered twice → one state transition.
- **Cross-account access**: customer A requests customer B's order → 403/404.
- **Compliance gate**: prescription rejected → order cannot reach `processing`/fulfillment.
- **RBAC**: warehouse role attempts refund → 403.
- **Idempotent checkout**: repeated `Idempotency-Key` → one order created.

---

## 12. Open questions / decisions needed before Phase 7

1. Which PCI-compliant payment provider (must support the target markets: USA, UK, EU)?
2. Which crypto settlement provider, and does it legally support pharmacy/regulated-product merchants?
3. Final PPB Digital Pharmacy Services Guidelines (currently draft as of 2026-08-13) — what specific record-keeping / pharmacist-review requirements must `compliance_reviews` capture?
4. Managed Postgres vs. self-hosted in Compose for production (recommendation: managed).
5. Object storage provider for prescriptions/images (S3 vs. R2 vs. other).

---

## Appendix A — Full schema DDL, Docker Compose, Dockerfile, env template

Kept verbatim from the engineering spec for hand-off to whoever implements Phase 1–3. Not reproduced inline here to keep this plan skimmable — see `docs/backend-spec.md` (create by copying the original spec message into that file) for:

- All `CREATE TYPE` enum definitions
- All `CREATE TABLE` statements (users, roles, addresses, categories, products, product_variants, product_images, inventory, inventory_transactions, carts, cart_items, orders, order_items, prescriptions, compliance_reviews, payments, payment_events, refunds, crypto_settlements, shipments, audit_logs, financial_ledger_entries)
- FastAPI project directory layout
- `Dockerfile` and `compose.yaml`
- `.env.example`
