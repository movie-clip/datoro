# Datoro Architecture Review — 2026-02-27

Reference process: `ARCHITECTURE_REVIEW_EXECUTION_PLAN_2026-02-27.md`

## Executive summary
The project architecture is strong and improving (split ticker endpoints, Redis-capable rate limiting, cache coalescing), but several blind spots remain in security posture, cache efficiency, and operational tooling.

Overall status: **Stable, but with high-value optimization opportunities**.

---

## Baseline checks used in this review
- `pre-deploy-check`: pass
- `build`: pass (notable large vendor chunks)
- `test`: pass (24 files / 467 tests)
- `type-check`: pass
- `type-check:server`: pass
- `lint`: pass with high warning debt (734)
- `security:audit`: pass result, but script itself has implementation defect/noise

---

## Priority findings

## P0 (critical)

### 1) CSRF risk with cookie auth in production
Evidence:
- `sameSite: 'none'` in auth cookie configuration for production in `server/routes/authRoutes.ts` (line 66).
- Cookie auth accepted in authenticated routes (token read from cookies) in `server/routes/authRoutes.ts` (line 229).

Risk:
- Cross-site requests can include auth cookies when CORS/credentials settings permit.

Recommendation:
- Either move state-changing routes to bearer-token auth only, or implement CSRF token validation for all mutating endpoints.
- At minimum, evaluate if production can use `SameSite=Lax`.

### 2) Security audit tool currently gives false-confidence signal
Evidence:
- `scripts/security-audit.mjs` uses `_line` and `_index` but references `line` and `index` (`line.match`, `line: index + 1`) around lines 88/105.

Risk:
- The scanner reports "passed" while emitting many runtime warnings, reducing trust in security gate quality.

Recommendation:
- Fix variable references and add unit test for scanner behavior.
- Make script fail hard when scanner errors occur.

---

## P1 (high)

### 3) CSP policy is too permissive in production
Evidence:
- `unsafe-inline` and `unsafe-eval` are enabled in `scriptSrc` in `server/middleware/security.ts` (lines 33-34).

Risk:
- Weakens XSS defenses.

Recommendation:
- Use environment-specific CSP:
  - dev: allow eval for HMR,
  - prod: remove `unsafe-eval`, minimize `unsafe-inline`, use nonce/hash strategy where needed.

### 4) FMP proxy cache key uses raw query string before canonicalization
Evidence:
- Raw split and query capture in `server/server.ts` (lines 422-423).
- Cache key generated from raw `query` string at `server/server.ts` (line 694).

Risk:
- Cache fragmentation for semantically equivalent requests with different query parameter ordering.

Recommendation:
- Build key from normalized/sorted `URLSearchParams` after validation/normalization.

### 5) DB tracking still runs on cache-hit hot path
Evidence:
- Cache hit branch still schedules `trackSearch` in legacy combined endpoint `GET /:ticker` at `server/routes/tickerRoutes.ts` (lines 330-331).

Risk:
- Extra DB write load on high-traffic cached legacy endpoint traffic limits scalability gains from caching.

Recommendation:
- Decouple analytics write path (queue/buffer/sampling).
- Consider tracking only misses or sampled hits for the legacy path, then align analytics strategy across split/static routes.

### 6) Static ticker route still fetches full batch (including quote)
Evidence:
- `/:ticker/static` calls `fetchTickerBatch` in `server/routes/tickerRoutes.ts` (line 440).
- Immediately strips quote via `toStaticBatchPayload` (line 448) and separately writes quote cache (line 445).

Risk:
- Unnecessary upstream quote fetch during static miss path.

Recommendation:
- Add static-focused fetch profile (exclude quote endpoint) or optional fetch flags.

### 7) Frontend split fetch is sequential, not parallel
Evidence:
- Static request awaited first in `src/stores/tickerStore.ts` (line 97).
- Dynamic quote fetch starts after static completes (line 106).

Risk:
- Added latency before freshest quote merge in high-latency networks.

Recommendation:
- Fire static + dynamic in parallel and merge when both complete (with graceful fallback).

### 8) Redis write path may incur extra round trip per set
Evidence:
- `set()` checks `redis.ttl(key)` before write in `server/services/cacheService.ts` (line 239).

