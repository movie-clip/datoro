# 🚀 Factorly Deployment Guide

Complete guide for deploying Factorly to production on Render.com (or any other platform).

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Quick Deploy to Render.com](#quick-deploy-to-rendercom)
- [Manual Deployment](#manual-deployment)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)
- [Custom Domain Setup](#custom-domain-setup)

---

## Prerequisites

### Required Accounts
1. **GitHub Account** - For repository and CI/CD
2. **Render.com Account** - For hosting (free tier available)
3. **FMP API Key** - Get from [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs)
   - Free tier: 250 requests/day
   - Starter tier: $14/month for 750 requests/day

### Optional Accounts
4. **Sentry** (optional) - [Error tracking free tier](https://sentry.io/)
5. **OpenAI** (optional) - [For AI features](https://platform.openai.com/api-keys)

**Note:** Redis is auto-configured in `render.yaml` - no separate account needed!

---

## Environment Variables

### Backend Environment Variables

#### Required
```bash
# Server Configuration
NODE_ENV=production
PORT=7071

# Database (auto-populated by Render from database service)
DATABASE_URL=postgresql://...

# Financial Data API
FMP_API_KEY=your_fmp_key_here

# CORS Configuration
ALLOWED_ORIGINS=https://your-frontend-domain.com
DEV_ORIGIN=https://your-frontend-domain.com
```

#### Optional
```bash
# Redis Cache (improves performance significantly)
REDIS_URL=rediss://default:password@endpoint:6379

# Error Tracking
SENTRY_DSN=https://...@sentry.io/...

# AI Features
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
```

### Frontend Environment Variables

#### Required
```bash
# Backend API URL
VITE_API_BASE_URL=https://your-backend-domain.com
```

#### Optional
```bash
# AI Provider (if using AI features)
VITE_AI_PROVIDER=openai
```

---

## Quick Deploy to Render.com

### Option 1: One-Click Deploy (Easiest)

1. **Fork the repository** on GitHub

2. **Click "Deploy to Render"** (if available) or connect manually:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select branch: `main`
   - Render will auto-detect `render.yaml`

3. **Set required secrets** in Render dashboard:
   - Go to each service → "Environment"
   - Set `FMP_API_KEY` value
   - Optionally set `VITE_OPENAI_API_KEY` and `SENTRY_DSN`

4. **Deploy!**
   - Render will automatically deploy all services
   - Database will be created
   - Redis cache will be set up
   - Frontend and backend will be deployed

5. **Verify deployment** (see [Post-Deployment Verification](#post-deployment-verification))

### Option 2: Manual Setup on Render.com

#### Step 1: Create PostgreSQL Database
1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Name: `factorly-db`
3. Database name: `financeview`
4. User: `financeview`
5. Region: `oregon` (or closest to users)
6. Plan: `Free` (90 days trial, then $7/mo)
7. Click "Create Database"
8. Copy the **Internal Database URL** (starts with `postgresql://`)

#### Step 2: Create Redis Cache
1. Go to Render Dashboard → "New" → "Redis"
2. Name: `factorly-redis`
3. Region: `oregon` (same as database)
4. Plan: `Free` (25MB)
5. Eviction Policy: `allkeys-lru`
6. Click "Create Redis"
7. Copy the **Redis URL** (starts with `redis://` or `rediss://`)

#### Step 3: Deploy Backend API
1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `factorly-api`
   - **Region**: `oregon`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command**: 
     ```bash
     node server/server.mjs
     ```
   - **Plan**: `Free` (or `Starter` for 24/7 uptime)
   - **Health Check Path**: `/api/health`

4. **Environment Variables**:
   ```bash
   NODE_ENV=production
   PORT=7071
   FMP_API_KEY=your_fmp_key_here
   DATABASE_URL=<paste Internal Database URL from Step 1>
   REDIS_URL=<paste Redis URL from Step 2>
   ALLOWED_ORIGINS=https://factorly.onrender.com
   DEV_ORIGIN=https://factorly.onrender.com
   # Optional:
   SENTRY_DSN=your_sentry_dsn
   VITE_AI_PROVIDER=openai
   VITE_OPENAI_API_KEY=your_openai_key
   ```

5. Click "Create Web Service"

6. **Wait for deployment** (2-3 minutes)

7. **Copy backend URL**: `https://factorly-api.onrender.com`

#### Step 4: Deploy Frontend
1. Go to Render Dashboard → "New" → "Static Site"
2. Connect same GitHub repository
3. Configure:
   - **Name**: `factorly`
   - **Branch**: `main`
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
   - **Publish Directory**: `dist`
   - **Pull Request Previews**: `Enabled` (optional)

4. **Environment Variables**:
   ```bash
   VITE_API_BASE_URL=<paste backend URL from Step 3>
   ```
   Example: `VITE_API_BASE_URL=https://factorly-api.onrender.com`

5. **Add Rewrite Rule** (for SPA routing):
   - Go to "Redirects/Rewrites" tab
   - Add rule:
     - Source: `/*`
     - Destination: `/index.html`
     - Action: `Rewrite`

6. Click "Create Static Site"

7. **Wait for deployment** (1-2 minutes)

8. **Copy frontend URL**: `https://factorly.onrender.com`

#### Step 5: Update Backend CORS
1. Go back to backend service (`factorly-api`)
2. Update `ALLOWED_ORIGINS` environment variable with frontend URL:
   ```bash
   ALLOWED_ORIGINS=https://factorly.onrender.com
   ```
3. Save and redeploy backend

---

## Manual Deployment (Other Platforms)

### Deploy to Vercel/Netlify (Frontend) + Railway/Heroku (Backend)

#### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variable:
   - `VITE_API_BASE_URL=https://your-backend-url.com`
5. Add redirect rule for SPA: `/* → /index.html` (200)

#### Backend (Railway/Heroku)
1. Connect GitHub repository
2. Add PostgreSQL addon
3. Add Redis addon
4. Set environment variables (see [Backend Environment Variables](#backend-environment-variables))
5. Set build command: `npm install && npx prisma generate && npx prisma migrate deploy`
6. Set start command: `node server/server.mjs`
7. Expose port: `7071`

---

## Post-Deployment Verification

### 1. Check Backend Health
```bash
curl https://your-backend-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "uptime": 123.45,
  "database": "connected",
  "redis": "connected"
}
```

### 2. Test Search Functionality
1. Open frontend URL: `https://your-frontend-domain.com`
2. Type a ticker symbol in search bar (e.g., "AAPL")
3. Verify dropdown appears with search results
4. Select a result
5. Verify data loads correctly

### 3. Check Browser Console
- Open DevTools → Console
- Should see **no errors**
- Network tab should show successful API calls

### 4. Test All Features
- [ ] Search bar works
- [ ] Ticker selection loads data
- [ ] All tabs work (Valuation, Performance, etc.)
- [ ] Charts render correctly
- [ ] Mobile responsive layout works
- [ ] Navigation between pages works

---

## Troubleshooting

### Search Not Working

**Symptom**: Search bar shows no results, no errors in console

**Solution**:
1. Check `VITE_API_BASE_URL` is set in frontend environment
2. Verify backend is running: `curl https://backend-url/api/health`
3. Check CORS: `ALLOWED_ORIGINS` should include frontend domain
4. Check browser Network tab for failed requests

### CORS Errors

**Symptom**: Console shows "blocked by CORS policy"

**Solution**:
1. Update backend `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://frontend-domain.com,https://www.frontend-domain.com
   ```
2. Update frontend CSP header if using custom domain
3. Redeploy backend

### Database Connection Errors

**Symptom**: Backend crashes or returns 500 errors

**Solution**:
1. Check `DATABASE_URL` is correct
2. Verify database is running
3. Check connection pool settings:
   ```bash
   # Add to DATABASE_URL:
   ?connection_limit=14&pool_timeout=10&connect_timeout=5&statement_timeout=10000
   ```
4. Run migrations: `npx prisma migrate deploy`

### API Rate Limits

**Symptom**: Some data doesn't load, 429 errors in logs

**Solution**:
1. Upgrade FMP plan ($14/mo for 750 requests/day)
2. Redis cache helps reduce API calls significantly
3. Monitor usage in FMP dashboard

### Free Tier Sleep Mode (Render)

**Symptom**: First request takes 30+ seconds

**Solution**:
- Upgrade to Starter plan ($7/mo) for 24/7 uptime
- Or accept 15-30s cold start on free tier
- Use [UptimeRobot](https://uptimerobot.com/) to ping server every 15 min

---

## Custom Domain Setup

### Frontend Custom Domain
1. Go to Render Dashboard → Your static site
2. Click "Settings" → "Custom Domain"
3. Add your domain: `www.yourdomain.com`
4. Add DNS records (provided by Render):
   ```
   CNAME www.yourdomain.com → factorly.onrender.com
   ```
5. Wait for DNS propagation (5-30 minutes)
6. SSL certificate auto-generated by Render

### Backend Custom Domain
1. Go to Render Dashboard → Your web service
2. Click "Settings" → "Custom Domain"
3. Add your API subdomain: `api.yourdomain.com`
4. Add DNS record:
   ```
   CNAME api.yourdomain.com → factorly-api.onrender.com
   ```
5. Update frontend `VITE_API_BASE_URL`:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```
6. Update backend `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com
   ```
7. Redeploy both services

---

## Monitoring & Maintenance

### View Logs
- **Render**: Dashboard → Service → "Logs" tab
- **PM2**: `pm2 logs factorly-api` (if self-hosting)

### Monitor Performance
- **Sentry**: Error tracking and performance monitoring
- **Render Metrics**: Dashboard shows CPU, memory, bandwidth usage
- **FMP Dashboard**: Monitor API usage and remaining quota

### Backup Database
```bash
# Render provides automatic daily backups on paid plans
# Manual backup:
pg_dump -h hostname -U username -d database_name > backup.sql
```

### Update Deployment
- **Auto-deploy**: Push to `main` branch triggers automatic deployment
- **Manual deploy**: Render Dashboard → Service → "Manual Deploy" → "Deploy latest commit"

---

## Cost Estimate

### Free Tier (Development/Testing)
- **Total**: $0/month
- Render PostgreSQL: Free for 90 days, then $7/mo
- Render Redis: Free (25MB)
- Render Web Services: Free (with sleep mode)
- Render Static Site: Free
- FMP API: Free (250 req/day)

### Production (Recommended)
- **Total**: ~$28/month
- Render PostgreSQL: $7/mo
- Render Redis: Free (25MB) or $10/mo (256MB)
- Render Backend (Starter): $7/mo (24/7 uptime)
- Render Frontend: Free
- FMP API (Starter): $14/mo (750 req/day)

### Enterprise
- **Total**: ~$100-500/month
- Render Pro PostgreSQL: $50-200/mo
- Render Redis Pro: $10-50/mo
- Render Backend (Pro): $25-85/mo
- Render Frontend (Pro): $10-20/mo
- FMP API (Professional): $49-199/mo

---

## Support

- **Documentation**: See `README.md` and `PM2_GUIDE.md`
- **Issues**: [GitHub Issues](https://github.com/movie-clip/factorly/issues)
- **Render Support**: [Render Docs](https://render.com/docs)

---

**Last Updated**: January 20, 2025
**Version**: 2.0.0
