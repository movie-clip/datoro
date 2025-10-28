# Load Testing Guide for Factorly

## Prerequisites

### Install k6
```powershell
# Windows (via Chocolatey)
choco install k6

# Or download from: https://k6.io/docs/getting-started/installation/
# Or use winget:
winget install k6
```

Verify installation:
```powershell
k6 version
```

---

## Running Load Tests

### 1. Start Your Local Environment

**Terminal 1 - Start Backend API:**
```powershell
cd d:\projects\Vue\factorly
npm run start:server
# Or if using PM2:
pm2 start ecosystem.config.cjs
```

**Terminal 2 - Start Frontend (optional, for full E2E):**
```powershell
npm run dev
```

**Terminal 3 - Start Redis (Docker):**
```powershell
docker run -d -p 6380:6379 --name factorly-redis redis:7-alpine
```

---

### 2. Run Load Tests

**Mixed Workload Test (Recommended - Tests Everything):**
```powershell
k6 run tests/load/mixed-workload.js
```

**Watchlist Stress Test:**
```powershell
k6 run tests/load/watchlist-stress.js
```

**DCF Calculator Stress Test:**
```powershell
k6 run tests/load/dcf-stress.js
```

**Custom Configuration:**
```powershell
# Override API URL
k6 run --env API_URL=http://localhost:3001 tests/load/mixed-workload.js

# Increase duration
k6 run --stage 5m:20 tests/load/mixed-workload.js

# Run with specific VUs (virtual users)
k6 run --vus 20 --duration 3m tests/load/mixed-workload.js
```

---

## Test Scenarios

### Mixed Workload Test
**Simulates:** Realistic user behavior  
**Duration:** ~8 minutes  
**Peak Load:** 20 concurrent users  
**Tests:**
- Ticker data fetching (batch endpoint)
- Watchlist add/remove
- DCF calculator data
- Deep Finder queries
- Chart data loading

**Expected Results:**
- p95 response time: < 2s
- Error rate: < 5%
- Throughput: 100-200 requests/min

---

### Watchlist Stress Test
**Simulates:** Heavy watchlist operations  
**Duration:** ~5 minutes  
**Peak Load:** 20 concurrent users  
**Tests:**
- Create watchlists
- Add 10 items each
- Reorder items (drag & drop simulation)
- Remove items
- Delete watchlists

**Expected Results:**
- p95 response time: < 1s
- Error rate: < 5%
- Database handles rapid CRUD operations

---

### DCF Calculator Stress Test
**Simulates:** Multiple simultaneous DCF calculations  
**Duration:** ~4 minutes  
**Peak Load:** 20 concurrent users  
**Tests:**
- Fetch DCF data for various stocks
- Run calculations with different assumptions

**Expected Results:**
- p95 response time: < 2s (DCF can be compute-heavy)
- Error rate: < 5%
- API doesn't rate-limit legitimate users

---

## Interpreting Results

### Good Results:
```
✓ http_req_duration..............: avg=450ms  p95=1.8s
✓ http_req_failed................: 2.5%
✓ http_reqs......................: 1200 total (20/s avg)
✓ vus............................: 20 max
```

### Warning Signs:
```
✗ http_req_duration..............: avg=3.5s   p95=8s      ← TOO SLOW
✗ http_req_failed................: 12%                     ← TOO MANY ERRORS
✗ http_reqs......................: 400 total (6/s avg)    ← LOW THROUGHPUT
```

### Key Metrics:
- **http_req_duration (p95):** 95% of requests should complete in < 2s
- **http_req_failed:** Error rate should be < 5%
- **http_reqs:** Total requests completed
- **vus:** Concurrent virtual users (should reach 20)

---

## Monitoring During Tests

### Watch Server Logs:
```powershell
# If using PM2:
pm2 logs

# Or if running directly:
# Check the terminal running npm run start:server
```

### Monitor Redis:
```powershell
docker exec -it factorly-redis redis-cli MONITOR
```

