
## Development

start service:
npm run start:dev

start development server (both backend + frontend):
npm run start:dev

## Pre-Deployment Checks

Before pushing to production:

**Run validation scripts:**
```powershell
node scripts/pre-deploy-check.mjs
npm run security:audit
npm run lint:check
npm run type-check
npm run type-check:server
```

## Production Secrets / Security

**Admin operations key (RECOMMENDED for production):**

Some internal endpoints are protected by an admin header in production:

- `GET /api/cache/stats`
- `POST /api/cache/clear`
- `GET /api/monitoring/stats`
- `POST /api/monitoring/reset`
- `GET /api/analytics/stats`
- `GET /api/health/database`

Set one of these environment variables in production:

- `ADMIN_API_KEY` (preferred)
- `ADMIN_KEY` (legacy alias)

Call the endpoints with header `X-Admin-Key: <your secret>`.

Optional: to require the admin key on `/api/readiness`, set:

- `READINESS_REQUIRE_ADMIN_KEY=true`

**Run validation scripts:**
```powershell
node scripts/validate-seo.mjs
```


**Verify database migrations:**
```powershell
node scripts/verify-migration.mjs
```

**Run tests:**
```powershell
npm test
```

clear redis cache:
node scripts/clear-cache-key.mjs AMZN

stop node:
Stop-Process -Name node -Force

start docker:
npm run docker:dev:up

generate speech:
python generate_voiceovers.py ASML


local DB:
npx prisma studio

stress testing:

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); k6 run --env API_URL=http://localhost:7071 tests/load/mixed-workload.js

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); k6 run --env API_URL=http://localhost:7071 tests/load/cached-workload.js



Write-Host "Starting server in background..." -ForegroundColor Cyan; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\projects\Vue\factorly; npm run server" -WindowStyle Normal