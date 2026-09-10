# BTCPay Server — regtest → mainnet cutover runbook

**Audience:** whoever operates the RapidFinil BTCPay Server instance.
**Goal:** stop handing customers `bcrt1…` addresses and start settling real Bitcoin.

---

## 1. The problem this fixes

The local dev stack (`compose.btcpay-regtest.yaml`) runs BTCPay on **Bitcoin
regtest**, a private throwaway network. Every address it derives looks like:

```
bcrt1q…
```

Real wallets and exchanges reject that outright:

| Wallet / exchange | Error you'll see |
|---|---|
| Binance withdrawal | `Could not recognize URL` / `Invalid address` |
| Trust Wallet | `Invalid or unsupported prefix for Segwit address` |
| Anything using bech32 validation | `Expected bc, got bcrt` |

Bitcoin's bech32 prefix **is** the network: `bc` = mainnet, `tb` = testnet,
`bcrt` = regtest. You cannot edit `bcrt1…` into `bc1…` — the checksum won't
match and the money is gone. The fix is entirely server-side: put BTCPay,
NBXplorer, and Bitcoin Core on **mainnet**, connect a mainnet watch-only
wallet, and issue **new** invoices.

After the cutover a fresh invoice address will be one of:

```
bc1q…   (native SegWit — the default)
bc1p…   (Taproot)
3…      (wrapped SegWit)
1…      (legacy)
```

All four are valid mainnet destinations for Binance and Trust Wallet.

> **Do not reuse any existing `bcrt1…` invoice.** A regtest invoice does not
> become a mainnet invoice when the server is reconfigured. Cancel or abandon
> them and create new ones.

---

## 2. What the application code already does about this

`app/integrations/payments/btcpay.py` has a guard (`_check_address_network`):
when it fetches an invoice's on-chain address and the prefix is `bcrt1` / `tb1`,

- **`APP_ENV=production`** → it raises `BTCPayConfigurationError` and the
  checkout fails loudly. A misconfigured server can never silently hand a real
  customer a dead address.
- **any other `APP_ENV`** → it logs a warning and continues (regtest is the
  expected local setup).

So the first sign that this runbook is *done* is: with `APP_ENV=production`,
`POST /api/v1/checkout/create-order` for `paymentMethod: "crypto"` succeeds and
returns a `payment.cryptoAddress` starting with `bc1` / `3` / `1`.

The guard only covers the address the backend reads back. The manual checks in
§4 and §5 are still the authoritative verification.

---

## 3. Stand up a mainnet BTCPay Server

Pick **one** of the two options.

### Option A — `compose.btcpay-mainnet.yaml` (this repo)

The production counterpart of the regtest compose file. Same shape, every
network value set to `mainnet`, no hot wallet, pruned Bitcoin node.

**Prerequisites**

| | |
|---|---|
| Disk | ~50 GB with the default `prune=5000`. A full node (`prune=0`) is ~700 GB and only needed to import a wallet with pre-pruned-window history. |
| RAM | 4 GB+ on the host. |
| Time | Initial mainnet sync is ~1–3 days. Wallet/invoice features stay degraded until sync completes. |
| TLS | BTCPay binds to `127.0.0.1:23000`. Put a reverse proxy (Caddy / nginx / Cloudflare Tunnel) in front to terminate HTTPS on your domain. Never expose `:23000` directly. |

**Bring it up**

```bash
docker compose -f compose.yaml -f compose.btcpay-mainnet.yaml up -d

# watch the sync
docker exec btcpay-mainnet-bitcoind bitcoin-cli -rpcport=43782 \
  -rpcconnect=127.0.0.1 -datadir=/data getblockchaininfo
```

### Option B — the official installer (`btcpay-regtest/`)

Despite the directory name, `btcpay-regtest/` is the generic
`btcpayserver-docker` installer. It deploys a hardened instance with
Let's Encrypt built in and BTCPay owning the whole host. Use it if you don't
want to hand-manage a reverse proxy.

```bash
cd btcpay-regtest
export BTCPAY_HOST="btcpay.yourdomain.example"
export NBITCOIN_NETWORK="mainnet"
export BTCPAYGEN_CRYPTO1="btc"
export BTCPAYGEN_REVERSEPROXY="nginx"
export BTCPAY_ENABLE_SSH=false
. ./btcpay-setup.sh -i
```

If this host previously ran the installer on regtest/testnet:

```bash
grep NBITCOIN_NETWORK .env      # must print: export NBITCOIN_NETWORK="mainnet"
```

If it prints `regtest` or `testnet`, fix it and re-run `. ./btcpay-setup.sh -i`.
Changing the network on an installer deployment triggers a fresh chain sync.

### Managed / hosted BTCPay

