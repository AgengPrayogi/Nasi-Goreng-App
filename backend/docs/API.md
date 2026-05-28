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
| `REQUIRE_PAID_BEFORE_COMPLETE` | No | If `true`, `PATCH .../complete` returns **400** `PAYMENT_REQUIRED` until `PATCH .../payment` marks `paid`. Recommended for stricter cashier discipline in production. |

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

Tokens expire in **12 hours** (see `authService.js`).

## CORS

Browsers send `Origin`. Allowed values must appear in `CORS_ORIGINS` in production.

## Phase 1 — Pesanan online, antrian dapur, ETA, pembayaran manual

### Channel & kontak

- `channel`: `walk_in` (default) or `online`.
- For `online`, **`customerName`** and **`customerPhone`** are required (validated on create).

### Antrian & dapur (`kitchenStatus`)

- Before confirm: `kitchenStatus` is `none`.
- On **confirm**: assigns **`queueDate`** (business day in `ORDER_BUSINESS_TZ`), **`queueNumber`** (daily sequence), sets `kitchenStatus` to **`queued`**, and **`estimatedReadyAt`** from a simple ETA formula (base + per-item + per order ahead in queue).
- Kitchen line updates (admin): `queued` → `preparing` → `ready` → (on **complete**) **`served`** automatically with stock deduction.

### Pembayaran (tanpa gateway)

- `paymentStatus`: `unpaid` | `paid` | `refunded` (default `unpaid`).
- `paymentMethod`: `cash` | `transfer` | `qris_static` — required when marking **`paid`**.
- Optional: set `REQUIRE_PAID_BEFORE_COMPLETE=true` so **complete** is blocked until payment is marked **paid**.

### Order code & lacak

- **`orderCode`** (`NGP-YYYYMMDD-XXXXXX`) is the public ticket ID.
- **Public:** `GET /api/orders/track/:orderCode` — includes channel, queue fields, kitchen status, ETA, payment status (not method detail required for trust; full object returned as stored).

### Migrasi dokumen lama

If you have orders created before Phase 1 fields existed, run once:

```bash
cd backend && MONGODB_URI="..." node scripts/migrate-orders-phase1.js
```

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
| PATCH | `/api/orders/:id/confirm` | Admin | Confirm → queue + ETA |
| PATCH | `/api/orders/:id/kitchen` | Admin | Body `{ kitchenStatus }` — `queued` \| `preparing` \| `ready` \| `served` |
| PATCH | `/api/orders/:id/payment` | Admin | Body `{ paymentStatus, paymentMethod? }` — `paymentMethod` required when `paid` |
| PATCH | `/api/orders/:id/complete` | Admin | Complete order (transaction); sets `kitchenStatus` to `served` |
| PATCH | `/api/orders/:id/cancel` | Admin | Cancel |
| POST | `/api/stock-movements/restock` | Admin | Restock |
| POST | `/api/stock-movements/adjustment` | Admin | Adjustment |
| GET | `/api/reports/sales` | Admin | Sales summary |
| GET | `/api/reports/top-menus` | Admin | Top menus |

## Frontend & gateway pembayaran

- **Rencana UI:** `docs/FRONTEND_PLAN.md`.
- **Gateway (Fase 2):** setelah frontend stabil; belum diimplementasi di backend ini.

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
```
