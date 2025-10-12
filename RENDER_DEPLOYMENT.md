# 🚀 Render.com Deployment Guide

## Quick Overview
This guide will help you deploy Finance-View to Render.com - a free hosting platform perfect for showcasing your project.

**What you'll get:**
- Frontend: https://finance-view.onrender.com
- Backend API: https://finance-view-api.onrender.com
- PostgreSQL Database (managed)
- Redis Cache (managed)
- Automatic HTTPS
- Git-based deployments (auto-deploy on push)

**Cost:** FREE for the first 90 days, then ~$8-15/month if you upgrade

---

## 📋 Pre-Deployment Checklist

### 1. Make sure your repo is pushed to GitHub
```bash
git add .
git commit -m "Prepare for Render.com deployment"
git push origin main
```

### 2. Verify your build works locally
```bash
# Test production build
npm run build

# Test backend
npm run pm2:prod

# Run migrations
npx prisma migrate deploy
```

### 3. Required API Keys
You'll need these ready:
- ✅ FMP API Key (financialmodelingprep.com)
- ⚠️ OpenAI API Key (optional, for AI features)
- ⚠️ Sentry DSN (optional, for error tracking)

---

## 🎯 Step-by-Step Deployment

### Step 1: Sign Up for Render.com

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended - enables auto-deploy)
4. Authorize Render to access your repositories

---

### Step 2: Deploy Using Blueprint (Automated)

**Option A: Blueprint (Easiest - Everything Auto-Configured)**

1. Go to your Render Dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository: `movie-clip/finance-view`
4. Render will detect `render.yaml` and show:
   - ✅ finance-view-api (Backend)
   - ✅ finance-view (Frontend)
   - ✅ finance-view-db (PostgreSQL)
   - ✅ finance-view-redis (Redis)
5. Click "Apply" - Render will create all services!

**Option B: Manual Setup (More Control)**

If blueprint doesn't work, follow manual steps below:

#### 2a. Create PostgreSQL Database
1. Dashboard → "New" → "PostgreSQL"
2. Name: `finance-view-db`
3. Database: `financeview`
4. User: `financeview`
5. Region: Oregon (or closest to you)
6. Plan: Free
7. Click "Create Database"
8. ⏳ Wait 2-3 minutes for provisioning
9. ✅ Copy the **Internal Database URL** (will be auto-injected)

#### 2b. Create Redis Instance
1. Dashboard → "New" → "Redis"
2. Name: `finance-view-redis`
3. Plan: Free (25MB)
4. Region: Oregon
5. Click "Create Redis"
6. ⏳ Wait 1-2 minutes
7. ✅ Redis URL will be auto-injected

#### 2c. Deploy Backend API
1. Dashboard → "New" → "Web Service"
2. Connect repository: `movie-clip/finance-view`
3. Configuration:
   ```
   Name: finance-view-api
   Region: Oregon
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install && npx prisma generate
   Start Command: node server/server.mjs
   Plan: Free
   ```
4. Click "Advanced" → Add Environment Variables:
   ```bash
   NODE_ENV=production
   PORT=7071
   FMP_API_KEY=your_actual_fmp_key_here
   DATABASE_URL=${finance-view-db.DATABASE_URL}
   REDIS_URL=${finance-view-redis.REDIS_URL}
   ALLOWED_ORIGINS=https://finance-view.onrender.com
   DEV_ORIGIN=https://finance-view.onrender.com
   
   # Optional:
   SENTRY_DSN=your_sentry_dsn_here
   VITE_OPENAI_API_KEY=your_openai_key_here
   VITE_AI_PROVIDER=openai
   ```
5. Add Health Check:
   - Path: `/api/health`
6. Click "Create Web Service"
7. ⏳ First deploy takes 3-5 minutes
8. ✅ Your API will be at: `https://finance-view-api.onrender.com`

#### 2d. Run Database Migrations
1. Go to your backend service → "Shell" tab
2. Run migration:
   ```bash
   npx prisma migrate deploy
   ```
3. Verify:
   ```bash
   npx prisma db pull
   ```

#### 2e. Deploy Frontend
1. Dashboard → "New" → "Static Site"
2. Connect repository: `movie-clip/finance-view`
3. Configuration:
   ```
   Name: finance-view
   Branch: main
   Root Directory: (leave blank)
   Build Command: npm install && npm run build
   Publish Directory: dist
   Plan: Free
   ```
4. Add Environment Variable:
   ```bash
   VITE_API_BASE_URL=https://finance-view-api.onrender.com
   ```
5. Add Rewrite Rule:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite
6. Click "Create Static Site"
7. ⏳ First deploy takes 2-3 minutes
8. ✅ Your app will be at: `https://finance-view.onrender.com`

---

### Step 3: Update Backend CORS

After frontend deploys, update backend environment variables:

1. Go to backend service → "Environment"
2. Update `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://finance-view.onrender.com
   ```
3. Click "Save Changes" (auto-redeploys)

---

### Step 4: Test Your Deployment

1. **Test API Health:**
   ```bash
   curl https://finance-view-api.onrender.com/api/health
   ```
   Should return: `{"ok": true, ...}`

2. **Test Database Connection:**
   ```bash
   curl https://finance-view-api.onrender.com/api/readiness
   ```
   Should return: `{"ok": true, "checks": {"database": "connected", ...}}`

3. **Test Frontend:**
   - Visit: https://finance-view.onrender.com
   - Search for a ticker (e.g., AAPL)
   - Check if data loads