Risk:
- Write amplification and added Redis latency under heavy churn.

Recommendation:
- Use policy by key class, or probabilistic skip without TTL call, or Redis script to combine logic in one call.

---

## P2 (medium)

### 9) Public monitoring endpoints expose operational signals
Evidence:
- Public `monitoring/summary` and `monitoring/alerts` in `server/routes/adminRoutes.ts` (lines 145 and 154).

Risk:
- External actors can infer system health/fallback conditions.

Recommendation:
- Decide intentionally: keep public for status pages or protect with admin key.

### 10) Vite warmup references .js files that do not match TS project layout
Evidence:
- Warmup includes `./src/main.js`, `./src/stores/tickerStore.js` etc in `vite.config.ts` (lines 104, 106, 109).

Risk:
- Warmup optimization may not be effective as configured.

Recommendation:
- Align warmup paths to actual `.ts` files or remove stale entries.

### 11) Documentation drift increases onboarding friction
Evidence:
- README lists Chart.js in stack and old server entrypoint references (e.g. `server/server.mjs`).

Recommendation:
- Refresh README to match current Vue/ECharts + TypeScript server architecture.

### 12) Lint warning debt hides meaningful signals
Evidence:
- `npm run lint:check` reports 734 warnings (0 errors).

Recommendation:
- Introduce warning budget and burn-down target per sprint.

---

## Caching strategy assessment

## What is working well
- Multi-layer cache with L1 memory + L2 Redis.
- Request coalescing in `getOrFetch` to reduce stampede risk.
- Static/dynamic ticker split endpoint architecture.
- Quote refresh-on-cache-hit strategy to preserve static payload TTL while improving price freshness.

## Main blind spots
- Proxy cache key normalization gap.
- Residual DB writes on cached hot path.
- Static route still fetching quote upstream before stripping.
- Extra Redis TTL check roundtrip on write path.

---

## Performance opportunities (highest ROI)
1. Parallelize frontend static/dynamic fetch merge.
2. Remove quote from static fetch profile on backend.
3. Canonicalize proxy cache keys.
4. Reduce DB write load for cache-hit analytics.
5. Trim CSP/console/lint debt to improve operational quality and debugging signal.

---

## 30/60/90 day execution roadmap

## 0–30 days
- ✅ Fix `security-audit.mjs` defects and make failures actionable.
- ✅ Update README drift and warmup file path drift.
- ⏳ Start lint warning burn-down with module owners.

## Execution status update (started 2026-02-27)
- Security audit scanner fixed (variable reference bug + cross-platform path handling + fail-on-read-errors).
- Security pattern noise reduced (false positives from token variable names eliminated).
- README corrected for current architecture (ECharts-only stack, TypeScript server entrypoint, dev URL, service path).
- Vite warmup module paths aligned from stale `.js` entries to actual `.ts` files.
- Validation after changes:
  - `npm run security:audit` ✅
  - `npm run build` ✅

## 31–60 days
- ✅ Implement parallel static+dynamic client fetch strategy.
- Introduce static-only backend fetch profile (no quote endpoint).
- ✅ Canonicalize proxy cache key generation.

## Execution status update (continued 2026-02-27)
- Frontend split ticker fetch now starts static and dynamic requests in parallel, while preserving static-first correctness and best-effort dynamic merge behavior.
- Added/updated split-fetch unit assertions to validate parallel-request behavior and static-failure handling.
- FMP proxy cache key now uses sorted canonical query params (excluding `apikey`) to reduce cache fragmentation from query-order variance.
- Validation after changes:
  - `npm run test -- tests/unit/stores/tickerStoreSplitFetch.test.ts` ✅ (workspace test suite green)
  - `npm run type-check:server` ✅

## 61–90 days
- Introduce analytics decoupling/sampling for cache-hit paths.
- Harden production CSP with nonce/hash policy.
- Reassess public monitoring endpoint exposure policy.

---

## Suggested KPIs
- p95 ticker load latency (cold/hot split)
- quote freshness age at render time
- Redis ops/request on ticker endpoints
- DB writes per 1k ticker requests
- lint warnings trend per sprint
