# Nasi Goreng Polonia — Backend API

Node.js **Express 5** + **Mongoose** + **MongoDB**. Base path: `/api`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string. **Multi-document transactions** (completing orders) need a **replica set** (Atlas, or local Docker — see below). |
| `JWT_SECRET` | Yes in production | Secret for signing admin JWT (HS256). Use a long random string. |
| `PORT` | No | HTTP port (default `5000`). |
| `NODE_ENV` | No | `production` enforces `JWT_SECRET`, `MONGODB_URI`, and `CORS_ORIGINS`. |
| `CORS_ORIGINS` | Yes in production | Comma-separated allowed browser origins. If unset in non-production, all origins are allowed. |
| `ALLOW_ADMIN_REGISTER` | No | If `true`, extra admins may register; otherwise only the first bootstrap admin. |
| `ORDER_BUSINESS_TZ` | No | IANA timezone for **queue “day”** and date labels (default `Asia/Jakarta`). |
| `ETA_BASE_MINUTES` | No | Base prep time used when confirming an order (default `5`). |
| `ETA_MINUTES_PER_ITEM` | No | Added per total item quantity (default `3`). |
| `ETA_MINUTES_PER_ORDER_AHEAD` | No | Added per order already in kitchen queue ahead of this one (default `5`). |
| `RESERVATION_BUFFER_MINUTES` | No | Minutes blocked before/after a confirmed reservation to allow table turnover (default `15`). |
| `RESERVATION_WALKIN_HOLD_MINUTES` | No | Immediate dine-in duration used to hide/reject tables overlapping a confirmed reservation (default `90`). |
| `REQUIRE_PAID_BEFORE_COMPLETE` | No | Set to `true` in production: completion and income recording are blocked until payment is marked `paid`. |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | No | MongoDB server selection timeout in milliseconds (default `10000`). |
| `MONGO_CONNECT_TIMEOUT_MS` | No | MongoDB connection timeout in milliseconds (default `10000`). |
| `MONGO_SOCKET_TIMEOUT_MS` | No | MongoDB socket timeout in milliseconds (default `45000`). |

Copy `backend/.env.example` to `backend/.env` and adjust values.

## MongoDB and transactions

Completing an order (`PATCH .../complete`) runs a **MongoDB session + transaction**: stock updates, stock-movement inserts, and order status change commit together or roll back.

That requires the server to be a **replica set member** (or `mongos`). Plain standalone `mongod` without `replSet` will fail with errors mapped to HTTP **503** `TRANSACTIONS_UNAVAILABLE`.

**Local option:** from the repo root run `docker compose up -d` and use a URI similar to:

`mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0&directConnection=true`

**Hosted option:** MongoDB Atlas clusters are replica sets by default.

## JWT (admin)

1. Create the first admin: `POST /api/auth/register-admin` (only while **zero** admins exist, unless `ALLOW_ADMIN_REGISTER=true`).
2. Login: `POST /api/auth/login` → response `data.token`.
3. Protected routes: header `Authorization: Bearer <token>`.

## Customer CRM v1

Customer CRM is linked automatically when an order is created using `customerPhone`.
The order stores `customerId`, while the customer stores `orderIds`, `totalOrders`,
`totalSpent`, `totalQuantity`, and `lastOrderDate` as lifetime records. Only completed
orders update those records; cancelled and pending orders are excluded.

Regular tier evaluation uses completed orders from a rolling period configured by
`CustomerTier.periodDays` (default 60 days). The current period values are stored in
`periodSpent`, `periodOrders`, and `periodStartDate`. A customer must satisfy both
the spending and order-count thresholds. Defaults are Bronze (Rp50.000 and 1 order),
Silver (Rp300.000 and 6 orders), and Gold (Rp700.000 and 12 orders). Values and
benefits, including `discountPercent` and `description`, are stored in `CustomerTier`.

