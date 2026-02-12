# Datoro Project Review (Security • Performance • Caching)

Date: 2026-02-11  
Scope: backend (Express + Prisma + Redis), frontend caching (Vue Query), and shared infrastructure defaults.

## Executive summary

**Top risks found (fix first):**

1. **Admin/health/analytics endpoints are effectively public.** Multiple endpoints that expose internal metrics or can mutate system state are protected only by a rate limiter, not authentication/authorization.
2. **Rate limiting is not cluster-safe in production today.** You have Redis stores implemented, but routes are wired to the default memory stores, so PM2 cluster mode can bypass limits.
3. **CSRF exposure likely in production due to cookie auth + `SameSite=none`.** If you must use cross-site cookies, you need CSRF protections on state-changing endpoints.
4. **Batch caching mixes “static financials” with “dynamic quote/price” under a 7-day TTL.** This can serve stale prices/quotes (and DCF inputs) for days.

---

## Priority list (actionable)

### P0 — Critical security fixes

#### 1) Protect admin-like endpoints with real auth (not just rate limiting)

**Problem:** These endpoints are callable by anyone on the internet (they only have `adminLimiter`).

- [server/routes/adminRoutes.ts](server/routes/adminRoutes.ts)
  - `POST /api/cache/clear` (cache flush)
  - `GET /api/cache/stats` (internal cache stats)
  - `GET /api/monitoring/stats`, `POST /api/monitoring/reset`
- [server/routes/analyticsRoutes.ts](server/routes/analyticsRoutes.ts)
  - `GET /api/analytics/stats` (API usage stats)
- [server/routes/healthRoutes.ts](server/routes/healthRoutes.ts)
  - `GET /api/health/database` (exposes DB pool + pg activity details)

**Impact:** cache flush DoS, information disclosure (infra + usage), easier targeted attacks.

**Fix options (pick one):**

- **Best:** require authenticated admin role (JWT claims + DB role) for these routes.
- **Simple/fast:** require an `X-Admin-Key` header set to a strong secret (and *only* in production).
- **Defense-in-depth:** also IP allowlist for these endpoints.

#### 2) Fix production rate limiting (PM2 cluster bypass)

**Problem:** You create Redis-backed limiters but you do not actually use them in registered routes.

- [server/server.ts](server/server.ts) logs that Redis rate limiting is enabled, but it also states routes would need re-registration.
- Many routes import the default memory-based limiters directly, e.g. [server/middleware/rateLimiter.ts](server/middleware/rateLimiter.ts)

**Impact:** with 4 PM2 workers, attackers can bypass per-IP limits by a factor of ~4.

**Fix:** construct the Redis-backed limiters *before* mounting routes, and pass the correct limiter instances into route modules (or export a “current limiter” singleton that swaps to Redis store once Redis is connected).

Also note: `globalFmpLimiter` is in-memory only and must be moved to Redis (e.g., `INCR` + `EXPIRE` per window).

#### 3) Add CSRF protection for cookie-based auth

**Problem:** auth cookie is configured as:

- [server/routes/authRoutes.ts](server/routes/authRoutes.ts) uses `sameSite: 'none'` in production.

With `credentials: true` CORS, cross-site requests can include cookies. Without CSRF protections, an attacker can trigger state-changing requests from another site.

**Impact:** watchlist mutations, subscription actions, etc. could be triggered cross-site.

**Fix options:**

- If frontend and API can be same-site: switch to `SameSite=Lax` (or `Strict`) and keep `Secure`.
- If cross-site cookies are required: implement CSRF tokens (double-submit cookie or synchronizer token) and require the token on **all** state-changing routes.
- Additionally, consider requiring `Authorization: Bearer` on state changes and do **not** accept cookie auth for those endpoints.

#### 4) Lock down the `/api/fmp` proxy surface

**Problem:** `/api/fmp/*` forwards arbitrary subpaths to FMP using your server-side API key.

- Implementation: [server/server.ts](server/server.ts)

You do validate a handful of endpoints, but you do **not** enforce a strict allowlist.

**Impact:** cost/quota exhaustion, unexpected data exposure, larger attack surface.

