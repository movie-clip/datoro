# Deployment

This project is set up for Render. Use `render.yaml` as the deployment source of truth.

## Before You Deploy

Run the main readiness check:

```bash
node scripts/pre-deploy-check.mjs
```

Recommended checks:

```bash
npm run lint:check
npm run type-check
npm run type-check:server
npm run type-check:tests
npm test
npm run build
```

For CI-style validation:

```bash
npm run predeploy:check:ci
```

## Required Production Environment Variables

- `FMP_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `VITE_API_BASE_URL` for the frontend service

Common optional vars:

- `ADMIN_API_KEY`
- `READINESS_REQUIRE_ADMIN_KEY`
- `SENTRY_DSN`

Use `.env.example` as the env reference.

## Render Services

Defined in `render.yaml`:

- `datoro-api` backend web service
- `datoro` frontend static site
- `datoro-redis` Redis instance
- `datoro-db` PostgreSQL database

## Deployment Steps

1. Connect the repository to Render.
2. Deploy from `render.yaml`.
3. Set the required secrets in the Render dashboard.
4. Confirm frontend `VITE_API_BASE_URL` points to the deployed API.
5. Confirm `ALLOWED_ORIGINS` and `APP_URL` match the public frontend URL.
6. Run Prisma migrations as part of the backend build.

## Post-Deploy Checks

Verify:

- frontend loads successfully
- backend health endpoint responds at `/api/health`
- ticker requests work with a valid `FMP_API_KEY`
- auth flows work with the configured `JWT_SECRET`
- Redis-backed features work when `REDIS_URL` is set
- Stripe webhook and checkout configuration match deployed URLs

## Operational Security

In production, protect operational endpoints with `ADMIN_API_KEY` and send requests with:

```text
X-Admin-Key: <your-secret>
```

Key endpoints:

- `GET /api/cache/stats`
- `POST /api/cache/clear`
- `GET /api/monitoring/stats`
- `POST /api/monitoring/reset`
- `GET /api/analytics/stats`
- `GET /api/health/database`

To require the admin key for readiness checks too, set:

```text
READINESS_REQUIRE_ADMIN_KEY=true
```

## CI Notes

- Workflow files live in `.github/workflows/`.
- `ci.yml` and `pr-checks.yml` are the current GitHub Actions definitions.
- Local dry runs use `act` via `npm run ci:local:dry`.