Tier downgrades use a two-evaluation grace period. The first failed evaluation keeps
the current tier and increments `tierEvaluationFailures`; the second consecutive
failure applies the downgrade. Changes are recorded in `CustomerTierHistory`, and
`tierUpdatedAt` records the latest evaluation.

Admin endpoints:

- `GET /api/customers` — list customers, sorted by total spending.
- `GET /api/customers/:id` — customer profile with resolved tier details.
- `GET /api/customers/:id/orders` — customer order history.
- `GET /api/customers/tiers` — active tier definitions and spending thresholds.
- `PATCH /api/customers/:id/type` — admin-only update with `{ "customerType": "individual" | "corporate" }`.
- `PATCH /api/customers/:id` — update profile data including `audienceSegment` (`individual`, `family`, or `organization`).
- `GET /api/customers/crm-dashboard` — live CRM KPIs, audience distribution, support totals, churn-risk customers, and active automations.
- `GET/POST /api/customers/support-tickets` — list or create structured customer issues; update with `PATCH /api/customers/support-tickets/:ticketId`.
- `POST /api/campaigns/:id/evaluate` — evaluate a campaign audience immediately.

Corporate customers receive tier `corporate`, are excluded from regular tier
evaluation, and do not accumulate regular period tier statistics. The weekly tier
job runs after server startup; tier evaluation also runs when an order is completed.

Amounts are in Indonesian rupiah and can be changed by updating the `CustomerTier`
records without changing service code. Existing databases should run
`npm run migrate:customer-tiers-v2` once to migrate legacy tier thresholds; subsequent
evaluations preserve administrator changes to version-2 tier records.

CRM Phase 2 adds audience segmentation for individual, family, and organization customers.
Campaigns can target those segments through `targetSegment.audienceSegments` and run an
automatic audience evaluation when `automation.enabled` is true. The scheduler evaluates
active automated campaigns daily by default; override with `CAMPAIGN_AUTOMATION_INTERVAL_MS`.
Support tickets preserve issue category, priority, status, resolution, and timestamps.

Tokens expire in **12 hours** (see `authService.js`).

### WhatsApp Business Cloud API and n8n

The backend is the system of record for WhatsApp consent, message templates, delivery
state, and Meta webhook verification. It sends approved template messages through
Meta Cloud API from a durable MongoDB outbox. n8n should orchestrate business
automation by calling the backend; it should not send messages through a second
WhatsApp credential or bypass the consent and template checks.

The WhatsApp integration includes backend webhook and n8n relay endpoints, but it
does not install or create n8n workflows. Inbound events are delivered to the configured
n8n Production Webhook URL; build and activate workflows in the self-hosted n8n editor
to process them. No workflow JSON export is currently shipped in this repository.

Completed orders receive a WhatsApp feedback template with a unique, unguessable link
to `/feedback/:orderCode?token=...`. The public web page lets the customer submit or
update a 1–5 star rating and optional comment, and displays the order's items plus
aggregate rating distribution. The backend endpoints are `GET /api/feedback/:orderCode?token=...`
and `PUT /api/feedback/:orderCode` with `{ "token": "...", "rating": 1..5,
"comment": "..." }`. Feedback links are available only after order completion and
the token is excluded from normal order responses.

Configure these deployment environment variables in the backend (never commit real
values): `WHATSAPP_ENABLED=true`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, and
`WHATSAPP_GRAPH_API_VERSION`. The phone number ID and token are used for sending;
the app secret and verify token are used for webhooks. They are validated separately,
so webhook verification does not depend on an active sending token. Keep the Graph API
version set to a version currently supported by your Meta app.
Use a System User access token for production and grant `whatsapp_business_messaging`;
the short-lived token shown in the app's Getting Started panel expires after 24 hours.
Meta documents System User tokens as lasting up to 60 days or permanently, depending
on how they are issued.

In Meta for Developers, add the WhatsApp product, configure the callback URL as
`https://<public-api-host>/api/whatsapp/webhook`, enter the same verify token, and
subscribe the app to the WhatsApp `messages` webhook field. The API must be publicly
reachable over HTTPS. Create and get approval for Indonesian templates matching the
allowlist below before enabling delivery:

