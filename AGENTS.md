# AGENTS

## Purpose
This repository is a backend API project for the Nasi Goreng Polonia application.
The backend lives under `backend/` and exposes REST endpoints under `/api`.
Agents should use this file to understand the code structure, runtime requirements, and API-specific conventions.

## Project overview
- Backend: Node.js 18+, CommonJS, Express 5, Mongoose, MongoDB.
- Source root: `backend/src`
- Routes mount at `/api` in `backend/src/app.js`
- Startup: `node backend/server.js` or `cd backend && npm run dev`
- Tests: `cd backend && npm test`

## Key conventions for API work
- API base path: `/api`
- Auth: admin JWT via `Authorization: Bearer <token>` (see `backend/src/middlewares/auth.js`)
- Validation: `Joi` schemas in `backend/src/validators` and `backend/src/middlewares/validation.js`
- Error response shape is normalized in `backend/src/middlewares/errorHandler.js`
- Transactions: `PATCH /api/orders/:id/complete` requires MongoDB replica-set support, so local work should use the included `docker-compose.yml` or a replica-set URI.

## Important environment requirements
- `MONGODB_URI` must be set for DB connection
- In production, `JWT_SECRET` and `CORS_ORIGINS` are required
- Local Docker support is available at `docker compose up -d` with `mongodb` as a replica set
- Example local URI: `mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0&directConnection=true`

## API patterns and important behavior
- `POST /api/auth/register-admin`: first admin registration only, or allowed by `ALLOW_ADMIN_REGISTER=true`
- Public order tracking: `GET /api/orders/track/:orderCode`
- Kitchen queue workflow: orders are created, then confirmed, then advanced through kitchen statuses; completing orders performs stock adjustments in a transaction
- Payment flow is manual: `PATCH /api/orders/:id/payment` updates `paymentStatus` and `paymentMethod`
- `api/orders` admin endpoints are protected and require a valid admin JWT

## Useful files and docs
- `backend/docs/API.md` — API behavior and Phase 1 flow
- `backend/docs/FRONTEND_PLAN.md` — frontend integration plan
- `docker-compose.yml` — local MongoDB replica-set for transactions
- `backend/package.json` — scripts and runtime dependencies

## When working on API or backend issues
- Prioritize preserving the existing order lifecycle rules and admin-only protections
- Keep changes aligned with the documented payment, kitchen queue, and order-confirmation semantics
- Use the existing Joi validation schemas rather than inventing new request structure assumptions
- Link changes to `backend/docs/API.md` when explaining API behavior or design decisions
