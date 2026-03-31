# Render Deploy Investigation

Date: 2026-03-31

## Current Situation

- Production backend deploys are failing before the API becomes healthy.
- The latest failure shown by Render is on commit `7647d8a` with:
  - `buildCommand: npm ci && npx prisma generate`
  - `startCommand: npm run server:render`
  - `server:render = npx prisma migrate deploy && node --import tsx server/server.ts`
- The failure is:

```text
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "datoro_db", schema "public" at "dpg-d4pdstvpm1nc73ceulsg-a"
Error: P1001: Can't reach database server at `dpg-d4pdstvpm1nc73ceulsg-a:5432`
```

## Important Facts Confirmed

### 1) The currently deployed failing config comes from committed code, not current local edits

- The Render logs reference commit `7647d8a`.
- That commit still used `server:render` startup migrations.
- Any current uncommitted local changes are **not** affecting that failing production deploy.

### 2) `preDeployCommand` is valid for migrations on Render

Render docs say:

- `preDeployCommand` runs after build and before start.
- It is recommended for database migrations.
- It runs on a **separate instance** from the final running service.

So using `npx prisma migrate deploy` in `preDeployCommand` is **correct in principle**.

### 3) `sync: false` does not keep values synced on existing services

Render docs say:

- `sync: false` prompts for a value only during initial blueprint creation.
- On later blueprint syncs for existing services, Render ignores those values.
- Existing env vars are preserved even if omitted from the blueprint.

This means manual dashboard state can drift far away from `render.yaml`.

### 4) Root-level resources do not force removal from environments

Render docs say:

- root-level `services` / `databases` keep their existing assigned environment after sync
- `ungrouped` explicitly removes them from environments

This matters if Render Projects / environment isolation are in use.

### 5) Private-only database means external DB access is intentionally disabled

Current blueprint has:

```yaml
ipAllowList: []
```

for `datoro-db`.

Per Render docs, that means:

- external access is blocked
- internal/private-network access is expected to be used

So if only the internal hostname is available in the dashboard, that is consistent with the current DB networking policy.

## What Has Been Tried

### A) Pre-deploy migration with internal DB URL

- `preDeployCommand: npx prisma migrate deploy`
- `DATABASE_URL` from `fromDatabase.connectionString`
- Result: `P1001` to internal DB host

### B) Startup migration on web service instance

- `startCommand: npm run server:render`
- `server:render = npx prisma migrate deploy && node --import tsx server/server.ts`
- Result: same `P1001` to internal DB host

Conclusion:

- this is **not** just a pre-deploy timing issue
- both the pre-deploy instance and the runtime service instance failed to reach the same internal host

### C) Manual / custom DB URL experiments

- Several attempts mixed `fromDatabase`, manual URLs, `DIRECT_DATABASE_URL`, and wrapper scripts
- These changes increased configuration drift and noise in deploy logs
- None provided clear evidence of a lasting fix

## What This Likely Means

At this point the most likely problem is **not** the migration command itself.

The strongest remaining candidates are:

1. `datoro-api` is still not actually in the same Render private-network scope as `datoro-db`
   - same region alone is not enough if environment assignment / isolation is wrong
2. `datoro-db` is unhealthy, suspended, restarting, or otherwise unavailable
3. the live service is not actually using the Render state we think it is using
   - stale dashboard settings
   - stale environment assignment
   - service created manually and only partially managed by blueprint
4. the easiest path may be to recreate the backend service cleanly under blueprint control

## What Has Also Broken Startup Independently

Another separate production issue was confirmed:

- `server/services/stripeService.ts` eagerly created a Stripe client at module load
- if `STRIPE_SECRET_KEY` was missing, backend startup crashed before health checks

That should be fixed independently from the DB issue, because it can mask whether the API is healthy.

## Best-Practice Reading of the Situation

Render best practice for a stable setup here is:

- build only during `buildCommand`
- run migrations in `preDeployCommand`
- start the API in `startCommand`
- use managed references where possible (`fromDatabase`, `fromService`)
- keep secrets manual or generated, but avoid dashboard / blueprint drift

However, that assumes the service can actually reach the managed DB over Render private networking.

Right now, the repeated `P1001` strongly suggests the real problem is with **Render resource state**, not with the Node app or Prisma command choice.

## Recommended Recovery Plan

### Phase 1: Stop changing deployment strategy repeatedly

Use one clean target config:

- `buildCommand: npm ci && npx prisma generate`
- `preDeployCommand: npx prisma migrate deploy`
- `startCommand: node --import tsx server/server.ts`
- `DATABASE_URL` from `fromDatabase`
- `REDIS_URL` from `fromService`

Do not keep toggling between startup migrations and pre-deploy migrations while debugging.

### Phase 2: Validate Render live state in dashboard

Check these exact items:

1. `datoro-db` status is `Available`
2. `datoro-db` is not suspended
3. `datoro-db` is not out of storage
4. `datoro-api` and `datoro-db` are in the same region
5. `datoro-api`, `datoro-db`, and `datoro-redis` are either all ungrouped or all in the same Render environment
6. private-network isolation is not blocking traffic between them
7. `datoro-api` is actually synced from the current blueprint state

### Phase 3: If dashboard state still looks suspect, recreate the backend service

Because there are no users right now, the lowest-risk recovery path may be:

1. keep the existing database `datoro-db`
2. keep the existing key-value store `datoro-redis`
3. delete only the web service `datoro-api`
4. recreate `datoro-api` cleanly from the blueprint / repo
5. re-enter required manual secrets in the dashboard:
   - `FMP_API_KEY`
   - Stripe secrets
   - optional `SENTRY_DSN`

Reason:

- this removes hidden service-level drift
- rebinds the service cleanly to the managed database and key-value store
- avoids deleting the database unless absolutely necessary

### Phase 4: Only recreate the DB if the DB itself is unhealthy

Do **not** recreate `datoro-db` first unless Render shows it is actually unhealthy or unusable.

Recreating the database is the last resort, not the first.

## Troubleshooting Data To Collect Next

If the issue persists, collect these exact facts from Render dashboard in one pass:

1. `datoro-db` status (`Available` / suspended / etc.)
2. `datoro-db` storage usage
3. the environment assignment of `datoro-api`
4. the environment assignment of `datoro-db`
5. whether environment isolation is enabled
6. whether `datoro-api` shows `DATABASE_URL` as a managed DB binding or a manual value
7. the current build / pre-deploy / start commands shown in Render UI for `datoro-api`

## Most Important Conclusion

The repeated failures now point to **Render resource state / networking / service drift**, not to a lack of understanding of `prisma migrate deploy`.

Migration timing was a distraction.

The next high-confidence move is to:

- stabilize on one deployment model
- verify live Render state
- if needed, recreate the backend service cleanly without deleting the database
