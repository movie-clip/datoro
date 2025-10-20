# Deployment Checklist

## 🚀 Pre-Deployment Checklist

Before deploying to production, ensure all these items are completed:

### 1. Environment Variables ✅

#### Frontend (Static Site)
In your hosting platform (e.g., Render, Vercel, Netlify), set:

```bash
# REQUIRED: Backend API URL
VITE_API_BASE_URL=https://your-backend-api.onrender.com

# Optional: AI features
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
```

**⚠️ Critical:** `VITE_API_BASE_URL` must be set for the frontend to communicate with the backend in production. Without this, API calls will fail silently.

#### Backend (Node.js Server)
```bash
# REQUIRED
NODE_ENV=production
PORT=7071
FMP_API_KEY=your_fmp_key
DATABASE_URL=postgresql://...

# REQUIRED: CORS configuration
ALLOWED_ORIGINS=https://your-frontend-domain.com
DEV_ORIGIN=https://your-frontend-domain.com

# RECOMMENDED
REDIS_URL=redis://...

# OPTIONAL
SENTRY_DSN=https://...
```

### 2. Build Test 🏗️

Test the production build locally before deploying:

```bash
# Build frontend
npm run build

# Preview the built frontend
npm run preview

# Test with production backend URL
VITE_API_BASE_URL=https://your-backend-api.onrender.com npm run build
npm run preview
```

Verify:
- [ ] All pages load correctly
- [ ] Search functionality works
- [ ] Charts render properly
- [ ] API calls succeed (check Network tab)
- [ ] No console errors

### 3. Test Checklist 🧪

Run all tests before deployment:

```bash
npm test
```

Expected result: All 239 tests passing ✅

### 4. Database Migrations 🗄️

If you made schema changes:

```bash
# Generate migration
npx prisma migrate dev --name describe_your_changes

# In production, apply migrations
npx prisma migrate deploy
```

### 5. Backend Deployment 🖥️

1. **Ensure PM2 is configured correctly:**
   ```bash
   npm run pm2:start
   npm run pm2:status
   ```

2. **Check backend health:**
   ```bash
   curl https://your-backend-api.onrender.com/api/health
   ```

3. **Verify environment variables are loaded:**
   - Check Render dashboard or hosting platform
   - Ensure all required variables are set

### 6. Frontend Deployment 🌐

1. **Build with production API URL:**
   ```bash
   VITE_API_BASE_URL=https://your-backend-api.onrender.com npm run build
   ```

2. **Deploy `dist/` folder to static hosting**

3. **Verify routing works:**
   - Direct URL access (e.g., `/valuation`)
   - Browser back/forward navigation
   - Ensure hosting platform has SPA redirect rules

### 7. Post-Deployment Verification ✅

After deployment, test in production:

- [ ] Homepage loads
- [ ] **Search bar works** (type a ticker like "AAPL")
- [ ] Search results dropdown appears
- [ ] Selecting a result loads data
- [ ] Enter key selects first result
- [ ] All tabs work (Valuation, Performance, etc.)
- [ ] Charts render correctly
- [ ] Mobile responsive layout
- [ ] Virtual keyboard hides on mobile after selection

### 8. Common Issues & Solutions 🔧

#### Search not working in production
**Symptom:** Search bar shows no results, no errors in console

**Cause:** `VITE_API_BASE_URL` not set in frontend build environment

**Solution:**
```bash
# Set environment variable in hosting platform
VITE_API_BASE_URL=https://your-backend-api.onrender.com

# Rebuild and redeploy frontend
npm run build
```

#### CORS errors
**Symptom:** Console shows CORS policy errors

**Cause:** Backend `ALLOWED_ORIGINS` not configured

**Solution:**
```bash
# Set in backend environment variables
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

#### API calls returning 404
**Symptom:** Network tab shows 404 for `/api/*` endpoints

**Cause:** Backend not running or wrong URL

**Solution:**
1. Check backend health: `curl https://backend-url/api/health`
2. Verify `VITE_API_BASE_URL` points to correct backend
3. Check backend logs for errors

#### Charts not loading
**Symptom:** Empty chart containers

**Cause:** Missing data or API errors

**Solution:**
1. Check Network tab for failed API calls
2. Verify FMP API key is valid
3. Check backend logs for FMP API errors

#### Mobile zoom on input focus
**Symptom:** Page zooms when tapping search input

**Solution:** Already fixed with:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

## 📊 Monitoring

After deployment, monitor:

1. **Backend logs** (Render dashboard or PM2 logs)
2. **Error tracking** (Sentry if configured)
3. **API usage** (FMP dashboard)
4. **Database connections** (should stay within pool limits)
5. **Redis cache hits** (check backend logs)

## 🔄 Rollback Plan

If issues occur after deployment:

1. **Revert to previous commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Or redeploy previous working version:**
   - In Render: Click "Deploy" on previous commit
   - Or manually: `git checkout <working-commit>` and deploy

3. **Check logs for root cause**

4. **Fix in development, test thoroughly, redeploy**

## 📚 Additional Resources

- [Render Deployment Guide](https://render.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [PM2 Deployment](./PM2_GUIDE.md)
- [CI/CD Setup](./docs/cicd/README.md)

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0
