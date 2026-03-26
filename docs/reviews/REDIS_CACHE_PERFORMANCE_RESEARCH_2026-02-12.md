# Redis Cache Performance Research (Datoro)

Date: 2026-02-12  
Scope: runtime cache behavior for ticker/search APIs, Redis sharing across users/workers, and performance optimization plan.

## TL;DR

Your assumption is **mostly correct**.

If User A requests AMZN and User B requests AMZN 30 minutes later, User B should usually be faster **if Redis is connected** and cache keys match.

For ticker data today:
- Static data is cached for 7 days, so User B should get static payload quickly from cache.
- Dynamic quote data is cached for 5 minutes, so after 30 minutes quote is usually refreshed/missed, but that is still much cheaper than a full cold fetch.

So in practice, B is typically much faster than A for the expensive path.

---

## How cache works in your app

### Server cache layers

From [server/services/cacheService.ts](server/services/cacheService.ts):

1. L1 memory cache (per process)
   - LRU in-memory cache
   - TTL: 5 minutes (`CACHE_TTL.MEMORY`)
2. L2 Redis cache (shared)
   - Shared across all PM2 workers/users
   - Endpoint-specific TTLs from [server/config/constants.ts](server/config/constants.ts)

Read order:
- Check memory first
- If miss, check Redis
- If Redis hit, promote back into memory

### Key behavior for ticker routes

From [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts):

- Main combined endpoint: `/api/ticker-data/:ticker`
  - batch key: `batch:{TICKER}:{mode}:{API_VERSION}`
  - long TTL: `COMPANY_PROFILE` (7 days)
  - quote refresh logic on cache hit when quote age exceeds quote TTL

- Split static endpoint: `/api/ticker-data/:ticker/static`
  - key: `batch-static:{TICKER}:{mode}:{API_VERSION}`
  - TTL: 7 days

- Split dynamic endpoint: `/api/ticker-data/:ticker/dynamic`
  - key: `quote:{TICKER}`
  - TTL: 5 minutes

- Frontend fetch path uses split flow in [src/stores/tickerStore.ts](src/stores/tickerStore.ts)
  - fetch static first
  - then best-effort dynamic quote merge

### Request coalescing (stampede protection)

From [server/services/cacheService.ts](server/services/cacheService.ts):
- `getOrFetch()` deduplicates concurrent misses by key (`pendingFetches`)
- This prevents many parallel upstream calls for same ticker under burst

---

## Is User B faster after 30 minutes? (AMZN example)

### Case A: Redis connected (production target)

Expected behavior:
- User A (cold) hits upstream FMP for static + possibly quote
- User B at +30m:
  - Static: Redis hit (fast)
  - Quote: likely expired (5m), fetched fresh or merged best-effort

Result:
- User B should be significantly faster than User A for heavy data.
- Response may still include a small quote fetch delay, but not full 24-endpoint batch cost.

### Case B: Redis unavailable (memory-only fallback)

If Redis is down/unavailable, cache is process-local only.

Expected behavior:
- At +30m, 5-minute memory TTL has expired
- B may behave like cold request
- In PM2 multi-worker mode, cross-worker sharing is lost

Result:
- Your assumption can fail in memory-only mode.

### Case C: key mismatch

If mode/API version/ticker normalization differ, keys differ.

Result:
- B misses cache even with Redis connected.

---

## What is already good (best-practice alignment)

- Multi-layer cache (L1+L2)
- Shared Redis strategy for cluster safety
- Cache key versioning with `API_VERSION`
- Split static/dynamic design for correctness and speed
- Cache-aware rate limit skip for ticker hits
- Miss coalescing (`getOrFetch`)
- Cache stats endpoint for observability

---

## Gaps and performance risks

1. Redis fallback invisibility risk
- If Redis disconnects, app falls back to memory-only silently from a user experience perspective.
- This can reduce cross-user speedup sharply.

2. Dynamic quote TTL vs UX expectation
- 5-minute quote TTL means +30m request still needs quote refresh often.
- Fast, but not always instant.

3. `deletePattern()` uses `KEYS`
- In [server/services/cacheService.ts](server/services/cacheService.ts), pattern delete uses Redis `KEYS`, which is not ideal at scale.
- Prefer `SCAN` cursor pattern for production-safe key iteration.

4. Validation command drift
- Your environment repeatedly ran pre-deploy script instead of only test type-check command in terminal history.
- Keep cache/perf verification commands explicit and isolated for reliable measurements.

---

## Performance plan: “app should be flying”

## Phase 1 (Immediate, 1-2 days)

1. Add cache-source latency metrics
- Track p50/p95 by source (`memory`, `redis`, `miss`) for:
  - `/api/ticker-data/:ticker/static`
  - `/api/ticker-data/:ticker/dynamic`
- Include headers already present (`X-Cache`) in dashboards.

2. Add Redis health SLO alerts
- Alert if `cache.isMemoryOnly()` true for > N minutes.
- Treat as performance incident in production.

3. Validate A->B scenario with load profile
- Use [tests/load/cached-workload.js](tests/load/cached-workload.js)
- Add split-endpoint workload variant to mirror current frontend behavior.

Success criteria:
- Cached static p95 < 250ms
- Dynamic quote p95 < 400ms
- Cache hit rate > 85% on popular ticker traffic

## Phase 2 (Short term, 3-7 days)

1. Warm popular tickers proactively
- Periodic refresh for top tickers (from DB popularity table)
- Keep static hot in Redis before market open.

2. Tune quote freshness by market hours
- During market open: 1-2 minute quote TTL
- Off-hours: 5-15 minute TTL
- Keeps UX fresh while reducing load after close.

3. Replace Redis `KEYS` with `SCAN`
- Update pattern clear logic for safe operation under larger keyspace.

Success criteria:
- 99% requests avoid full batch miss on top symbols
- FMP quota headroom remains stable during spikes

## Phase 3 (Optimization, 1-2 weeks)

1. Serialize large payloads more efficiently
- Consider compressed Redis payloads for very large batch entries.
- Keep CPU budget in mind; benchmark before adopting.

2. Add stale-while-revalidate for static payloads
- Serve cached static instantly even near expiry
- Refresh asynchronously in background

3. Introduce endpoint-level perf budgets in CI
- Gate regressions for p95 latency and cache hit rates.

Success criteria:
- User-perceived ticker load “instant” after first request
- Stable p95 under concurrency in cached workload

---

## Concrete answer to your question

Yes: with Redis healthy, User B searching AMZN after 30 minutes should usually be faster because major data is cached and shared.

Important nuance:
- B will often still need fresh quote retrieval (5-minute quote TTL), but that is a lightweight path compared to full batch fetch.

So your assumption is correct for the heavy performance path, with quote freshness as intended behavior.

---

## Suggested next implementation ticket set

1. Add split-endpoint k6 scenario + report template
2. Add cache-source p95 metrics in monitoring
3. Add Redis memory-only fallback alerting
4. Replace `KEYS` with `SCAN` in cache pattern delete
5. Add market-hours quote TTL policy toggle
