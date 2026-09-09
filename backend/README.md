# RapidFinil Backend — Phases 1, 3, 4, 5 (Infrastructure, Catalog, Cart, Orders)

FastAPI service for the RapidFinil pharmacy commerce backend. Covers infrastructure (Docker
Compose, Alembic, CI), the product catalog, a server-side cart, and the order/checkout lifecycle
with a fake payment provider. Auth (Phase 2) hasn't been built yet, so carts and orders are
guest-only, keyed by a client-generated session id. See [`../workplan.md`](../workplan.md) for the
full phased plan and [`../docs/backend-spec.md`](../docs/backend-spec.md) for the target schema/API
this grows into.

## Run with Docker Compose (from repo root)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Then apply migrations and load the catalog:

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed.seed_catalog
```

```bash
curl http://localhost:8000/health   # direct to the API container
curl http://localhost:8000/ready
curl http://localhost:8080/health   # via nginx
curl "http://localhost:8000/api/v1/products?region=usa"
curl "http://localhost:8000/api/v1/products?region=eu"
curl http://localhost:8000/api/v1/categories
```

`/health` reports process liveness only. `/ready` additionally opens a Postgres connection and
pings Redis, returning `503` if either dependency is unreachable.

## API surface

```
GET    /api/v1/categories
GET    /api/v1/products?region=usa|eu&q=<search>
GET    /api/v1/products/{slug}

GET    /api/v1/cart                       (requires X-Session-Id header)
POST   /api/v1/cart/items                 { variantId, quantity }
PATCH  /api/v1/cart/items/{item_id}       { quantity }
DELETE /api/v1/cart/items/{item_id}
DELETE /api/v1/cart

POST   /api/v1/checkout/validate                    -> { valid, issues[] }
POST   /api/v1/checkout/create-order                { email, shippingAddress, paymentMethod,
                                                        refundAddress?, orderNotes? }
                                                      optional Idempotency-Key header
POST   /api/v1/payments/{payment_id}/capture        { outcome: "succeed" | "fail" }
GET    /api/v1/orders
GET    /api/v1/orders/{order_id}
POST   /api/v1/orders/{order_id}/cancel
```

Every cart/checkout/order endpoint requires an `X-Session-Id` header — the frontend generates
this once via `crypto.randomUUID()` and persists it in `localStorage` (see `src/api/client.ts`).
There's no concept of a logged-in user's cart or order history yet; that arrives with Phase 2
(Auth), at which point `carts.user_id`/`orders.user_id` get real foreign keys and guest data can
be merged on login.

Price and stock are **always** read from `product_variants`/`inventory` server-side — nothing
ever accepts or trusts a client-supplied price. Adding/updating a cart item, or checking out,
beyond `inventory.quantity_available` returns `409 STOCK_INSUFFICIENT`.

### Shipping, tax, and payment method

`app/services/orders.py::compute_order_totals` is the single source of truth for what a checkout
actually charges — flat-rate shipping + a combined tax/payment-processing-fee percentage, with a
discount for paying in crypto:

```
shipping_amount = $15.00 flat, always
discount_amount = subtotal * 5%      if paymentMethod == "crypto", else 0
tax_amount      = (subtotal - discount + shipping) * 5%
total_amount    = subtotal - discount + shipping + tax
```

The frontend (`src/api/client.ts::computeOrderTotals`) mirrors this exact formula so CartPage/
CheckoutPage can show live totals before an order exists — display-only, never trusted; the
backend recomputes and charges independently. `paymentMethod` (`"card_link"` | `"crypto"`) is
stored on the `Payment` row; an optional `refundAddress` (crypto) and `orderNotes` are folded into
`orders.notes` — there's no dedicated column for either, since `notes` already exists for exactly
this kind of free-text info.

### Order lifecycle (fake payment provider)

```
POST /checkout/create-order
  → order created (status=awaiting_payment), inventory reserved
    (quantity_available -= qty, quantity_reserved += qty), cart cleared

POST /payments/{id}/capture {"outcome": "succeed"}
  → payment=captured, order=processing, reservation released
    (quantity_reserved -= qty; quantity_available stays consumed — a firm sale)