| Template name | Category | Body parameters, in order |
|---|---|---|
| `reservation_pending` | Utility | customer_name, reservation_code, reservation_time |
| `reservation_confirmed` | Utility | customer_name, reservation_code, reservation_time, table_number |
| `reservation_cancelled` | Utility | customer_name, reservation_code |
| `order_confirmed` | Utility | customer_name, order_code |
| `order_ready` | Utility | customer_name, order_code |
| `feedback_request` | Utility | customer_name, order_code, feedback_url |
| `menu_recommendation` | Marketing | customer_name, menu_name, menu_url |

Set `WHATSAPP_TEMPLATE_LANGUAGE` to the exact language code configured for those Meta
templates (default `id`). Test using a Meta test recipient first. The backend expects
customer opt-in for the matching category and records the opt-in source/version.
`POST /api/whatsapp/messages` and `GET /api/whatsapp/messages` are admin JWT endpoints;
the former only queues an allowlisted template for a customer who already opted in.
The Meta webhook endpoints are `GET` (verification challenge) and `POST` (signed
delivery/inbound events) at `/api/whatsapp/webhook`.

For the hybrid deployment, the backend relays verified inbound messages and delivery
status events to n8n using a persistent outbox. Set `N8N_WHATSAPP_WEBHOOK_URL` to an
active n8n Production Webhook URL and set `N8N_WHATSAPP_WEBHOOK_TOKEN` to a random
secret of at least 32 characters. Create a Header Auth credential in n8n with header
`X-NGP-Webhook-Token` and the same value. n8n receives `X-NGP-Event-ID` for deduping;
the JSON payload has `eventType` (`inbound_message` or `message_status`) and
event-specific fields. The outbox retries transient failures and retains events for
30 days. Keep the n8n endpoint public over HTTPS in production.

n8n can queue a template through `POST /api/whatsapp/automation/messages` using
`X-N8N-API-Key: <N8N_WHATSAPP_API_KEY>`. Generate a separate random key of at least
32 characters and store it as an n8n Header Auth credential. The request body matches
`POST /api/whatsapp/messages`: `customerId`, `templateKey`, `variables`, `source`,
and `sourceId`. Backend validation still checks that the customer exists, is active,
has opted in to the template category, and that the template is allowlisted. Repeated
requests with the same source, sourceId, and template are idempotent. Rotate both
secrets if they are exposed. Do not put the permanent Meta access token in frontend
code or n8n workflows; backend keeps exclusive control of Meta delivery.

Admin monitoring endpoints are `GET /api/whatsapp/automation/events?status=failed`
and `PATCH /api/whatsapp/automation/events/:id/retry`. Event listings omit the
payload, which may contain customer message text. A manual retry resets its attempt
counter and uses the same event ID so the n8n workflow can deduplicate it.

Meta sends inbound events only after the app is subscribed to the WhatsApp `messages`
field for the correct WABA. Status events are forwarded to n8n after backend webhook
signature validation and processing. STOP, UNSUBSCRIBE, and BERHENTI opt-outs are
handled by the backend immediately and are not sent through n8n.

The Git remote is already configured as `origin`. This checkout has existing local
changes across unrelated application areas, so review and commit only the intended
files before pushing or configuring a deployment integration.

### Roadmap implementation status (Week 1-10)

- Week 1-2: **Done** — staff management/audit, customer CRM, tier evaluation, and customer history.
- Week 3-4: **Done** — supplier and purchase-order workflow, promotion/promo-code workflow, and inventory analytics.
- Week 5-7: **Done** — KPI dashboard, payment/hourly trends, menu cost and profitability analytics, and daily reconciliation.
- Week 8: **Done** — RFM, customer segments, churn prediction, customer intelligence, and CRM campaign targeting.
- Week 9: **Done** — operational metrics, support history, campaign attribution, and reconciliation finalization.
- Week 10: **Done** — custom report generation/export, saved report scheduling, ingredient demand forecast, and forecast accuracy endpoint.

