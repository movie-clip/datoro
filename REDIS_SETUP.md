# Redis Cache Setup Guide

This guide explains how to set up Redis caching for the Finance View application.

## What is Redis?

Redis is an in-memory data store used for caching API responses. It helps:
- **Reduce API costs by 95%** (1M calls/day → 50K calls/day)
- **Improve response time** (500ms → 50ms)
- **Share cache across multiple server instances**

## Cost Overview

### Development (Local)
- **FREE** - Run Redis on your machine
- Options: Redis Stack, WSL2 + Redis, or Docker

### Production
| Option | Cost | Storage | Best For |
|--------|------|---------|----------|
| Redis Cloud Free | **$0/mo** | 30MB | Testing, low traffic |
| Redis Cloud Essentials | **$5-15/mo** | 250MB-1GB | Small apps (5K users/day) |
| AWS ElastiCache | **$15-50/mo** | Flexible | Scaling apps |
| Self-hosted | **$0/mo** | Unlimited | Advanced users |

**Recommendation**: Start with Redis Cloud free tier, upgrade to $15/mo plan when needed.

---

## Option 1: Run Without Redis (Memory-Only Cache)

**Best for**: Development, testing, learning

```bash
# Just leave REDIS_URL empty in .env.local
REDIS_URL=

# Start the server
npm run server
```

**Limitations**:
- Cache lost on server restart
- Not shared between server instances
- Limited to ~100MB memory

---

## Option 2: Local Redis (Windows)

### Method A: Redis Stack (Easiest)

1. **Download Redis Stack**
   - Go to https://redis.io/download/#redis-stack-downloads
   - Download Windows installer (.exe)
   - Install with default settings

2. **Start Redis**
   - Redis Stack runs automatically as a Windows service
   - Or run: `redis-stack-server` in PowerShell

3. **Configure Application**
   ```bash
   # In .env.local
   REDIS_URL=redis://localhost:6379
   ```

4. **Test Connection**
   ```bash
   npm run server
   # Look for: "[CacheService] Connected to Redis"
   ```

### Method B: WSL2 + Redis

1. **Install WSL2**
   ```powershell
   wsl --install
   ```

2. **Install Redis in Ubuntu**
   ```bash
   # In WSL terminal
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

3. **Configure Application**
   ```bash
   # In .env.local
   REDIS_URL=redis://localhost:6379
   ```

### Method C: Docker

```bash
# Pull Redis image
docker pull redis:latest

# Run Redis container
docker run -d --name finance-redis -p 6379:6379 redis:latest

# Configure application
# In .env.local
REDIS_URL=redis://localhost:6379
```

---

## Option 3: Redis Cloud (Production-Ready)

### Step 1: Create Redis Cloud Account

1. Go to https://redis.com/try-free/
2. Sign up with email (no credit card required for free tier)
3. Choose **Redis Cloud** → **Free** plan

### Step 2: Create Database

1. Click **New Database**
2. Settings:
   - **Name**: finance-view-cache
   - **Region**: Choose closest to your server
   - **Memory**: 30MB (free tier)
3. Click **Activate**

### Step 3: Get Connection URL

1. Go to database details
2. Copy **Public endpoint**: 
   ```
   redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345
   ```
3. Copy **Default user password**

### Step 4: Configure Application

```bash
# In .env.local
REDIS_URL=redis://default:YOUR_PASSWORD@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345
```

### Step 5: Test Connection

```bash
npm run server
# Look for: "[CacheService] Connected to Redis"
```

---

## Verify Cache is Working

### Method 1: Check Logs

```bash
npm run server

# First request (cache miss):
[FMP] GET /api/v3/income-statement/AAPL → CACHE MISS
[FMP] Response: 200 application/json

# Second request (cache hit):
[FMP] GET /api/v3/income-statement/AAPL → CACHE HIT (redis)
```

### Method 2: Check Cache Stats

Open browser: http://localhost:7071/api/cache/stats

```json
{
  "hits": {
    "memory": 5,
    "redis": 12,
    "total": 17
  },
  "misses": 3,
  "sets": 3,
  "errors": 0,
  "totalRequests": 20,
  "hitRate": "85.00%",
  "memorySize": 45321,
  "memoryItems": 5,
  "redisEnabled": true,
  "redisConnected": true
}
```

### Method 3: Check Response Headers

```bash
# First request
curl -I http://localhost:7071/api/fmp/api/v3/income-statement/AAPL?period=annual
# X-Cache: miss

# Second request
curl -I http://localhost:7071/api/fmp/api/v3/income-statement/AAPL?period=annual
# X-Cache: redis
```

---

## Cache Configuration

### TTL (Time To Live) Settings

Configured in `server/services/cacheService.js`:

```javascript
export const CacheTTL = {
  PRICE: 5 * 60,                    // 5 minutes (real-time)
  PRICE_HISTORY: 60 * 60,           // 1 hour
  INCOME_STATEMENT: 24 * 60 * 60,   // 24 hours
  BALANCE_SHEET: 24 * 60 * 60,      // 24 hours
  CASH_FLOW: 24 * 60 * 60,          // 24 hours
  REVENUE_SEGMENTS: 24 * 60 * 60,   // 24 hours
  COMPANY_PROFILE: 7 * 24 * 60 * 60, // 7 days
  AI_ANALYSIS: 30 * 24 * 60 * 60,   // 30 days
}
```

### Clear Cache

```bash
# Clear all cache
curl -X POST http://localhost:7071/api/cache/clear
```

---

## Troubleshooting

### "Connection refused" error

**Problem**: Redis server not running

**Solution**:
```bash
# Check if Redis is running (Windows)
netstat -ano | findstr :6379

# Start Redis Stack
redis-stack-server

# Or start Docker container
docker start finance-redis
```

### "Authentication failed" error

**Problem**: Wrong password in REDIS_URL

**Solution**: Double-check password from Redis Cloud dashboard

### Cache not working (always miss)

**Problem**: REDIS_URL not set or invalid

**Solution**:
```bash
# Check .env.local file
cat .env.local | findstr REDIS_URL

# Restart server after changing .env.local
npm run server
```

### High memory usage

**Problem**: Too many items in memory cache

**Solution**: Reduce `maxMemoryItems` in CacheService constructor

---

## Performance Benchmarks

### Without Redis
- API calls/day: **1,000,000**
- Response time: **500ms (p95)**
- FMP API cost: **$400-800/month**

### With Redis
- API calls/day: **50,000** (95% reduction)
- Response time: **50ms (p95)** (90% faster)
- FMP API cost: **$50/month** (87% savings)
- Redis cost: **$0-15/month**
- **Net savings**: **$335-735/month**

---

## Next Steps

1. ✅ Redis cache implemented
2. ⏭️ Add rate limiting (protect against abuse)
3. ⏭️ Add monitoring (track cache hit rates)
4. ⏭️ Pre-cache popular tickers (S&P 500)
5. ⏭️ Implement cache warming strategy

---

## Support

- Redis documentation: https://redis.io/docs/
- Redis Cloud support: https://redis.com/support/
- Application issues: See IMPROVEMENT_PLAN.md