POST /payments/{id}/capture {"outcome": "fail"}
  → payment=failed, order=cancelled, reservation fully released
    (quantity_available += qty, quantity_reserved -= qty)

POST /orders/{id}/cancel        (only while pending/awaiting_payment)
  → order=cancelled, reservation released, same as a failed capture
```

There's no real payment gateway yet (Phase 7) — `app/integrations/payments/fake.py`'s
`FakePaymentProvider` implements the same `PaymentProvider` interface a real provider will, so
swapping one in later doesn't touch checkout/order logic. Its `capture` takes a caller-supplied
`outcome` standing in for what would be a signed webhook event from a real provider.

`POST /checkout/create-order` accepts an `Idempotency-Key` header — retrying with the same key
returns the original order instead of creating a duplicate (protects against a frozen UI + a
second click on "Pay"). Falls back to a server-generated key if the client doesn't send one.

## Run locally without Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # then edit DATABASE_URL/REDIS_URL to point at localhost, not the
                        # docker-compose service hostnames
alembic upgrade head
python -m app.seed.seed_catalog
fastapi dev app/main.py
```

## Migrations

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

- `0001_enable_extensions` — enables `pgcrypto`/`citext`.
- `0002_catalog_and_cart` — categories, products, product_variants, product_images, inventory,
  carts, cart_items.
- `0003_orders_and_payments` — orders, order_items, payments, and the `order_status`/
  `compliance_status`/`fulfillment_status`/`payment_status` enums.

## Seeding the catalog

```bash
python -m app.seed.seed_catalog
```

Migrates the data that used to live in the frontend's `src/data/products.ts` and
`euProducts.ts` (now deleted) into Postgres — 31 products across the USA and EU storefronts.
Idempotent: re-running skips any product slug that already exists, so it's safe to run again
after a partial failure. See `app/seed/data.py` for the category-assignment and inventory
notes.

## Tests

```bash
pip install -e ".[dev]"
pytest
```

`tests/conftest.py`'s `sample_product` fixture creates and tears down an isolated
product/variant/inventory row per test (random slug/SKU, `quantity_available=5`), independent of
the seeded catalog data — tests don't depend on `seed_catalog` having been run, and each test
function gets its own fresh copy (don't assume shared/cumulative inventory state across tests).
`test_ready_reports_dependency_checks` does need a reachable Postgres + Redis; run against
`docker compose` or the CI service containers.

`tests/test_orders.py` covers the full checkout/payment/cancel lifecycle: empty-cart rejection,
success (reserve → capture → processing), failure (capture fail → cancelled, full stock release),
pre-payment cancel, rejecting cancellation of an already-processing order, checkout-time stock
re-validation (distinct from cart's own check), idempotent replay on a repeated `Idempotency-Key`,
and session-scoped order listing/detail.

## Notes / known simplifications

- `POSTGRES_PASSWORD` in `backend/.env.example` is a **local-dev-only default**. Production must
  source credentials from a real secret manager — see `../docs/backend-spec.md`.
- `carts.user_id` and `orders.user_id` have no foreign key yet — the `users` table doesn't exist
  until Phase 2 (Auth). Guest carts/orders (by `session_id`) are the only kind that exist right now.
- No `addresses` table yet either — with no logged-in user to own a saved address, checkout takes
  the shipping address inline and snapshots it straight onto the order as JSONB.
- No `payment_events` webhook-idempotency ledger yet — not needed until Phase 7 wires up a real
  provider with real webhooks. The fake provider's capture is a direct authenticated call, not an
  external webhook, so there's nothing to dedupe.
- No refund flow — an order whose payment already captured can't be cancelled through
  `POST /orders/{id}/cancel` (`409 ORDER_NOT_CANCELLABLE`). Refunds are Phase 7 territory.
- CORS is wide open to any `http://localhost:<port>` origin (`app/core/config.py`'s
  `cors_allow_origin_regex`) so the Vite dev server's auto-picked port always works. Tighten this
  to explicit origins before production.
- Category assignment and inventory counts in `app/seed/data.py` are reconstructed from the old
  frontend's client-side keyword search and out-of-stock badges respectively — see the docstring
  at the top of that file for exactly how.