A third-party hosted BTCPay (e.g. a shared instance) is also fine — just skip
to §4 and confirm its store is on mainnet. You still connect your **own**
watch-only wallet (§4.2); never let a hosted provider hold a spending key for
you.

---

## 4. Verify every layer is on mainnet

Run these after sync completes. If any layer disagrees, invoice monitoring and
address derivation break.

### 4.1 Bitcoin Core

```bash
docker exec btcpay-mainnet-bitcoind bitcoin-cli -rpcport=43782 \
  -rpcconnect=127.0.0.1 -datadir=/data getblockchaininfo
```

Expect:

```json
"chain": "main",
"initialblockdownload": false
```

Not `"regtest"`, not `"test"`. `initialblockdownload: true` means it's still
catching up — wait.

### 4.2 NBXplorer

`compose.btcpay-mainnet.yaml` sets `NBXPLORER_NETWORK: mainnet` and points it
at `bitcoind:8333`. Confirm it's tracking main:

```bash
docker logs btcpay-mainnet-nbxplorer 2>&1 | grep -i "network\|chain" | head
```

The BTCPay docs configure NBXplorer with a `mainnet` network value for mainnet
operation — see <https://docs.btcpayserver.org/NBXplorer/>.

### 4.3 BTCPay Server

In the admin UI: **Server Settings → Maintenance** (or the store's
**Settings → General**) shows the network. It must read **Mainnet**. Then:

1. Open `https://<your-btcpay-domain>`, create the admin account. Once created,
   set `BTCPAY_ALLOW-ADMIN-REGISTRATION` to `"false"` (or drop it) and
   `docker compose … up -d --force-recreate btcpayserver`.
2. Create a store. **Settings → General → Network → Mainnet.**

### 4.4 Connect a mainnet watch-only wallet

**Store → Settings → Wallets → Bitcoin → Connect an existing wallet.**

- Paste an **xpub / zpub exported from a wallet you control** (BlueWallet:
  *Wallet → ⋮ → Show Wallet XPUB*). Hardware wallets (Coldcard, Ledger,
  Trezor) and Sparrow / Electrum watch-only exports also work — see
  <https://docs.btcpayserver.org/WalletSetup/>.
- **Do not** choose *Generate a new wallet* on a mainnet store — that puts a
  spendable hot key on the server. BTCPay only needs to *watch* the chain and
  *derive* addresses; it never has to move funds.
- The export must come from a **mainnet** wallet. A regtest/testnet/signet
  export will reintroduce the wrong-prefix problem.
- Match the **script type** to the export: native SegWit → `bc1q…`,
  Taproot → `bc1p…`, wrapped SegWit → `3…`, legacy → `1…`. A mismatch imports
  the wrong derivation path and the store balance / incoming payments won't
  show up. BTCPay's hardware-wallet flow walks through choosing the address
  type and verifying a derived address — do that verification step.

The XPUB is not a secret in the "loss of funds" sense (watch-only), but a leak
exposes your whole address history — use a dedicated checkout account, not your
treasury wallet.

### 4.5 API key + webhook (same as regtest, mainnet store)

1. **Account → Manage Account → API Keys** → generate a Greenfield key scoped
   to the store, permissions: invoice create + read (+ refund if you use
   refunds).
2. **Store → Settings → Webhooks** → add the payload URL and subscribe to
   `InvoiceProcessing`, `InvoiceReceivedPayment`, `InvoiceSettled`,
   `InvoiceExpired`, `InvoiceInvalid`. Copy the webhook secret.
   - `compose.btcpay-mainnet.yaml` stack (BTCPay on the shared Docker net):
     `http://api:8000/api/v1/webhooks/payments/btcpay`
   - installer / hosted BTCPay (separate host):
     `https://<your-backend-domain>/api/v1/webhooks/payments/btcpay`

---

## 5. Wire this backend to the mainnet store

Set in `backend/.env` (gitignored — never commit real values):

```
APP_ENV=production
BTCPAY_BASE_URL=https://<your-btcpay-domain>      # or http://btcpayserver:49392 for the compose stack
BTCPAY_PUBLIC_URL=                                 # only if the browser-facing URL differs from BASE_URL
BTCPAY_STORE_ID=<store id from the store's settings/URL>
BTCPAY_API_KEY=<greenfield key from §4.5>
BTCPAY_WEBHOOK_SECRET=<webhook secret from §4.5>
```

Recreate the app containers so they reload `env_file` (a plain
`docker compose restart` does **not**):

```bash
docker compose up -d --force-recreate api worker
```

`get_payment_provider()` (`app/services/orders.py`) switches from
`FakePaymentProvider` to `BTCPayProvider` automatically once base URL + store
id + API key are all non-empty.

**Verification — the finish line:**