**Fix:** enforce an allowlist (exact path patterns + allowed methods). Default-deny anything else.

**Status (2026-02-12):** Implemented.

- Added strict path allowlist + method restriction (`GET`/`HEAD`) in [server/server.ts](server/server.ts)
- Added proxy path safety checks (`..`, encoded traversal patterns, backslashes)
- Added deny response for non-allowlisted upstream paths (`FMP_PROXY_DENIED`)
- Added numeric query hardening for `limit` (capped)

---

### P1 — High impact performance & correctness

#### 5) Batch cache TTL is too long for quote/price correctness

**Problem:** `/api/ticker-data/:ticker` caches the *entire* batch result for ~7 days:

- [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
  - Cache key: `batch:${ticker}:${mode}:${API_VERSION}`
  - TTL used: `CacheTTL.COMPANY_PROFILE` (7 days)

But that batch payload includes quote/current price and is used by DCF extraction:

- [src/services/dcf/dcfDataService.ts](src/services/dcf/dcfDataService.ts)
 - [src/services/dcf/dcfDataService.ts](src/services/dcf/dcfDataService.ts)

**Impact:** stale price/quote for up to 7 days, stale DCF “currentPrice”, stale shares/market cap inputs.

**Fix options:**

- Split batch into **static** (financials) and **dynamic** (quote/price) endpoints with different TTLs.
- Keep the batch cache long, but fetch quote separately (short TTL) and merge client-side.
- Time-based TTL: shorter during market hours, longer after close.

**Status (2026-02-12):** Implemented (quote refresh-on-cache-hit).

- Added lightweight quote refresh helper in [server/services/batchDataService.ts](server/services/batchDataService.ts)
- On `/api/ticker-data` cache hits, stale quotes are refreshed when cache age exceeds `CacheTTL.QUOTE` while preserving long-lived static batch payload in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Refreshed quote updates `timestamp`, recalculates ETag, and writes updated payload back to cache in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Added unit coverage for quote refresh fetch helper in [tests/unit/services/batchDataService.test.ts](tests/unit/services/batchDataService.test.ts)

#### 6) Cache hit path recomputes ETag by hashing large payloads

**Problem:** On cache hits, if cache entry is “old format”, you recompute ETag via `JSON.stringify + md5`:

- [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- [server/services/cacheService.ts](server/services/cacheService.ts)

This is potentially expensive for 24-endpoint batches (especially with 30y price history).

**Fix:** store `{ data, etag, cachedAt }` *as the cached value* consistently, and never recompute MD5 on the hot path.

**Status (2026-02-12):** Implemented.

- Standardized ticker batch cache format to `{ data, etag, cachedAt }` in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Cache-hit path now reads stored `etag` directly instead of hashing full payload on each hit in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Added legacy cache format migration to wrapped envelope on read (background write) in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)

#### 7) Cache stampede risk on `/api/ticker-data` misses

**Problem:** `CacheService` supports request coalescing via `getOrFetch()` (`pendingFetches`), but `tickerRoutes` does not use it.

- Cache coalescing exists: [server/services/cacheService.ts](server/services/cacheService.ts)
- Ticker route uses `get()` then fetches directly: [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)

**Impact:** sudden popular ticker spikes can trigger many parallel 24-endpoint fetches, burning quota and CPU.

**Fix:** wrap the fetch in `cache.getOrFetch(cacheKey, () => fetchTickerBatch(...), ttl)`.

**Status (2026-02-12):** Implemented.

- Refactored miss path to use `cache.getOrFetch(...)` so concurrent requests for the same ticker/mode share one upstream fetch in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Updated `CacheService#getOrFetch()` TTL parameter typing to accept route-specific TTL values in [server/services/cacheService.ts](server/services/cacheService.ts)

#### 8) Rate limiting currently counts cached responses (contradicts tests/docs)

**Problem:** `fmpLimiter` is applied before cache check on `/api/ticker-data`.

- [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)

You decrement the **global** counter on cache hits, but per-IP `express-rate-limit` has already counted the request.

**Impact:** users can be blocked even when everything is served from cache.

**Fix:** do a cheap cache existence check first (or set a flag) and have the limiter `skip()` if it will be a cache hit.

**Status (2026-02-12):** Implemented.

- Added ticker cache precheck middleware so cache-hit requests are identified before limiter execution in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Updated FMP per-IP limiter to skip counting when `req.batchCacheHit === true` in [server/middleware/rateLimiter.ts](server/middleware/rateLimiter.ts)
- Updated global FMP limiter (memory + Redis implementations) to bypass quota counting for cache-hit requests in [server/middleware/rateLimiter.ts](server/middleware/rateLimiter.ts)

#### 9) Forced 500ms latency in batch fetcher

**Problem:** the batch fetcher always waits 500ms between phase 1 and phase 2, but still waits for phase 2 before returning.

- [server/services/batchDataService.ts](server/services/batchDataService.ts)

**Impact:** adds ~500ms to every cache miss.

**Fix:** remove the delay, or only use it if you truly stream/return phase 1 separately (currently you don’t).

**Status (2026-02-12):** Implemented.

- Removed the artificial 500ms phase gap in batch fetching so Phase 2 starts immediately after Phase 1 in [server/services/batchDataService.ts](server/services/batchDataService.ts)

---

### P2 — Medium priority hardening

#### 10) Replace `$executeRawUnsafe` in watchlist reorder

- [server/routes/watchlist.ts](server/routes/watchlist.ts)
 - [server/routes/watchlist.ts](server/routes/watchlist.ts)

Even with input validation, `$executeRawUnsafe` is a sharp edge. Prefer `$executeRaw` with parameterized values (or Prisma `updateMany` in a transaction).

Also: the ticker regex in reorder disallows dots (e.g. `BRK.B`) and some international tickers. That will break legitimate tickers.

#### 11) CSP is very permissive in production

- [server/middleware/security.ts](server/middleware/security.ts)
 - [server/middleware/security.ts](server/middleware/security.ts)

`script-src` includes `'unsafe-inline'` and `'unsafe-eval'` (and remains enabled in production). This greatly weakens XSS protection.

**Fix:** make CSP environment-specific:

- Dev: allow eval for Vite/HMR.
- Prod: remove `unsafe-eval`, remove `unsafe-inline`, use nonces/hashes where needed.

#### 12) Cookie clearing may not reliably delete auth cookie

- [server/routes/authRoutes.ts](server/routes/authRoutes.ts)
 - [server/routes/authRoutes.ts](server/routes/authRoutes.ts)

`res.clearCookie('authToken')` should use the same cookie options (`path`, `sameSite`, `secure`) that were used when setting it, otherwise some browsers won’t clear it.

---

## Caching: how it works today (and issues)

### Current layers

- L1 memory: `lru-cache`, TTL 5 minutes  
  - [server/services/cacheService.ts](server/services/cacheService.ts)
- L2 Redis: ioredis `GET`/`SETEX`  
  - [server/services/cacheService.ts](server/services/cacheService.ts)

### Key generation

- `generateKey(prefix, ...parts)` uppercases all parts: [server/services/cacheService.ts](server/services/cacheService.ts)
 - `generateKey(prefix, ...parts)` uppercases all parts: [server/services/cacheService.ts](server/services/cacheService.ts)

This is fine for tickers, but be careful with case-sensitive query values (notably search queries).

### Major cache correctness concern

- `/api/ticker-data` cache TTL is long (7 days) but includes fast-changing data.
- `/api/fmp/quote` TTL is short (5 min), but the batch route doesn’t use that separation.

Recommendation: treat quote/price as a separate cache domain.

**Status (2026-02-12):** Implemented (backward-compatible split).

- Added quote refresh-on-cache-hit once cached batch age exceeds `CacheTTL.QUOTE` while preserving static batch payload TTL in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Added dedicated short-lived quote cache domain (`quote:{ticker}`) with request coalescing via `cache.getOrFetch(...)` during refresh to avoid quote-fetch spikes in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Added explicit split endpoints for gradual migration:
  - static payload: `GET /api/ticker-data/:ticker/static`
  - dynamic quote payload: `GET /api/ticker-data/:ticker/dynamic`
  in [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
- Legacy `GET /api/ticker-data/:ticker` remains for backward compatibility while clients migrate.
- Frontend core fetch path now uses split endpoints directly (no legacy fallback path) in [src/stores/tickerStore.ts](src/stores/tickerStore.ts)

---

## Performance quick wins

1. ✅ Remove/rework the 500ms batch delay: [server/services/batchDataService.ts](server/services/batchDataService.ts)
2. ✅ Store ETag in cache values so cache-hit path is O(1) hashing: [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)
3. ✅ Use `cache.getOrFetch()` to coalesce misses: [server/services/cacheService.ts](server/services/cacheService.ts)
4. ✅ Reduce logging volume in hot paths (moved routine batch/ticker cache logs to debug level): [server/services/batchDataService.ts](server/services/batchDataService.ts), [server/routes/tickerRoutes.ts](server/routes/tickerRoutes.ts)

---

## Frontend build & dev-server notes (performance + safety)

- Dev server warmup references `.js` paths that appear to be legacy (you now use TypeScript in main app). This can reduce the effectiveness of warmup (or break it, depending on Vite version).
  - [vite.config.ts](vite.config.ts)
- `server.fs.allow: ['..']` is convenient for dev, but it widens what the dev server can read/serve. Keep it dev-only (and ensure it can’t leak secrets if someone hits your dev machine on the LAN).
  - [vite.config.ts](vite.config.ts)
- Dependency hygiene: you currently ship both `bcrypt` and `bcryptjs`, and also include `chart.js` even though the project standard is ECharts. Removing unused deps reduces install time and bundle size.
  - [package.json](package.json)

---

## Suggested implementation plan (updated 2026-02-12)

### Phase 1 — Completed today

- ✅ Lock down `/api/fmp` proxy with strict allowlist and path safety checks.
- ✅ Make rate limiting cluster-safe (Redis-backed limiter wiring + Redis global quota limiter).
- ✅ Implement cache correctness/performance fixes for ticker batch route:
  - quote refresh-on-cache-hit,
  - cache envelope with stored etag,
  - miss coalescing,
  - cache-aware limiter skip,
  - removal of artificial 500ms batch delay,
  - reduced hot-path logging noise.

### Phase 2 — Active next steps

- Add targeted tests for cache-aware limiter behavior and quote-refresh cache path.
  - Status: started with split-helper unit coverage in [tests/unit/services/tickerRoutesSplit.test.ts](tests/unit/services/tickerRoutesSplit.test.ts)
  - Status: split-fetch fallback/merge coverage added in [tests/unit/stores/tickerStoreSplitFetch.test.ts](tests/unit/stores/tickerStoreSplitFetch.test.ts)
  - Status: limiter cache-hit skip predicate coverage added in [tests/unit/services/rateLimiterCacheSkip.test.ts](tests/unit/services/rateLimiterCacheSkip.test.ts)
  - Status: quote-refresh decision logic coverage added in [tests/unit/services/tickerRoutesQuoteRefresh.test.ts](tests/unit/services/tickerRoutesQuoteRefresh.test.ts)
- Migrate frontend consumers to static + dynamic ticker endpoints where beneficial.
  - Status: completed for current frontend consumers in [src/stores/tickerStore.ts](src/stores/tickerStore.ts)
  - Status: legacy combined endpoint fallback removed from frontend fetch path in [src/stores/tickerStore.ts](src/stores/tickerStore.ts)
- Add lightweight cache observability counters for quote-refresh events and refresh failures.

### Phase 3 — Remaining security/hardening backlog

- Add real auth/secret gating for admin/health/analytics endpoints.
- Add CSRF defense (or change cookie policy so CSRF is not applicable).
- Tighten CSP in production.
- Replace `$executeRawUnsafe` in watchlist reorder.
- Fix cookie clearing option parity for `authToken`.

---

## Notes / misc

- Admin endpoints being public is the biggest immediate issue; even with low traffic, it’s a security footgun.
- The cache design is solid conceptually (L1/L2 + stats), but “batch TTL for all data” needs rethinking for correctness.
