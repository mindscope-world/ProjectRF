# RapidFinil — Backend Engineering Specification (Reference Appendix)

This is the detailed technical reference for [`workplan.md`](../workplan.md) — full schema DDL, Docker setup, and API detail for whoever implements each phase. Read `workplan.md` first for the phased plan and rationale; this document is the copy-pasteable detail.

**Backend:** FastAPI + Python · **Database:** PostgreSQL 18 · **Cache/queue:** Redis · **ORM:** SQLAlchemy 2.x · **Migrations:** Alembic · **Containerization:** Docker Compose · **API:** REST/JSON · **Auth:** JWT + refresh-token rotation · **Payments:** PCI-compliant provider · **Crypto:** provider/custodian settlement adapter · **Object storage:** S3-compatible private bucket

---

## 1. System architecture

```
                         INTERNET
                            │
                            ▼
                    ┌───────────────┐
                    │ Cloudflare/WAF│
                    └───────┬───────┘
                            │ HTTPS
                            ▼
                    ┌───────────────┐
                    │     Nginx     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    FastAPI    │
                    │      API      │
                    └───────┬───────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
 ┌──────────┐        ┌───────────┐        ┌───────────┐
 │PostgreSQL│        │   Redis   │        │ S3/R2     │
 │          │        │           │        │ Documents │
 └──────────┘        └─────┬─────┘        └───────────┘
                           │
                           ▼
                     ┌───────────┐
                     │  Worker   │
                     │  Celery   │
                     └─────┬─────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    Payment Provider   Email/SMS       Shipping API
          │
          ▼
    Payment Settlement
          │
          ▼
    Approved Crypto/Stablecoin Settlement
          │
          ▼
    Merchant Wallet/Custodian
```

Modular monolith, not microservices, at launch scale:

```
FastAPI
 ├── auth
 ├── catalog
 ├── cart
 ├── orders
 ├── compliance
 ├── payments
 ├── inventory
 ├── shipping
 └── admin
```

---

## 2. PostgreSQL extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
```

## 3. Enums

```sql
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'disabled');

CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive', 'archived');

