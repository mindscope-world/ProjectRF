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

POST   /api/v1/webhooks/payments/btcpay             (BTCPay Server calls this, not the frontend)

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

  Fake provider (no BTCPay configured):
    POST /payments/{id}/capture {"outcome": "succeed"}
      → payment=captured, order=processing, reservation released
    POST /payments/{id}/capture {"outcome": "fail"}
      → payment=failed, order=cancelled, reservation fully released

  BTCPay provider (configured): settles via webhook, not a client call —
    InvoiceProcessing / InvoiceReceivedPayment / InvoiceSettled
      → payment=captured, order=processing, reservation released
        (whichever event arrives *first* — see "Settlement is decoupled
        from fulfillment" below; we do not wait for full confirmation)
    InvoiceExpired
      → payment=expired, order=cancelled, reservation fully released
    InvoiceInvalid
      → payment=failed, order=cancelled, reservation fully released

POST /payments/{id}/refund {"amount": ..., "reason": "..."}
  → creates a Refund row, payment=refunded|partially_refunded; full refund
    also sets order=refunded. Rejects (409) a payment that was never
    captured, and (400) an amount exceeding what's left to refund.

POST /orders/{id}/cancel        (only while pending/awaiting_payment)
  → order=cancelled, reservation released, same as a failed/expired payment
```

`app/integrations/payments/fake.py`'s `FakePaymentProvider` and
`app/integrations/payments/btcpay.py`'s `BTCPayProvider` both implement the same
`PaymentProvider` interface (`app/integrations/payments/base.py`) — checkout/order logic in
`app/services/orders.py` never touches a concrete provider directly.
`get_payment_provider()` picks BTCPay once `BTCPAY_BASE_URL`/`BTCPAY_STORE_ID`/`BTCPAY_API_KEY`
are all set, and falls back to the fake provider otherwise — so local dev, CI, and this repo's
tests never need real BTCPay credentials to exercise the checkout flow.

`POST /checkout/create-order` accepts an `Idempotency-Key` header — retrying with the same key
returns the original order instead of creating a duplicate (protects against a frozen UI + a
second click on "Pay"). Falls back to a server-generated key if the client doesn't send one.
The same key is also what a webhook replay/duplicate delivery gets checked against on the
*payment* side — see "Webhook idempotency" below.

## Real payments: BTCPay Server + webhooks

Real payment settlement is Bitcoin-only, via a **self-hosted BTCPay Server instance you control**
— not a custodial processor. Two customer-facing payment methods both end up funding the same
BTCPay-derived, watch-only wallet:

- **Cryptocurrency** — the customer pays a BTCPay-hosted invoice directly from their own wallet.
- **Apple Pay / Amazon Pay / cash app / Zelle / Credit Card Payment Link** — once
  [Ramp Network](#card-to-bitcoin-via-ramp-network) is also configured, this becomes "pay by
  card, merchant receives BTC" via Ramp's on-ramp widget, targeting the *same* invoice's address.
  Until Ramp is configured, `checkoutMode` comes back `"none"` for this method and the app falls
  back to the fake/manual flow (a human sends a payment link by email, same as before Phase 7).

### BTCPay Server setup (one-time, done in BTCPay's own admin UI — not this app's code)

1. **Wallet**: in BlueWallet, open the wallet you want checkout funds to land in → **⋮ → Show
   Wallet XPUB** → copy the string. (Any wallet app that exports a standard XPUB/ZPUB works —
   BlueWallet is just the one with the clearest menu for it.) Consider a dedicated checkout
   sub-wallet, separate from a main treasury — a leaked XPUB only exposes address history, never
   funds (watch-only), but containment is still good hygiene.
2. **Deploy BTCPay Server** — self-hosted (a VPS; full node sync takes 1–3 days) or a managed/
   hosted instance to start faster. Start on **testnet** first (Store Settings → General →
   Network) and only point production traffic at mainnet once a full webhook round-trip has been
   verified end-to-end on testnet. For the regtest→mainnet cutover (the fix for customers getting
   `bcrt1…` addresses that Binance / Trust Wallet reject), follow
   [`docs/btcpay-mainnet-runbook.md`](../docs/btcpay-mainnet-runbook.md) — it has a ready
   mainnet stack (`compose.btcpay-mainnet.yaml`), per-layer verification, and the customer
   payment flows.
3. **Connect the wallet**: Store Settings → Wallets → Bitcoin → *Connect an existing wallet* →
   paste the XPUB/ZPUB → confirm script type (native SegWit is standard). This is the entire
   "give BTCPay a wallet" step — the private key never leaves BlueWallet.
4. **API key**: Account → Manage Account → API Keys → generate a Greenfield API key scoped to
   the store, with invoice create/read (and refund, if refunds are needed) permissions.
5. **Webhook**: Store Settings → Webhooks → add `https://<your-backend>/api/v1/webhooks/payments/btcpay`,
   subscribe to at least `InvoiceProcessing`, `InvoiceReceivedPayment`, `InvoiceSettled`,
   `InvoiceExpired`, `InvoiceInvalid` — copy the generated webhook secret.
6. Set these in `backend/.env` (never commit real values — `backend/.env` is gitignored):
   ```
   BTCPAY_BASE_URL=https://your-btcpay-instance.example
   BTCPAY_STORE_ID=<store id from the store's URL/settings>
   BTCPAY_API_KEY=<greenfield API key from step 4>
   BTCPAY_WEBHOOK_SECRET=<webhook secret from step 5>
   ```
   Recreate the API container so it picks up the new env vars — a plain `docker compose restart
   api` does **not** reload `env_file`:
   ```
   docker compose up -d --force-recreate api worker
   ```
   `get_payment_provider()` picks up BTCPay automatically once base URL / store id / API key are
   all non-empty.

   If the origin the backend calls BTCPay on isn't reachable from the customer's browser (see the
   regtest setup below, where the backend uses an internal Docker hostname), also set
   `BTCPAY_PUBLIC_URL` to the origin the browser *can* reach — the checkout link's host gets
   rewritten to it. Leave it blank when `BTCPAY_BASE_URL` is already public.

### Local regtest BTCPay for dev/testing (no real Bitcoin, no VPS)

`compose.btcpay-regtest.yaml` (repo root) runs a throwaway BTCPay Server + NBXplorer + bitcoind
(regtest network) + its own Postgres as plain containers on the same `rapidfinil_default` network
— no root access or system changes, unlike the official installer vendored in `btcpay-regtest/`
(that one is for deploying a real production instance on a VPS).

```
docker compose -f compose.yaml -f compose.btcpay-regtest.yaml up -d
```

Then, one-time, in a browser at `http://localhost:23000`: register an admin account, create a
store, generate a hot wallet (Settings → Wallets → Bitcoin → Generate a new wallet), create a
Greenfield API key, and add a webhook with payload URL `http://api:8000/api/v1/webhooks/payments/btcpay`
(the `api` container's address on the shared network). Put the resulting values in `backend/.env`:

```
BTCPAY_BASE_URL=http://btcpayserver:49392
BTCPAY_PUBLIC_URL=http://localhost:23000
BTCPAY_STORE_ID=<from the store's settings page>
BTCPAY_API_KEY=<from the API key you generated>
BTCPAY_WEBHOOK_SECRET=<from the webhook you created>
```

To pay a test invoice, send its BTC address regtest coins from bitcoind's built-in wallet, then
mine a block to confirm it:

```
docker exec btcpay-regtest-bitcoind bitcoin-cli -regtest -rpcport=43782 -rpcconnect=127.0.0.1 \
  -datadir=/data -rpcwallet=default sendtoaddress <invoice BTC address> <amount>
docker exec btcpay-regtest-bitcoind bitcoin-cli -regtest -rpcport=43782 -rpcconnect=127.0.0.1 \
  -datadir=/data generatetoaddress 1 $(docker exec btcpay-regtest-bitcoind bitcoin-cli \
  -regtest -rpcport=43782 -rpcconnect=127.0.0.1 -datadir=/data -rpcwallet=default getnewaddress)
```

BTCPay delivers its webhook within a few seconds of the confirmation, and the order moves from
`awaiting_payment` to `processing` with the payment marked `captured`.

### Mainnet BTCPay (going live)

A regtest instance derives `bcrt1…` addresses; testnet derives `tb1…`. Real wallets and
exchanges reject both (`expected bc, got bcrt`). Only a **mainnet** node + NBXplorer + BTCPay
produce spendable `bc1…` / `3…` / `1…` addresses. The full procedure — a mainnet
`compose.btcpay-mainnet.yaml` stack (or the official installer in `btcpay-regtest/`),
connecting a **watch-only** mainnet wallet from an xpub, per-layer verification, and the
Binance / Trust Wallet payer flows — is in
[`docs/btcpay-mainnet-runbook.md`](../docs/btcpay-mainnet-runbook.md).

Guardrail: `BTCPayProvider.create_payment_session` checks the derived address's network. With
`APP_ENV=production` a `bcrt1…` / `tb1…` address raises `BTCPayConfigurationError` and fails the
checkout (whole transaction rolls back — no phantom order) rather than handing a real customer a
dead address; outside production it's a logged warning, since regtest is the expected dev setup.

### Card-to-Bitcoin via Ramp Network

For the card_link payment method to actually collect a card payment and still settle in BTC,
add [Ramp Network](https://ramp.network) as an on-ramp widget pointed at the same BTCPay invoice
address — BTCPay itself is unaware of Ramp; it just sees a payment arrive at a watched address.

1. Register on the Ramp developer dashboard, get a **host API key**. Staging/sandbox works
   without business verification; production (real card payments) requires KYB approval —
   budget a few days to a couple of weeks for that.
2. Configure Ramp's own webhook (transaction status events) in their dashboard if you want a
   second signal independent of BTCPay's — not required for this app to function, since BTCPay's
   webhook is the one this backend actually acts on (see "Confirmation & fulfillment policy"
   below for why BTCPay, not Ramp, is the authoritative signal).
3. Set `VITE_RAMP_HOST_API_KEY` in the frontend's `.env` (repo root, not `backend/`).

With both BTCPay and Ramp configured, `POST /checkout/create-order` for `paymentMethod:
"card_link"` returns `payment.checkoutMode: "ramp"` plus `payment.cryptoAddress` — the invoice's
on-chain address BTCPay derived from the XPUB — and `CheckoutPage.tsx` opens
`https://app.ramp.network/?hostApiKey=...&swapAsset=BTC&userAddress=<cryptoAddress>&fiatValue=...`
per Ramp's widget contract. If only BTCPay is configured (no Ramp key on the frontend), checkout
falls back to showing the raw address for a manual wallet-to-wallet payment rather than pretending
a card flow exists.

**What's needed to make this "live"**, since none of it can be provisioned or tested from inside
this repo: a deployed BTCPay Server instance, its store's API key and webhook secret, an XPUB
exported from a wallet you control, and (for the card rail) a Ramp developer account and host API
key. All of these are credentials/infrastructure only the store operator can supply — see the
`backend/.env` and root `.env` variables above once you have them.

### Confirmation & fulfillment policy (settlement decoupled from fulfillment)

`handle_payment_webhook_event` (`app/services/orders.py`) fulfills the order — captures the
payment, reserves inventory into a firm sale — on the **first** `InvoiceProcessing` /
`InvoiceReceivedPayment` / `InvoiceSettled` event it sees, whichever arrives first. It does **not**
wait for full confirmations: an unconfirmed (0-conf) or single-confirmation payment is enough to
ship a typical order. A later `InvoiceSettled` for an already-captured payment is recorded (for
audit) but doesn't re-trigger anything — fulfillment already happened.

This is a deliberate choice, not an oversight: BTCPay's own invoice "speed policy" (Store
Settings → General) already encodes how many confirmations *it* considers the invoice settled at,
and if your risk tolerance requires waiting for more confirmations before physically shipping a
given order, configure that in BTCPay's speed policy rather than adding blocking logic here — the
point of Phase 8 is that this backend's order-fulfillment path never blocks on chain confirmation
by default; if you want stricter confirmation requirements for high-value orders, we recommend
gating those manually (flag for review) rather than making the whole checkout path wait on-chain,
since that would stall ordinary low-value orders unnecessarily.

### Webhook idempotency

Every BTCPay webhook delivery is inserted into `payment_events` keyed by a unique
`provider_event_id` (BTCPay's `deliveryId`, falling back to `invoiceId:type:timestamp` if that's
ever missing) *before* being acted on. A duplicate delivery — providers retry on anything but a
clean `2xx`, so this is expected, not a bug when it happens — fails to insert (unique constraint)
and is treated as already-handled, not reprocessed. This is enforced at the database level (an
`IntegrityError` on a racing concurrent insert), not a Python check-then-insert, so two
simultaneous deliveries of the same event can't both slip through.

Signature verification (`BTCPayProvider.verify_webhook`) happens before any of this: BTCPay signs
the raw request body as `BTCPay-Sig: sha256=<hmac>` using the per-webhook secret; a missing or
invalid signature is rejected with `401` before the payload is even parsed as JSON.

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
`btcpay_configured` fixture (`tests/conftest.py`) — fake-but-valid-shaped BTCPay credentials plus
an `httpx.MockTransport` standing in for BTCPay's Greenfield API, so these run with **no live
BTCPay Server or network access required**: signature verification (missing/invalid → 401),
success (`InvoiceReceivedPayment`), failure (`InvoiceInvalid`), expiry (`InvoiceExpired`),
duplicate-delivery idempotency (checked at the `payment_events` row level, not just via side
effects — the state guard alone would mask a dedup failure), a late `InvoiceSettled` after
already-fulfilled being a no-op (Phase 8's decoupling), and refunds (fake provider, BTCPay
provider, partial refund, rejecting an uncaptured payment, rejecting over-remaining-amount).

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
  received BTCPay event (by `provider_event_id`, or the most recent one) to this app's own webhook
  endpoint, correctly re-signed, and checks that `payment_events` doesn't grow a duplicate row:
  ```
  docker compose exec api python -m app.scripts.replay_webhook
  ```
  **Actually run** against a real captured event from the regtest BTCPay flow above: replay
  returned `200`, no duplicate row was created — the unique `provider_event_id` constraint plus
  the `IntegrityError` catch in `handle_payment_webhook_event` works as designed.

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
- `BTCPayProvider.refund`'s exact Greenfield API request body has varied across BTCPay Server
  versions — it's been exercised against a live BTCPay Server 2.4.4 instance (see the regtest
  setup below) and works there, but re-verify against `/swagger` before relying on it against a
  different version in production. A refund creates a BTCPay "pull payment" the customer claims —
  there's no way to push funds automatically without the store operator holding a spending key,
  which is exactly what this architecture avoids.
- `BTCPayProvider.create_payment_session`'s on-chain-address lookup originally checked for fields
  (`paymentMethod`, `cryptoCode`) that don't exist in BTCPay's actual response — confirmed against
  a live instance the field is `paymentMethodId` (e.g. `"BTC-CHAIN"`). Fixed, but a reminder that
  anything in this integration guessed from docs rather than a live server deserves the same
  skepticism until it's actually been exercised.
- An order whose payment already captured can't be cancelled through `POST /orders/{id}/cancel`
  (`409 ORDER_NOT_CANCELLABLE`) — use `POST /payments/{id}/refund` instead.
- No reconciliation job yet: webhooks are at-least-once, not guaranteed-once delivery. A production
  deployment should add a periodic job cross-checking BTCPay's invoice list against local orders to
  catch any webhook that never arrived (network blips happen) — not implemented here.
- CORS is wide open to any `http://localhost:<port>` origin (`app/core/config.py`'s
  `cors_allow_origin_regex`) so the Vite dev server's auto-picked port always works. Tighten this
  to explicit origins before production.
- Inventory counts in `app/seed/data.py` are a flat placeholder (250 units, or 0 for anything
  badged out-of-stock) rather than a real stock take — see the docstring at the top of that file.
