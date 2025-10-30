
## Development

start service:
npm run start:dev

start development server (both backend + frontend):
npm run start:dev

## Implementing New Features

See comprehensive guide:
docs/FEATURE_IMPLEMENTATION_GUIDE.md

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

**Verify database migrations:**
```powershell
node scripts/verify-migration.mjs
```

**Run tests:**
```powershell
npm test
```

**Domain & SSL Setup (Required for Production):**
See comprehensive guide: `docs/DOMAIN_SETUP_GUIDE.md`
Quick checklist: `docs/DOMAIN_SETUP_CHECKLIST.md`

Quick steps:
1. Purchase domain (e.g., datoro.com) on Namecheap (~$12/year)
2. Add DNS records (CNAME or A record pointing to Render)
3. Add custom domain in Render dashboard
4. Wait for free SSL certificate (5-15 minutes)
5. Update environment variables:
   - `APP_URL=https://datoro.com`
   - `API_URL=https://datoro.com/api`
   - `CORS_ORIGIN=https://datoro.com,https://www.datoro.com`
   - `EMAIL_FROM=noreply@datoro.com`

**Verify domain setup:**
```powershell
# Test your domain (replace with your actual domain)
.\scripts\verify-domain-setup.ps1 -Domain datoro.com
```

clear redis cache:
node scripts/clear-cache-key.mjs AMZN

stop node:
Stop-Process -Name node -Force

start docker:
npm run docker:dev:up

generate speech:
python generate_voiceovers.py ASML


stress testing:

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); k6 run --env API_URL=http://localhost:7071 tests/load/mixed-workload.js

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); k6 run --env API_URL=http://localhost:7071 tests/load/cached-workload.js



Write-Host "Starting server in background..." -ForegroundColor Cyan; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\projects\Vue\factorly; npm run server" -WindowStyle Normal