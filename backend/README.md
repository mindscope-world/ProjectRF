# Brimline Backend — Phases 1, 3, 4, 5, 7, 8 (Infrastructure, Catalog, Cart, Orders, Real Payments, Crypto Settlement)

FastAPI service for the Brimline wholesale headwear commerce backend. Covers infrastructure (Docker
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
POST   /api/v1/payments/{payment_id}/capture        { outcome: "succeed" | "fail" }  (fake provider only)
POST   /api/v1/payments/{payment_id}/refund         { amount, reason? }
GET    /api/v1/orders
GET    /api/v1/orders/{order_id}
POST   /api/v1/orders/{order_id}/cancel

GET    /api/v1/webhooks/payments/blockonomics       (Blockonomics calls this, not the frontend)

GET    /api/v1/admin/products?region=&status=&search=&limit=&offset=
GET    /api/v1/admin/products/{product_id}
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/{product_id}
PATCH  /api/v1/admin/products/variants/{variant_id}/inventory   { quantityAvailable, reason? }
GET    /api/v1/admin/orders?status=&fulfillmentStatus=&search=&limit=&offset=
GET    /api/v1/admin/orders/{order_id}
PATCH  /api/v1/admin/orders/{order_id}                          { fulfillmentStatus?, trackingNumber?, carrier?, notes? }
GET    /api/v1/admin/compliance/reviews
POST   /api/v1/admin/compliance/reviews/{order_id}/approve      { reason? }
POST   /api/v1/admin/compliance/reviews/{order_id}/reject       { reason? }
GET    /api/v1/admin/refunds
POST   /api/v1/admin/refunds                                    { paymentId, amount, reason? }
GET    /api/v1/admin/checkouts?provider=&status=&limit=&offset=
GET    /api/v1/admin/audit-logs?entityType=&limit=&offset=
```

Every `/admin/*` route requires an `X-Admin-Token` header matching `ADMIN_API_KEY` — see "Phase 10:
admin panel" below.

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

### Order lifecycle

```
POST /checkout/create-order
  → order created (status=awaiting_payment), inventory reserved
    (quantity_available -= qty, quantity_reserved += qty), cart cleared

  Fake provider (no Blockonomics configured):
    POST /payments/{id}/capture {"outcome": "succeed"}
      → payment=captured, order=processing, reservation released
    POST /payments/{id}/capture {"outcome": "fail"}
      → payment=failed, order=cancelled, reservation fully released

  Blockonomics provider (configured): settles via callback, not a client call —
    a "payment.received" callback (any confirmation status: 0/1/2+)
      → payment=captured, order=processing, reservation released
        (whichever delivery arrives *first* — see "Settlement is decoupled
        from fulfillment" below; we do not wait for full confirmation)

POST /payments/{id}/refund {"amount": ..., "reason": "..."}
  → creates a Refund row, payment=refunded|partially_refunded; full refund
    also sets order=refunded. Rejects (409) a payment that was never
    captured, and (400) an amount exceeding what's left to refund.

POST /orders/{id}/cancel        (only while pending/awaiting_payment)
  → order=cancelled, reservation released, same as a failed/expired payment
```

`app/integrations/payments/fake.py`'s `FakePaymentProvider` and
`app/integrations/payments/blockonomics.py`'s `BlockonomicsProvider` both implement the same
`PaymentProvider` interface (`app/integrations/payments/base.py`) — checkout/order logic in
`app/services/orders.py` never touches a concrete provider directly.
`get_payment_provider()` picks Blockonomics once `BLOCKONOMICS_API_KEY` is set, and falls back to
the fake provider otherwise — so local dev, CI, and this repo's tests never need a real
Blockonomics account to exercise the checkout flow.

`POST /checkout/create-order` accepts an `Idempotency-Key` header — retrying with the same key
returns the original order instead of creating a duplicate (protects against a frozen UI + a
second click on "Pay"). Falls back to a server-generated key if the client doesn't send one.
The same key is also what a webhook replay/duplicate delivery gets checked against on the
*payment* side — see "Webhook idempotency" below.

## Real payments: Blockonomics + callbacks

Real payment settlement is Bitcoin-only, via **Blockonomics** (https://www.blockonomics.co) — a
non-custodial address-generation service, not a hosted checkout/invoice gateway. It never holds
funds: each order gets a fresh receive address derived from a wallet *you* control (an XPUB you
connect, watch-only), and Blockonomics just watches the chain and calls back when something
arrives. Two customer-facing payment methods both end up funding the same watched wallet:

- **Cryptocurrency** — the customer sends BTC directly to the address the storefront shows them
  (`CheckoutPage.tsx`'s `manualCryptoPayment` view — there's no hosted checkout page to redirect
  to).
- **Apple Pay / Amazon Pay / cash app / Zelle / Credit Card Payment Link** — once
  [Ramp Network](#card-to-bitcoin-via-ramp-network) is also configured, this becomes "pay by
  card, merchant receives BTC" via Ramp's on-ramp widget, targeting the *same* address. Until
  Ramp is configured, `checkoutMode` comes back `"none"` for this method and the app falls back
  to the fake/manual flow (a human sends a payment link by email, same as before Phase 7).

### Blockonomics setup (one-time, done in Blockonomics' own dashboard — not this app's code)

1. **Wallet**: in BlueWallet, open the wallet you want checkout funds to land in → **⋮ → Show
   Wallet XPUB** → copy the string. (Any wallet app that exports a standard XPUB/ZPUB works —
   BlueWallet is just the one with the clearest menu for it.) Consider a dedicated checkout
   sub-wallet, separate from a main treasury — a leaked XPUB only exposes address history, never
   funds (watch-only), but containment is still good hygiene.
2. **Add the wallet**: Blockonomics dashboard → Wallets → add a BTC wallet → paste the XPUB/ZPUB.
3. **Create a store**: dashboard → Stores → new store → enable crypto → attach the wallet from
   step 2 → set the callback URL to `https://<your-backend>/api/v1/webhooks/payments/blockonomics`
   → set a **Secret** (any random string you choose — this is `BLOCKONOMICS_CALLBACK_SECRET`
   below, not something Blockonomics generates for you).
4. **API key**: dashboard → Merchants → API → copy the key (`BLOCKONOMICS_API_KEY` below).
5. Set these in `backend/.env` (never commit real values — `backend/.env` is gitignored):
   ```
   BLOCKONOMICS_API_KEY=<API key from step 4>
   BLOCKONOMICS_CALLBACK_SECRET=<the same secret you set on the store's callback URL in step 3>
   ```
   Recreate the API container so it picks up the new env vars — a plain `docker compose restart
   api` does **not** reload `env_file`:
   ```
   docker compose up -d --force-recreate api worker
   ```
   `get_payment_provider()` picks up Blockonomics automatically once the API key is non-empty.

### Testing without spending real Bitcoin

Blockonomics has no separate regtest/testnet stack to run locally — instead, toggle **Testmode**
on for the store (dashboard → Stores → your store → Payment method). Test-mode orders get a test
address, and the dashboard's Log/Test Bench lets you "send" a chosen BTC amount to it, which fires
the same callback shape at `BLOCKONOMICS_API_KEY`'s configured URL with a realistic status
progression (unconfirmed → 1 confirmation → fully confirmed) — see
https://developers.blockonomics.co/docs/guides/testing. **Never send real BTC to a test-mode
address — it's not recoverable.** Turn Testmode back off before going live.

`app/scripts/replay_webhook.py` re-delivers a previously received callback (by
`provider_event_id`, or the most recent one) to this app's own webhook endpoint, to verify
duplicate deliveries are handled safely without needing a fresh Blockonomics callback each time:

```
docker compose exec api python -m app.scripts.replay_webhook
```

### Card-to-Bitcoin via Ramp Network

For the card_link payment method to actually collect a card payment and still settle in BTC,
add [Ramp Network](https://ramp.network) as an on-ramp widget pointed at the same
Blockonomics-derived address — Blockonomics itself is unaware of Ramp; it just sees a payment
arrive at a watched address.

1. Register on the Ramp developer dashboard, get a **host API key**. Staging/sandbox works
   without business verification; production (real card payments) requires KYB approval —
   budget a few days to a couple of weeks for that.
2. Configure Ramp's own webhook (transaction status events) in their dashboard if you want a
   second signal independent of Blockonomics' — not required for this app to function, since
   Blockonomics' callback is the one this backend actually acts on (see "Confirmation &
   fulfillment policy" below for why Blockonomics, not Ramp, is the authoritative signal).
3. Set `VITE_RAMP_HOST_API_KEY` in the frontend's `.env` (repo root, not `backend/`).

With both Blockonomics and Ramp configured, `POST /checkout/create-order` for `paymentMethod:
"card_link"` returns `payment.checkoutMode: "ramp"` plus `payment.cryptoAddress` — the address
Blockonomics derived from the XPUB — and `CheckoutPage.tsx` opens
`https://app.ramp.network/?hostApiKey=...&swapAsset=BTC&userAddress=<cryptoAddress>&fiatValue=...`
per Ramp's widget contract. If only Blockonomics is configured (no Ramp key on the frontend),
checkout falls back to showing the raw address for a manual wallet-to-wallet payment rather than
pretending a card flow exists.

**What's needed to make this "live"**, since none of it can be provisioned or tested from inside
this repo: a Blockonomics account with its API key and a store callback secret, an XPUB exported
from a wallet you control, and (for the card rail) a Ramp developer account and host API key. All
of these are credentials/infrastructure only the store operator can supply — see the
`backend/.env` and root `.env` variables above once you have them.

### Confirmation & fulfillment policy (settlement decoupled from fulfillment)

`handle_payment_webhook_event` (`app/services/orders.py`) fulfills the order — captures the
payment, reserves inventory into a firm sale — on the **first** `payment.received` callback it
sees for a known address, whichever confirmation status (0/1/2+) that happens to arrive at. It
does **not** wait for full confirmations: an unconfirmed (0-conf) or single-confirmation payment
is enough to ship a typical order. A later, higher-confirmation callback for an
already-captured payment is recorded (for audit) but doesn't re-trigger anything — fulfillment
already happened.

This is a deliberate choice, not an oversight, matching the same policy the previous BTCPay
integration used — if your risk tolerance requires waiting for more confirmations before
physically shipping a given order, we recommend gating those manually (flag for review) rather
than making the whole checkout path wait on-chain, since that would stall ordinary low-value
orders unnecessarily.

**Known limitation**: a bare Blockonomics address has no fixed expected amount the way a hosted
invoice does, and a callback's `value` is the amount of *that one transaction*, not a running
balance — under/over-payment and split payments aren't reconciled here. Every callback for a
known address is treated as "this order is paid." The raw `value` is still recorded on the
`payment_events` row (`payload.value`, in satoshis) for manual reconciliation if that's ever
needed.

### Webhook idempotency

Every Blockonomics callback is inserted into `payment_events` keyed by a unique
`provider_event_id` (`{txid}:{status}:{addr}` — Blockonomics itself guarantees this combination
is delivered at most once per payment/confirmation-stage) *before* being acted on. A duplicate
delivery fails to insert (unique constraint) and is treated as already-handled, not reprocessed.
This is enforced at the database level (an `IntegrityError` on a racing concurrent insert), not a
Python check-then-insert, so two simultaneous deliveries of the same event can't both slip
through.

Signature verification (`BlockonomicsProvider.verify_webhook`) happens before any of this —
Blockonomics callbacks carry no HMAC, just a shared `secret` query param configured once on the
store's callback URL; a missing or wrong secret is rejected with `401`.

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
- `0004_payment_events_and_refunds` — payment_events (webhook idempotency ledger), refunds,
  `payment_status` gains `'expired'`, `payments` gains `checkout_url`/`crypto_address`.

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

`tests/test_webhooks.py` and `tests/test_refunds.py` cover real-payment behavior using the
`blockonomics_configured` fixture (`tests/conftest.py`) — fake-but-valid-shaped Blockonomics
credentials plus an `httpx.MockTransport` standing in for Blockonomics' API, so these run with
**no live Blockonomics account or network access required**: secret verification (missing/wrong →
401/422), success (a `payment.received` callback), duplicate-delivery idempotency (checked at the
`payment_events` row level, not just via side effects — the state guard alone would mask a dedup
failure), a later higher-confirmation callback after already-fulfilled being a no-op (Phase 8's
decoupling), and refunds (fake provider, Blockonomics provider — always
`requires_manual_action` since it has no refund API, partial refund, rejecting an uncaptured
payment, rejecting over-remaining-amount).

**Event loop note**: `app/core/database.py`'s async engine/connection pool is a module-level
singleton, created once at import time — its pooled connections are bound to whichever event
loop was running when they were opened. pytest-asyncio's *default* per-test event loop breaks
this (second test onward fails with `asyncpg`'s "attached to a different loop"), so
`pyproject.toml` sets `asyncio_default_fixture_loop_scope = "session"` and
`asyncio_default_test_loop_scope = "session"` to keep one event loop for the whole run. If you
add a test that needs true event-loop isolation from the others, it'll need its own engine
instance rather than fighting this setting.

## Phase 10: admin panel

`/api/v1/admin/*` (see "API surface" above) covers products, orders, the compliance queue,
refunds, checkouts, and audit logs. It's gated by a single shared secret, not real user
accounts/roles — `ADMIN_API_KEY` in `backend/.env`, sent as `X-Admin-Token` on every request
(`require_admin` in `app/api/v1/deps.py`, fails closed with `503` if unset rather than treating a
blank key as "no auth needed"). This is a deliberate stand-in for Phase 2's RBAC design (which
needs a `users`/`roles` table that doesn't exist), not an oversight — revisit once Phase 2 lands.

Every mutation (`POST`/`PATCH`) writes an `audit_logs` row in the same transaction as the change
it's logging, so an entry can never exist without the write actually happening or vice versa.
`actor` is currently always `"admin"` (there's no per-operator identity behind the shared secret)
but is its own column so a real identity slots in later without a migration.

The admin UI lives at `/admin` in the same Vite app (`src/admin/`) — `src/main.tsx` branches on
`window.location.pathname` rather than pulling in a router, matching the storefront's own
router-free, state-machine-driven design (`src/App.tsx`).

Fulfillment tracking is deliberately minimal: `orders.tracking_number`/`carrier` columns, set via
`PATCH /admin/orders/{id}`, rather than a real shipments subsystem (Phase 9 — carriers, rate
shopping, label purchase — was never built).

## Phase 11: production hardening

Delivered as runnable tooling, not a one-off executed drill against infrastructure that doesn't
exist yet — except backup/restore and webhook replay, which *were* run for real against the dev
stack (see below).

- **Load testing** — `backend/loadtest/checkout.js`, a [k6](https://k6.io) script simulating
  browse → add-to-cart → checkout per virtual user:
  ```
  BASE_URL=http://localhost:8000/api/v1 k6 run backend/loadtest/checkout.js
  k6 run --vus 50 --duration 2m backend/loadtest/checkout.js   # heavier run
  ```
  The default profile (`options` in the script) is smoke-test-sized — proving the script and API
  work together, not a capacity test. Requires installing k6 separately; not run as part of this
  phase (no target environment to size for yet).

- **Dependency scanning** — `.github/workflows/dependency-scan.yml` runs `pip-audit` (backend) and
  `npm audit --audit-level=high` (frontend) on every push/PR to `main` and every Monday (new CVEs
  land in existing, unchanged dependencies too). `pip-audit` runs against a frozen `pip freeze`
  list with this project's own unpublished package filtered out — auditing the live environment
  directly makes it try to look up `rapidfinil-backend` on PyPI and fail on nothing. Both scanners
  were run manually against current dependencies while building this: clean.

- **Backup/restore** — `scripts/backup-db.sh [dir]` (`pg_dump --format=custom`) and
  `scripts/restore-db.sh <dump-file>` (`pg_restore --clean --if-exists`, confirms before running —
  it drops and recreates every table). **Actually run** against the dev database as a real
  round-trip: 106 orders before backup, 106 after restore.

- **Webhook replay testing** — `backend/app/scripts/replay_webhook.py` re-delivers a previously
  received Blockonomics callback (by `provider_event_id`, or the most recent one) to this app's
  own webhook endpoint, with the correct callback secret, and checks that `payment_events` doesn't
  grow a duplicate row:
  ```
  docker compose exec api python -m app.scripts.replay_webhook
  ```

- **Not done**: access-control testing (no automated check that a customer session is refused at
  `/admin/*` — `require_admin`'s own gate is covered by `test_admin_requires_a_valid_token`, but
  nothing tests the cart/order endpoints' session-scoping under adversarial conditions beyond what
  Phase 4/5's tests already cover) and the PPB compliance review — moot now that the storefront
  sells headwear, not pharmaceuticals.

## Notes / known simplifications

- `POSTGRES_PASSWORD` in `backend/.env.example` is a **local-dev-only default**. Production must
  source credentials from a real secret manager — see `../docs/backend-spec.md`.
- `carts.user_id` and `orders.user_id` have no foreign key yet — the `users` table doesn't exist
  until Phase 2 (Auth). Guest carts/orders (by `session_id`) are the only kind that exist right now.
- No `addresses` table yet either — with no logged-in user to own a saved address, checkout takes
  the shipping address inline and snapshots it straight onto the order as JSONB.
- `BlockonomicsProvider.refund` has no real API to call — Blockonomics exposes no refund
  endpoint (it's non-custodial; funds land straight in the merchant's own wallet), so it just
  returns a fixed `requires_manual_action` status and a human has to send the refund by hand from
  the connected wallet.
- `BlockonomicsProvider` doesn't verify amount paid against the order total (see "Known
  limitation" under "Confirmation & fulfillment policy" above) — a genuine gap versus a hosted
  invoice provider, worth tightening (store the expected BTC amount at checkout time, compare
  against the callback's `value`) before relying on this for orders where under-payment risk
  matters.
- An order whose payment already captured can't be cancelled through `POST /orders/{id}/cancel`
  (`409 ORDER_NOT_CANCELLABLE`) — use `POST /payments/{id}/refund` instead.
- No reconciliation job yet: callbacks are at-least-once, not guaranteed-once delivery, and a
  customer's wallet/exchange call could simply fail to send at all. A production deployment
  should add a periodic job cross-checking Blockonomics' `/searchhistory` against local orders to
  catch any callback that never arrived (network blips happen) — not implemented here.
- CORS is wide open to any `http://localhost:<port>` origin (`app/core/config.py`'s
  `cors_allow_origin_regex`) so the Vite dev server's auto-picked port always works. Tighten this
  to explicit origins before production.
- Inventory counts in `app/seed/data.py` are a flat placeholder (250 units, or 0 for anything
  badged out-of-stock) rather than a real stock take — see the docstring at the top of that file.
