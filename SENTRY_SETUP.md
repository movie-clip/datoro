# Sentry Setup Guide - Error Tracking & Performance Monitoring

Complete guide to setting up Sentry for production-grade error tracking and performance monitoring.

---

## What is Sentry?

Sentry is a real-time error tracking platform that helps you:
- **Track Errors**: Automatic capture of all errors with stack traces
- **Monitor Performance**: API response times, slow queries, bottlenecks
- **Debug Issues**: Full request context, user info, breadcrumbs
- **Get Alerts**: Email/Slack notifications when errors occur
- **Analyze Trends**: Error frequency, affected users, release tracking

---

## Cost & Free Tier

| Tier | Cost | Errors | Transactions | Best For |
|------|------|--------|--------------|----------|
| **Developer** | **FREE** | 5,000/mo | 10,000/mo | Development & testing |
| **Team** | **$26/mo** | 50,000/mo | 100,000/mo | Small production apps |
| **Business** | **$80/mo** | 200,000/mo | 500,000/mo | Growing companies |

**Recommendation**: Start with FREE tier. It's perfect for 5,000 users/day (estimated 500-1000 errors/month).

---

## Step-by-Step Setup (15 minutes)

### Step 1: Create Sentry Account (3 minutes)

1. **Go to**: https://sentry.io/signup/
2. **Sign up** with email or GitHub (no credit card required)
3. **Verify email** (check your inbox)

### Step 2: Create Project (2 minutes)

1. After login, click **"Create Project"**
2. **Choose Platform**: Select **"Node.js"**
3. **Set Alert Frequency**: Choose "Alert me on every new issue" (recommended)
4. **Name Your Project**: `finance-view-api`
5. **Click "Create Project"**

### Step 3: Copy Your DSN (1 minute)

You'll see a screen with your DSN (Data Source Name). It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/789012
```

**Copy this DSN** - you'll need it next.

### Step 4: Configure Application (2 minutes)

Open `.env.local` in your project:

```bash
# Add this line (replace with your actual DSN)
SENTRY_DSN=https://your-key-here@your-org.ingest.sentry.io/your-project-id

# Make sure NODE_ENV is set
NODE_ENV=development  # or 'production' for prod
```

**Save the file**.

### Step 5: Restart Server (1 minute)

```bash
# Stop server (Ctrl+C or close PowerShell window)

# Start server
npm run server
```

**Look for this in the output**:
```
[Sentry] Initialized for development
[Sentry] Tracing: 100%
```

✅ **You're done!** Sentry is now tracking errors.

### Step 6: Test It Works (5 minutes)

**Method 1: Trigger a Test Error**
```bash
# Make a request to a non-existent endpoint
curl http://localhost:7071/api/this-does-not-exist

# Or in PowerShell:
Invoke-WebRequest -Uri "http://localhost:7071/api/this-does-not-exist"
```

**Method 2: Trigger a Test Ticker Error**
```bash
curl "http://localhost:7071/api/fmp/api/v3/profile/INVALIDTICKER123"
```

**Check Sentry Dashboard**:
1. Go to https://sentry.io
2. Click on your project
3. Go to **"Issues"** tab
4. You should see your test error appear within 30 seconds!

---

## What You'll See in Sentry

### Error Details

When an error occurs, Sentry captures:

**1. Error Message & Stack Trace**
```
AppError: Route not found: GET /api/this-does-not-exist
  at notFoundHandler (errorHandler.js:132)
  at Layer.handle (express/lib/router/layer.js:95)
  ...