CREATE TYPE order_status AS ENUM (
    'pending', 'awaiting_payment', 'payment_received', 'compliance_review',
    'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

CREATE TYPE payment_status AS ENUM (
    'created', 'pending', 'requires_action', 'authorized', 'captured',
    'failed', 'cancelled', 'refunded', 'partially_refunded'
);

CREATE TYPE compliance_status AS ENUM (
    'not_required', 'pending', 'under_review', 'approved', 'rejected', 'expired'
);

CREATE TYPE fulfillment_status AS ENUM (
    'pending', 'processing', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'
);

CREATE TYPE prescription_status AS ENUM (
    'uploaded', 'pending_review', 'approved', 'rejected', 'expired'
);

CREATE TYPE inventory_transaction_type AS ENUM (
    'receipt', 'reservation', 'reservation_release', 'sale', 'return', 'adjustment', 'damage'
);

CREATE TYPE crypto_settlement_status AS ENUM (
    'pending', 'submitted', 'broadcast', 'confirmed', 'failed', 'cancelled'
);
```

## 4. Tables

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    status user_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
-- Never store a raw `password` column — only `password_hash`.

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
-- Seed: customer, support, pharmacist, compliance, warehouse, finance, admin, super_admin

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    county TEXT,
    postal_code TEXT,
    country_code CHAR(2) NOT NULL,
    phone TEXT,
    is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    manufacturer TEXT,
    status product_status NOT NULL DEFAULT 'draft',
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    controlled_product BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_age INTEGER,
    country_restrictions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product variants hold the actual purchasable SKU + price.
-- The frontend's "$85 – $800" range is price_min/price_max computed from these.
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    strength TEXT,
    quantity INTEGER NOT NULL,
    unit TEXT,
    price NUMERIC(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (price >= 0),
    CHECK (quantity > 0)
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Store only the object-storage key here — never image binaries in Postgres.

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id),
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (quantity_available >= 0),
    CHECK (quantity_reserved >= 0)
);

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    transaction_type inventory_transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id TEXT,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, variant_id),
    CHECK (quantity > 0)
);

-- shipping_address is copied (snapshotted) into the order so later address
-- edits don't rewrite historical orders.
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    status order_status NOT NULL DEFAULT 'pending',
    compliance_status compliance_status NOT NULL DEFAULT 'not_required',
    fulfillment_status fulfillment_status NOT NULL DEFAULT 'pending',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(12,2) NOT NULL,
    shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- product_name, sku, unit_price are snapshots, same reasoning as shipping_address.
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id),
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (quantity > 0)
);

-- Prescription file bytes live in encrypted private object storage;
-- the DB only holds storage_key + review metadata.
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    storage_key TEXT NOT NULL,
    status prescription_status NOT NULL DEFAULT 'uploaded',
    issued_at DATE,
    expires_at DATE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compliance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    prescription_id UUID REFERENCES prescriptions(id),
    reviewer_id UUID REFERENCES users(id),
    status compliance_status NOT NULL,
    decision_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    provider TEXT NOT NULL,
    provider_payment_id TEXT,
    payment_method TEXT NOT NULL,
    currency CHAR(3) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'created',
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (amount >= 0)
);

-- UNIQUE(provider_event_id) is what makes webhook processing idempotent.
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    provider_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT,
    provider_refund_id TEXT,
    status TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settlement layer only — never the customer's card-payment mechanism.
-- The backend never needs a wallet private key; a licensed provider handles that.
CREATE TABLE crypto_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    provider TEXT NOT NULL,
    asset TEXT NOT NULL,
    network TEXT NOT NULL,
    destination_reference TEXT,
    fiat_amount NUMERIC(12,2),
    crypto_amount NUMERIC(30,12),
    exchange_rate NUMERIC(30,12),
    transaction_hash TEXT,
    status crypto_settlement_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    carrier TEXT,
    tracking_number TEXT,
    status fulfillment_status NOT NULL DEFAULT 'pending',
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- First-class subsystem for a regulated pharmacy, not optional logging.
-- e.g. PRODUCT_CREATED, PRODUCT_PRICE_CHANGED, ORDER_CANCELLED,
-- PRESCRIPTION_APPROVED, PRESCRIPTION_REJECTED, PAYMENT_REFUNDED,
-- INVENTORY_ADJUSTED, USER_SUSPENDED
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Source of truth for money movement — do not substitute a wallet_balance field.
-- entry_type examples: SALE, PAYMENT_CAPTURE, REFUND, PROCESSING_FEE,
-- PAYMENT_PROCESSOR_SETTLEMENT, CRYPTO_SETTLEMENT, CHARGEBACK
CREATE TABLE financial_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_id UUID REFERENCES payments(id),
    entry_type TEXT NOT NULL,
    currency CHAR(3) NOT NULL,
    amount NUMERIC(20,8) NOT NULL,
    direction TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. ERD (simplified)

```
                         ┌──────────────┐
                         │    users     │
                         └──────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌───────────┐      ┌──────────┐     ┌──────────────┐
        │ addresses │      │  carts   │     │prescriptions │
        └───────────┘      └────┬─────┘     └──────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │ cart_items  │
                         └──────┬──────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │product_variants │
                        └────────┬────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
           ┌──────────┐    ┌───────────┐   ┌───────────┐
           │ products │    │ inventory │   │order_items│
           └────┬─────┘    └───────────┘   └─────┬─────┘
                │                                │
                ▼                                ▼
           ┌────────────┐                  ┌───────────┐
           │ categories │                  │  orders   │
           └────────────┘                  └─────┬─────┘
                                                │
                    ┌───────────────────────────┼────────────────────┐
                    │                           │                    │
                    ▼                           ▼                    ▼
              ┌──────────┐              ┌──────────────┐     ┌───────────┐
              │ payments │              │compliance_   │     │ shipments │
              └────┬─────┘              │reviews       │     └───────────┘
                   │                     └──────────────┘
          ┌────────┴─────────┐
          │                  │
          ▼                  ▼
 ┌─────────────────┐  ┌────────────────────┐
 │ payment_events  │  │crypto_settlements  │
 └─────────────────┘  └────────────────────┘
```

---

## 6. FastAPI project structure

```
rapidfinil-backend/
├── app/
│   ├── main.py
│   ├── core/            # config, security, database, logging, exceptions
│   ├── models/          # SQLAlchemy models, one file per domain
│   ├── schemas/         # Pydantic request/response models
│   ├── api/v1/          # route modules: auth, products, categories, cart,
│   │                    # checkout, orders, prescriptions, payments,
│   │                    # shipments, account, admin, webhooks
│   ├── services/        # business logic per domain
│   ├── integrations/    # payments/, crypto/, shipping/, notifications/
│   │                    # — each with a base.py interface + provider.py impl
│   ├── workers/         # celery_app.py + *_tasks.py
│   └── dependencies/    # auth.py, permissions.py
├── alembic/versions/
├── tests/{unit,integration,api}/
├── Dockerfile
├── compose.yaml
├── .env.example
└── pyproject.toml
```

---

## 7. Dockerfile

```dockerfile
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

EXPOSE 8000

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
```

## 8. Docker Compose

```yaml
services:
  api:
    build: .
    container_name: pharmacy-api
    env_file: [.env]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    ports: ["8000:8000"]
    restart: unless-stopped

  worker:
    build: .
    container_name: pharmacy-worker
    command: [celery, -A, app.workers.celery_app, worker, --loglevel=info]
    env_file: [.env]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    restart: unless-stopped

  postgres:
    image: postgres:18
    container_name: pharmacy-postgres
    environment:
      POSTGRES_DB: pharmacy
      POSTGRES_USER: pharmacy
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets: [postgres_password]
    volumes: ["postgres_data:/var/lib/postgresql"]
    healthcheck:
      test: [CMD-SHELL, "pg_isready -U pharmacy -d pharmacy"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:8-alpine
    container_name: pharmacy-redis
    command: [redis-server, --appendonly, "yes"]
    volumes: ["redis_data:/data"]
    healthcheck: { test: [CMD, redis-cli, ping] }
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

Use Docker secrets rather than plain environment variables for passwords. For production, prefer managed PostgreSQL over running the production database inside Compose.

## 9. `.env.example`

```env
APP_ENV=development

DATABASE_URL=postgresql+asyncpg://pharmacy:password@postgres:5432/pharmacy
REDIS_URL=redis://redis:6379/0

JWT_SECRET=
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

STORAGE_BUCKET=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=

SETTLEMENT_PROVIDER=
SETTLEMENT_API_KEY=
SETTLEMENT_WEBHOOK_SECRET=

EMAIL_PROVIDER=
EMAIL_API_KEY=

SENTRY_DSN=
```

Never commit a real `.env`.

## 10. Migrations

```bash
alembic init alembic
alembic revision --autogenerate -m "initial pharmacy schema"
# review the generated migration manually before applying
alembic upgrade head
```

Run `alembic upgrade head` before starting the API in each deploy.

## 11. CI/CD pipeline shape

```
push → lint → type check → unit tests → integration tests → security scan
     → docker build → push image → deploy staging → smoke tests
     → production approval → deploy production
```

Never deploy directly from a developer machine.

## 12. Production topology

```
Cloudflare → Nginx/Load Balancer → FastAPI containers ─┬─ Redis
                                                        └─ Managed PostgreSQL
                                   Celery workers
                                   Private object storage (prescriptions)
```

Observability: Prometheus + Grafana + Sentry.

## 13. Source references

- FastAPI container deployment guidance: https://fastapi.tiangolo.com/deployment/docker/
- PostgreSQL `CREATE TABLE`: https://www.postgresql.org/docs/18/sql-createtable.html
- PostgreSQL foreign keys: https://www.postgresql.org/docs/18/tutorial-fk.html
- Docker Compose secrets vs. env vars: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Kenya Pharmacy and Poisons Board draft Digital Pharmacy Services Guidelines (2026-08-13): https://web.pharmacyboardkenya.org/download/draft-guidelines-for-digital-pharmacy-services-in-kenya/