### Monitor Database Connections:
```powershell
# Check Prisma logs in server output for connection pool stats
```

---

## Common Issues & Fixes

### Issue: High Error Rate (>5%)

**Possible Causes:**
1. Rate limiting kicking in
2. Database connection pool exhausted
3. Redis connection issues
4. API errors

**Diagnosis:**
```powershell
# Check server logs for errors
pm2 logs --err

# Check rate limiter logs
grep "rate limit" server/logs/*.log
```

**Fixes:**
```typescript
// In server/config/constants.ts, increase rate limits:
export const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000,
  STANDARD: 120,        // Increase from 60 → 120
  AUTHENTICATED: 1200,  // Increase from 600 → 1200
}
```

---

### Issue: Slow Response Times (p95 > 2s)

**Possible Causes:**
1. External API (FMP) is slow
2. No cache hits (cold cache)
3. Database queries slow
4. Not enough Redis memory

**Diagnosis:**
```powershell
# Check cache hit rates in server logs
grep "cache hit" server/logs/*.log

# Monitor external API calls
grep "FMP API" server/logs/*.log
```

**Fixes:**
- **Warm up cache before test:** Run a few requests manually
- **Increase cache TTLs:** Longer cache = fewer API calls
- **Add database indexes:** Check slow query logs
- **Increase Redis memory:** Adjust Docker Redis config

---

### Issue: Connection Pool Exhausted

**Symptoms:**
```
Error: Connection pool timeout
P2024: Timed out fetching a new connection from the pool
```

**Fix:**
```typescript
// In server/config/database.config.ts
export const CONNECTION_POOL_CONFIG = {
  providers: {
    'local-postgres': {
      maxConnections: 100,
      connectionsPerWorker: 30,  // Increase from 23 → 30
      buffer: 10
    }
  }
}
```

---

## Advanced Testing

### Test with Authentication
If your app requires login:

```javascript
// In tests/load/mixed-workload.js, modify setup():
export function setup() {
  const loginRes = http.post(`${API_URL}/api/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'testpassword123'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  return { authToken: loginRes.json('token') };
}
```

---

### Test Against Production (Render.com)

**⚠️ WARNING:** Only do this during off-peak hours!

```powershell
k6 run --env API_URL=https://factorly-api.onrender.com tests/load/mixed-workload.js
```

**Reduce load for production testing:**
```powershell
# Only 5 concurrent users, shorter duration
k6 run --vus 5 --duration 1m --env API_URL=https://factorly-api.onrender.com tests/load/mixed-workload.js
```

---

## Success Criteria for 20 Concurrent Users

### ✅ All tests pass if:
- ✅ p95 response time < 2s
- ✅ Error rate < 5%
- ✅ No database connection errors
- ✅ No rate limit errors (for legitimate traffic)
- ✅ Cache hit rate > 80% (after warmup)
- ✅ Server CPU < 80%
- ✅ Server memory < 80%

### 📊 Benchmark Targets:
- **Homepage:** < 500ms
- **Ticker data (cached):** < 300ms
- **Ticker data (uncached):** < 2s
- **Watchlist operations:** < 500ms
- **DCF calculator:** < 1.5s
- **Deep Finder:** < 1s

---

## Next Steps After Testing

### If Tests Pass:
✅ Your system can handle 20 concurrent users!  
✅ Deploy to production with confidence  
✅ Set up monitoring (Sentry, application insights)  
✅ Monitor real-world traffic patterns  

### If Tests Fail:
1. Identify bottleneck from k6 metrics
2. Check server logs for errors
3. Optimize (cache, indexes, connection pools)
4. Re-run tests
5. Repeat until passing

---

## Cleanup

After testing:
```powershell
# Stop PM2 processes
pm2 stop all

# Stop Redis
docker stop factorly-redis
docker rm factorly-redis

# Delete test data from database (optional)
# npm run db:reset
```

---

## Questions?

Check test output in `tests/load/results/summary.json` for detailed metrics.

Good luck! Your architecture should handle 20 users easily. 🚀