```

**2. Request Context**
```json
{
  "method": "GET",
  "url": "/api/this-does-not-exist",
  "headers": {
    "user-agent": "Mozilla/5.0...",
    "host": "localhost:7071"
  },
  "ip": "::1"
}
```

**3. User Info**
- IP address
- User agent (browser)
- Timestamp

**4. Breadcrumbs** (what happened before the error)
```
[10:30:45] HTTP GET /api/health → 200 OK
[10:30:50] HTTP GET /api/cache/stats → 200 OK
[10:30:55] HTTP GET /api/this-does-not-exist → 404 NOT FOUND ❌
```

**5. Tags & Filters**
- `environment`: development / production
- `endpoint`: /api/fmp/*
- `statusCode`: 404, 500, etc.

---

## Performance Monitoring

Sentry also tracks **performance** (response times, slow queries).

### What's Tracked

**1. API Response Times**
- Average (p50)
- 95th percentile (p95)
- 99th percentile (p99)
- Slowest transactions

**2. Slow Queries**
- Any request taking >2 seconds
- Full trace of what happened
- Where the bottleneck is

**3. Throughput**
- Requests per second
- Requests per minute
- Peak load times

### View Performance

1. Go to Sentry dashboard
2. Click **"Performance"** tab
3. See:
   - Slowest transactions
   - Error rate by endpoint
   - Apdex score (user satisfaction)

---

## Alerts & Notifications

### Default Alerts

Sentry sends email alerts for:
- ✅ New errors (first occurrence)
- ✅ Error spikes (10x increase)
- ✅ Regressions (resolved errors come back)

### Custom Alerts

You can create custom alerts for:
- Error rate > 5% for 5 minutes
- Response time > 2s for 10 minutes
- Specific error codes (E500, E503)
- Memory usage spikes

**To create alerts**:
1. Go to **Alerts** tab
2. Click **"Create Alert"**
3. Choose conditions
4. Add email/Slack notification

---

## Integration with Your App

Your application is **already integrated**! Here's what's configured:

### Automatic Error Capture

```javascript
// All errors are automatically captured
app.get('/api/data', async (req, res) => {
  throw new Error('Something went wrong'); // ✅ Sent to Sentry
});
```

### Manual Error Capture

```javascript
import { captureException, captureMessage } from './services/sentryService.js';

// Capture exception with context
try {
  riskyOperation();
} catch (error) {
  captureException(error, {
    tags: { ticker: 'AAPL', endpoint: '/income-statement' },
    extra: { requestId: req.id },
    level: 'error'
  });
}

// Capture info message
captureMessage('Cache warming started', 'info', {
  tags: { cron: 'cache-warmer' }
});
```

### Add Breadcrumbs

```javascript
import { addBreadcrumb } from './services/sentryService.js';