```bash
# create a small real crypto order through the storefront or the API, then:
docker logs rapidfinil-api 2>&1 | grep -i "non-mainnet"   # must print NOTHING
```

The returned `payment.cryptoAddress` must start with `bc1` / `3` / `1`. If
`APP_ENV=production` and the store is still on the wrong network, the checkout
returns a 500 and the log shows `BTCPay returned a non-mainnet Bitcoin
address` — go back to §4.

---

## 6. Customer payment flows (after cutover)

### Binance

Binance customers pay from **Withdraw**, not a QR wallet scanner:

1. Open the BTCPay invoice → select Bitcoin → copy the full address (or scan
   the QR).
2. Binance → **Withdraw** → **BTC**.
3. Paste the address. Network **must** be `Bitcoin / BTC` — **not** BEP20 /
   BNB Smart Chain, **not** ERC20, **not** Lightning.
4. Enter the invoice amount, review network + fee, submit.

**Fee gotcha:** Binance may deduct its withdrawal fee from the amount sent, so
BTCPay receives less than the invoice. Tell customers: *"If Binance deducts the
fee from the amount, increase the withdrawal so the recipient receives the full
invoice amount."* Check Binance's "recipient receives" figure before
submitting. Exact labels vary by region/account — verify on the final confirm
screen.

### Trust Wallet

1. Open the BTCPay invoice → select Bitcoin.
2. Trust Wallet → **Bitcoin / BTC** → **Send** (or the QR scanner).
3. Scan the QR or paste the address. Confirm Trust Wallet shows the asset as
   **Bitcoin** (not a similarly-named token on BNB/ETH).
4. Enter the invoice amount, review the network fee (added on top — the
   customer needs enough BTC for amount + fee), confirm.

Both sides must be Bitcoin **mainnet**. Trust Wallet's normal Bitcoin wallet
has no regtest support and will show an invalid-address error for `bcrt1…`.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `expected bc, got bcrt` | BTCPay is generating regtest addresses | §3–§4: put server/node/indexer on mainnet |
| Backend 500 + log `non-mainnet Bitcoin address` | `APP_ENV=production` against a non-mainnet store — the guard fired | §4: verify all three layers; then new invoice |
| Binance rejects the address | Regtest/testnet address, or truncated paste | New mainnet invoice, copy the **full** address |
| Trust Wallet "invalid address" | Regtest address or wrong asset selected | Fresh `bc1…` invoice, select BTC |
| Trust Wallet scans but shows wrong asset | Token/chain mismatch (BEP20/ERC20 "BTC") | Use native Bitcoin BTC |
| Payment sent, BTCPay doesn't detect it | Node/indexer not on mainnet, or NBXplorer still syncing | §4.1–§4.2; wait for `initialblockdownload: false` |
| BTCPay derives `bc1…` but store balance is 0 after payment | Wrong derivation path / script type on the connected xpub | Reconnect the wallet with the matching script type (§4.4) |
| Customer paid less than the invoice | Exchange deducted its withdrawal fee from the send amount | §6 Binance fee note — recipient must receive the full amount |
| Old invoice still shows `bcrt1…` | Invoice predates the cutover | Create a new invoice; never reuse old ones |

---

## 8. Go-live checklist

```
[ ] compose.btcpay-mainnet.yaml (or installer) up; bitcoind "chain": "main"
[ ] bitcoind "initialblockdownload": false  (sync complete)
[ ] NBXplorer NBXPLORER_NETWORK=mainnet, tracking the same node
[ ] BTCPay store Settings → General → Network = Mainnet
[ ] Wallet connected as WATCH-ONLY from a mainnet xpub/zpub (no hot key)
[ ] Wallet script type matches the export; a derived address was verified
[ ] Greenfield API key + webhook (5 invoice events) created; secret in backend/.env
[ ] backend/.env: APP_ENV=production + all 4 BTCPAY_* vars set
[ ] docker compose up -d --force-recreate api worker
[ ] Test crypto order: cryptoAddress starts with bc1 / 3 / 1
[ ] rapidfinil-api logs show no "non-mainnet Bitcoin address" warning
[ ] Small real payment (Binance or Trust Wallet) detected → order → processing
[ ] BTCPAY_ALLOW-ADMIN-REGISTRATION set to false / removed
[ ] All bcrt1… invoices cancelled/abandoned, not reused
```

---

## 9. Related

- `backend/README.md` → *Real payments: BTCPay Server + webhooks* — the code
  side (provider abstraction, webhook idempotency, confirmation policy).
- `compose.btcpay-regtest.yaml` — the local dev stack this replaces for
  production.
- `backend/app/scripts/replay_webhook.py` — replay a captured BTCPay webhook
  against the backend (Phase 11 tooling).