4. **Test Full Flow:**
   - Search multiple tickers
   - View charts
   - Check AI analysis (if enabled)
   - Verify caching works (second request should be faster)

---

## 🔧 Post-Deployment Configuration

### Enable Custom Domain (Optional)

1. Buy domain from Namecheap/GoDaddy
2. In Render:
   - Frontend service → Settings → Custom Domains
   - Add: `www.your-domain.com` and `your-domain.com`
3. Add DNS records:
   ```
   Type: CNAME
   Name: www
   Value: finance-view.onrender.com
   
   Type: A
   Name: @
   Value: (Render's IP - shown in dashboard)
   ```
4. SSL certificates auto-provision in ~5 minutes

### Configure Auto-Deploy

1. Go to service → Settings
2. Enable "Auto-Deploy"
3. Choose branch: `main`
4. Now every `git push` auto-deploys!

### Set Up Notifications

1. Service → Settings → Notifications
2. Add email for deploy failures
3. Add webhook for Slack/Discord (optional)

---

## 📊 Monitoring & Logs

### View Logs
```bash
# In Render Dashboard:
Service → Logs tab

# Or use Render CLI:
npm install -g render-cli
render login
render logs finance-view-api
```

### View Metrics
- Service → Metrics tab
- Shows: CPU, Memory, Request count, Response times

### Set Up Alerts
1. Service → Settings → Notifications
2. Add alert for:
   - Deploy failures
   - High error rates
   - Service crashes

---

## 🐛 Troubleshooting

### Frontend shows "Network Error"
**Problem:** API requests failing  
**Solution:**
1. Check CORS: `ALLOWED_ORIGINS` includes frontend URL
2. Check API health: `https://finance-view-api.onrender.com/api/health`
3. Check browser console for errors

### "Database connection failed"
**Problem:** Prisma can't connect  
**Solution:**
1. Check DATABASE_URL is set correctly
2. Run migrations: `npx prisma migrate deploy`
3. Check database is running in dashboard

### "Redis connection failed"
**Problem:** Cache not working  
**Solution:**
1. Check REDIS_URL is set
2. App should work without Redis (memory fallback)
3. Check Redis is running in dashboard

### Build fails with "out of memory"
**Problem:** Free tier has 512MB RAM limit  
**Solution:**
1. Add to `package.json`:
   ```json
   "scripts": {
     "build": "NODE_OPTIONS='--max-old-space-size=460' vite build"
   }
   ```
2. Or upgrade to Starter plan ($7/mo)

### Service sleeps after 15 minutes
**Problem:** Free tier spins down after inactivity  
**Solution:**
- Expected behavior on free tier
- First request after sleep takes ~30 seconds
- Upgrade to Starter ($7/mo) for 24/7 uptime
- Or use UptimeRobot.com to ping every 5 minutes

---

## 💰 Cost Breakdown

### Free Tier (First 90 Days)
- ✅ Backend: FREE (sleeps after 15min inactivity)
- ✅ Frontend: FREE (always on)
- ✅ PostgreSQL: FREE for 90 days
- ✅ Redis: FREE (25MB)
- **Total: $0/month**

### After 90 Days
- Backend: FREE or $7/mo (Starter - 24/7 uptime)
- Frontend: FREE
- PostgreSQL: $7/mo (after free trial)
- Redis: FREE or $1/mo (256MB)
- **Total: $8-15/month** (depending on plan)

### Upgrade Recommendations
Upgrade when:
- 🔴 Service sleeps too often (upgrade backend)
- 🔴 Database runs out of space (upgrade PostgreSQL)
- 🔴 Need faster response times
- 🔴 Getting 500+ visitors/day

---

## 🚀 Going Live Checklist

Before sharing with users:

- [ ] Test all features on production URL
- [ ] Verify SSL certificate is active (HTTPS)
- [ ] Check /api/health endpoint returns 200
- [ ] Check /api/readiness shows database connected
- [ ] Test search functionality with real tickers
- [ ] Verify charts render correctly
- [ ] Test on mobile device
- [ ] Check browser console for errors
- [ ] Set up error monitoring (Sentry)
- [ ] Add Google Analytics (optional)
- [ ] Create simple landing page or docs
- [ ] Share URLs with test users!

---

## 📱 Share Your Project

Your live URLs:
```
Frontend: https://finance-view.onrender.com
Backend API: https://finance-view-api.onrender.com/api/health
GitHub: https://github.com/movie-clip/finance-view
```

Share on:
- LinkedIn (tag #webdevelopment #vue #fintech)
- Twitter/X with screenshots
- Reddit (r/webdev, r/vuejs)
- Discord communities
- Hacker News Show HN

---

## 🔄 Making Updates

```bash
# 1. Make changes locally
git add .
git commit -m "Add new feature"
git push origin main

# 2. Render auto-deploys in 2-3 minutes
# 3. Check deploy status in dashboard
# 4. Test on production URL
```

---

## 📞 Support

**Render Support:**
- Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

**Your Project Issues:**
- Create GitHub issue
- Check server logs in Render dashboard
- Use request ID from error responses for debugging

---

## 🎉 Success!

Congratulations! Your Finance-View app is now live and ready to showcase!

**Next Steps:**
1. Share URL with friends/colleagues for feedback
2. Monitor usage in Render dashboard
3. Set up Sentry for error tracking
4. Consider custom domain if getting traction
5. Upgrade to paid tier when needed

**Need help?** Check the troubleshooting section or create a GitHub issue.