// Add breadcrumb for debugging
addBreadcrumb('FMP API called', 'api', {
  ticker: 'AAPL',
  endpoint: '/income-statement',
  cached: false
});
```

---

## Privacy & Security

Your app automatically **filters sensitive data**:

### What's Filtered

- ✅ API keys (replaced with `***`)
- ✅ Authorization headers
- ✅ Cookies
- ✅ Passwords in URLs
- ✅ Credit card numbers (if any)

### What's Sent

- ✅ Error messages
- ✅ Stack traces
- ✅ Request paths (without sensitive params)
- ✅ User IP (for debugging)
- ✅ User agent

**Example**:
```
Before: /api/fmp/profile/AAPL?apikey=abc123secret
After:  /api/fmp/profile/AAPL?apikey=***
```

---

## Production Best Practices

### 1. Use Different Projects

Create separate Sentry projects for:
- **Development**: `finance-view-dev`
- **Staging**: `finance-view-staging`
- **Production**: `finance-view-prod`

Each has its own DSN.

### 2. Set Correct Environment

```bash
# In .env.local
NODE_ENV=production  # Change based on environment
```

### 3. Sample Rate for Performance

For production with high traffic, reduce sampling:

```javascript
// In sentryService.js
tracesSampleRate: environment === 'production' ? 0.1 : 1.0
// 0.1 = 10% of requests (saves quota)
// 1.0 = 100% of requests (for dev/staging)
```

### 4. Release Tracking

Tag errors by release version:

```javascript
Sentry.init({
  // ...
  release: 'finance-view@1.0.0',  // Use package.json version
});
```

### 5. Source Maps (for debugging)

Upload source maps to see original TypeScript/source code in stack traces.

---

## Monitoring Dashboard

Your app now has a **built-in monitoring dashboard** that works even without Sentry!

### Endpoints

**1. Health Check** (public)
```bash
GET /api/health
```

Returns:
```json
{
  "ok": true,
  "status": "healthy",
  "uptime": "2h 15m 30s",
  "requests": {
    "total": 1234,
    "successRate": "99.2%"
  },
  "performance": {
    "avg": "52ms",
    "p95": "560ms",
    "p99": "1200ms"
  },
  "cache": {
    "hitRate": "93%",
    "bytesSaved": "45.2 MB"
  },
  "errors": {
    "total": 10,
    "rate": "0.8%"
  }
}
```

**2. Monitoring Summary**
```bash
GET /api/monitoring/summary
```

**3. Detailed Metrics** (admin only - rate limited)
```bash
GET /api/monitoring/stats
```

Returns:
- Requests by endpoint
- Requests by status code
- Slow queries (>2s)
- Recent errors (last 20)
- Top rate-limited IPs
- System memory & CPU

---

## Troubleshooting

### "Sentry Not Configured" Message

**Problem**: Server logs show `[Sentry] Not configured`

**Solution**:
1. Check `.env.local` has `SENTRY_DSN=...`
2. Restart server: `npm run server`
3. Look for: `[Sentry] Initialized for development`

### Errors Not Appearing in Dashboard

**Checklist**:
- ✅ SENTRY_DSN is correct (check typos)
- ✅ Server restarted after adding DSN
- ✅ Error occurred after Sentry initialized
- ✅ Check Sentry dashboard (can take 30 seconds)
- ✅ Check spam folder for email alerts

**Test manually**:
```bash
curl http://localhost:7071/api/nonexistent
# Wait 30 seconds, check Sentry dashboard
```

### Too Many Errors (Quota Exceeded)

**Solution 1**: Reduce sample rate
```javascript
tracesSampleRate: 0.1  // Only 10% of transactions
```

**Solution 2**: Filter out non-critical errors
```javascript
ignoreErrors: [
  'NetworkError',
  'AbortError',
  // Add patterns to ignore
]
```

**Solution 3**: Upgrade plan
- Team: $26/mo (50K errors)
- Business: $80/mo (200K errors)

---

## Cost Management

### Free Tier Limits

- **5,000 errors/month** = ~166 errors/day
- **10,000 transactions/month** = ~333 transactions/day

### Estimates for 5K Users/Day

**Error Rate**: 0.5% (industry standard)
- Daily requests: ~100,000
- Daily errors: ~500
- **Monthly errors: ~15,000**

**Recommendation**: 
- Start with FREE tier (5K/mo)
- Upgrade to Team ($26/mo) when you hit limit
- Set sample rate to 33% to stay within free tier: `15,000 × 0.33 = 5,000`

### How to Check Usage

1. Go to Sentry dashboard
2. Click **Settings** → **Usage & Billing**
3. See:
   - Errors used this month
   - Transactions used this month
   - Projected overage

---

## Next Steps

### ✅ You Now Have

1. Error tracking (automatic)
2. Performance monitoring (automatic)
3. Monitoring dashboard (`/api/health`, `/api/monitoring/*`)
4. Real-time alerts (email)

### 📈 Optional Enhancements

1. **Slack Integration** (15 min)
   - Get error alerts in Slack
   - Settings → Integrations → Slack

2. **Source Maps** (30 min)
   - See original source code in stack traces
   - Useful for TypeScript/minified code

3. **User Feedback** (20 min)
   - Let users report bugs directly
   - Sentry SDK: `showReportDialog()`

4. **Release Tracking** (10 min)
   - Track errors by version
   - See which release introduced bugs

---

## Support & Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/node/
- **Sentry Discord**: https://discord.gg/sentry
- **Status Page**: https://status.sentry.io/
- **Support Email**: support@sentry.io

---

## Summary

✅ **Free tier**: Perfect for 5K users/day
✅ **Setup time**: 15 minutes
✅ **Integration**: Already done in your app
✅ **Cost**: $0/mo (free tier) → $26/mo (if needed)
✅ **Value**: Real-time error tracking, faster debugging, better uptime

**To enable**: Just add `SENTRY_DSN` to `.env.local` and restart server!