Operational dine-in and marketplace foundations are also available:

- `GET /api/tables/available` — public list of currently available tables.
- `GET/POST/PATCH /api/tables` — admin table setup and status management; no tables are seeded automatically.
- `GET /api/tables/:id/orders` and `POST /api/tables/:id/release` — inspect and release a table after cleaning.
- `GET /api/promotions/active` and `GET /api/promotions/validate/:code` — public promotion discovery and checkout validation.
- `POST /api/marketplace/webhooks/:platform` — idempotent marketplace inbox webhook.
- `GET/POST/PATCH /api/marketplace/mappings` — admin menu mapping for marketplace synchronization.

### Table reservations

Customer reservation requests do not require an account or deposit. Requests begin as `pending`; an admin, manager, or PIC confirms them and assigns an available table. Start times use 15-minute increments, and the configured buffer is applied around confirmed reservations. Customers can check status and cancel a pending or confirmed reservation using the reservation code and the phone number supplied when booking.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reservations/availability?startAt=&partySize=&durationMinutes=` | No | Available tables for a future slot, filtered by capacity and existing reservations |
| POST | `/api/reservations` | No | Request a reservation; body includes `customerName`, `customerPhone`, `partySize`, `startAt`, optional `durationMinutes` (default 90) and `notes` |
| GET | `/api/reservations/track/:reservationCode?customerPhone=` | No | Private status lookup; code is random and phone must match |
| POST | `/api/reservations/cancel/:reservationCode` | No | Cancel a pending/confirmed reservation; body `{ "customerPhone": "..." }` |
| GET | `/api/reservations?from=&to=&status=` | PIC | List reservations for an optional date range/status |
| PATCH | `/api/reservations/:id/status` | PIC | Update status; confirmation requires `tableId`; supported transitions are pending→confirmed/rejected/cancelled, confirmed→checked_in/cancelled/no_show, checked_in→completed |

Reservation status history records the acting admin/staff identity for PIC actions. Confirmed reservations use database-enforced time-slot locks plus interval conflict checks so two concurrent approvals cannot claim the same table. Tables must be configured in `/api/tables` before customers can reserve them.

Orders now support `fulfillmentType` (`dine_in`, `takeaway`, `delivery`), `tableId`,
`deliveryAddress`, `deliveryNotes`, `promoCodeUsed`, and marketplace identity fields.
Marketplace webhooks are intentionally stored in an inbox first; an external provider
credential and platform-specific adapter must be configured before automatically creating
internal orders or accepting real marketplace traffic.

Forecast endpoints include `GET /api/analytics/forecasting/ingredient-forecast?days=7`
and `GET /api/analytics/forecasting/accuracy?type=demand|revenue`. Saved reports with
`schedule.enabled=true` and recipients are delivered as PDF on their daily, weekly, or
monthly schedule. The scheduler interval can be configured with
`REPORT_SCHEDULER_INTERVAL_MS`.

## CORS

Browsers send `Origin`. Allowed values must appear in `CORS_ORIGINS` in production.

## Phase 1 — Pesanan online, antrian dapur, ETA, pembayaran manual

### Channel & kontak

- `channel`: `dine_in` (default) or `online`.
- `customerName` is required for every order. `customerPhone` is optional; when supplied it is validated and links the order to the customer history. A phone number is required to save WhatsApp consent. Orders without a phone are not linked to a CRM customer, but can still be confirmed and completed.

### Antrian & dapur (`kitchenStatus`)

- Before confirm: `kitchenStatus` is `none`.
- On **confirm**: assigns **`queueDate`** (business day in `ORDER_BUSINESS_TZ`), **`queueNumber`** (atomic daily sequence, safe for concurrent confirmations), sets `kitchenStatus` to **`queued`**, and **`estimatedReadyAt`** from a simple ETA formula (base + per-item + per order ahead in queue).
- Kitchen line updates (admin): `queued` → `preparing` → `ready` → (on **complete**) **`served`** automatically with stock deduction.

### Pembayaran (tanpa gateway)

- `paymentStatus`: `unpaid` | `paid` | `refunded` (default `unpaid`).
- `paymentMethod`: `cash` | `transfer` | `qris_static` — required when marking **`paid`**.
- Set `REQUIRE_PAID_BEFORE_COMPLETE=true` in production so completion and income recording are blocked until payment is marked **paid**.

### Order code & lacak

- **`orderCode`** (`NGP-YYYYMMDD-XXXXXX`) is the public ticket ID.
- **Public:** `GET /api/orders/track/:orderCode` — includes channel, queue fields, kitchen status, ETA, payment status (not method detail required for trust; full object returned as stored).

### Migrasi dokumen lama

If you have orders created before Phase 1 fields existed, run once:

```bash
cd backend && MONGODB_URI="..." node scripts/migrate-orders-phase1.js
```

## Phase 2 — Business Intelligence

Phase 2 turns operational data into restaurant decisions: daily KPI, menu margin, kitchen efficiency, customer segments, payment mix, and stock risk.

### Cost fields for profitability

- `Ingredient.costPerUnit`: estimated purchase cost per `gram`, `ml`, or `pcs`.
- `Menu.costPrice`: total ingredient cost per portion.
- `Menu.overheadAllocation`: optional operational cost allocation per menu portion.
- `Menu.profitMargin` and `Menu.foodCostPercent`: recalculated when menu cost data changes.

For existing menus, run:

```bash
cd backend && MONGODB_URI="..." npm run migrate:menu-costs
```

### BI endpoints

All BI endpoints require admin JWT.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/dashboard` | One-call BI dashboard: KPI, trends, payment mix, menu profit, kitchen efficiency, customer segments, low-stock items |
| GET | `/api/analytics/kpi?period=today\|week\|month\|custom&from=&to=` | Revenue, order count, AOV, completion/payment rates |
| GET | `/api/analytics/trends?period=daily\|hourly&from=&to=` | Time-series KPI data |
| GET | `/api/analytics/hourly-distribution?date=YYYY-MM-DD` | Peak hours for staffing decisions |
| GET | `/api/analytics/payment-breakdown?from=&to=` | Payment method and payment status distribution |
| GET | `/api/analytics/menu-cost` | Menu cost breakdown from ingredients |
| GET | `/api/analytics/menu-profit?from=&to=&sort=profit\|margin` | Menu revenue, COGS, profit, margin, and recommendation |
| GET | `/api/analytics/kitchen-efficiency?from=&to=` | Prep/wait time and ETA on-time rate |
| GET | `/api/analytics/customer-segment?from=&to=` | Value-based customer spending buckets |
| GET | `/api/analytics/operations/staff-performance?from=&to=` | Staff completion and revenue ranking |

Legacy Phase 2 intelligence endpoints remain available under `/api/analytics/profitability/*`, `/api/analytics/customer-*`, `/api/analytics/rfm-analysis`, and `/api/analytics/forecasting/*`.

## Endpoints (summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Liveness |
| POST | `/api/auth/register-admin` | No | Register admin (restricted) |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/menus` | No | Available menus |
| POST | `/api/menus` | Admin | Create menu |
| PATCH | `/api/menus/:id` | Admin | Update menu |
| DELETE | `/api/menus/:id` | Admin | Soft-delete |
| POST | `/api/ingredients` | Admin | Create ingredient |
| GET | `/api/ingredients` | Admin | List |
| GET | `/api/ingredients/low-stock` | Admin | Low stock |
| PATCH | `/api/ingredients/:id` | Admin | Update |
| DELETE | `/api/ingredients/:id` | Admin | Delete |
| POST | `/api/orders` | No | Create order (`items`, `notes`, optional `channel`, `customerName`, `customerPhone`) |
| GET | `/api/orders/track/:orderCode` | No | Public track |
| GET | `/api/orders/queue` | Admin | Kitchen queue for `queueDate` (query optional; default today business date) |
| GET | `/api/orders` | Admin | List orders; query: `status`, `orderCode`, `channel`, `kitchenStatus`, `paymentStatus`, `queueDate` |
| GET | `/api/orders/:id` | Admin | Order by id |
| PATCH | `/api/orders/:id` | Admin | Edit `items` and/or `notes` while pending or queued; item changes recalculate totals and are locked after payment; all edits stop once preparation starts |
| PATCH | `/api/orders/:id/confirm` | Admin | Confirm → queue + ETA |
| PATCH | `/api/orders/:id/kitchen` | Admin | Forward-only body `{ kitchenStatus }`: `queued → preparing → ready`; `served` is set only by completion |
| PATCH | `/api/orders/:id/payment` | Admin | Body `{ paymentStatus, paymentMethod? }` — `paymentMethod` required when `paid` |
| PATCH | `/api/orders/:id/complete` | Admin | Complete only a `ready` order (transaction); deducts stock and sets `kitchenStatus` to `served` |
| PATCH | `/api/orders/:id/cancel` | Admin | Cancel |
| POST | `/api/stock-movements/restock` | Admin | Restock |
| POST | `/api/stock-movements/adjustment` | Admin | Adjustment |
| GET | `/api/reports/sales` | Admin | Sales summary |
| GET | `/api/reports/top-menus` | Admin | Top menus |
| GET | `/api/analytics/dashboard` | Admin | Complete BI dashboard |
| GET | `/api/analytics/menu-profit` | Admin | Menu profit and margin |
| GET | `/api/analytics/kitchen-efficiency` | Admin | Kitchen efficiency |
| GET | `/api/analytics/customer-segment` | Admin | Customer value segments |
| GET | `/api/invoices/order/:orderCode` | Tidak | Download PDF faktur (publik) |
| GET | `/api/invoices/preview/order/:orderCode` | Tidak | Preview PDF faktur (base64) |
| GET | `/api/invoices/admin/orders/:id` | Admin | Download PDF faktur (admin) |

## Payment Gateway (Fase 2)

- `POST /api/payments/create` — create a new payment record for an order (`orderId`, `method`, `amount`). Returns `externalPaymentId`, `expiresAt`, and payment instructions.
- `GET /api/payments/order/:orderCode` — public lookup of payment by `orderCode`.
- `GET /api/payments` — admin list with filters (`status`, `method`, `orderCode`, `page`, `limit`).
- `POST /api/payments/webhook` — gateway webhook to update payment status (`paid`, `failed`, `expired`, `cancelled`). Requires `PAYMENT_WEBHOOK_SECRET` via header `x-webhook-secret` / `x-payment-secret`; production returns 503 if the secret is missing.

Payment model statuses: `pending`, `paid`, `failed`, `expired`, `cancelled`.
Payment methods: `cash`, `transfer`, `qris_static`.

Public track (`GET /api/orders/track/:orderCode`) still returns `paymentStatus` and `paymentMethod` from the order document.

## Phase 3 — Invoice PDF (tanpa thermal printer)

Semua bukti pembayaran kini berbentuk **PDF**.

- `GET /api/invoices/order/:orderCode` — download PDF faktur publik (tidak perlu login).
- `GET /api/invoices/preview/order/:orderCode` — kembalikan PDF sebagai base64 data URL (untuk preview).
- `GET /api/invoices/admin/orders/:id` — download PDF faktur untuk admin (wajib login).

PDF berisi header, detail pesanan, rincian item, total, dan info pembayaran.

## Error shape

```json
{
  "success": false,
  "message": "Human readable message",
  "errorCode": "SOME_CODE",
  "errors": []
}
```

In non-production, `stack` may be included.

## Scripts

```bash
cd backend
npm install
npm run dev
npm test
# Optional migration for legacy orders collection:
# MONGODB_URI=... node scripts/migrate-orders-phase1.js
# Optional BI cost recalculation:
# MONGODB_URI=... npm run migrate:menu-costs
```
