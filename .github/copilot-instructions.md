# Copilot Instructions for `Factorly`

## Project Overview
- **Stack:** Vue 3 (TypeScript + script setup), Vite, TypeScript Node.js server (Express), ECharts, Prisma ORM, PostgreSQL, Redis.
- **Purpose:** Interactive financial data dashboard for equities, showing price, revenue, cash flow, margins, valuation metrics, and AI-powered insights.
- **Data Architecture:** Single batch endpoint fetches all data from FMP (96.7% API reduction vs original multi-call approach).

## Architecture & Data Flow
- **Frontend (Vue 3 + TypeScript):**
  - Vue SFCs in `src/components/` organized by feature (charts/, tables/, layout/, common/).
  - State management via composables in `src/composables/` (e.g., `useTickerData.ts` - shared batch data).
  - Chart rendering via ECharts (`vue-echarts`) - no Chart.js.
  - **Type Safety:** All components use strict TypeScript types from `src/types/`.
  - Styling: `src/styles/globals.css` and component-scoped styles.
  
- **Backend (Node.js + TypeScript + Express):**
  - Server entry: `server/server.ts` (NOT .mjs - migrated to TypeScript).
  - **Batch service:** `server/services/batchDataService.ts` - parallel fetching of 24 FMP endpoints.
  - **Database:** PostgreSQL via Prisma ORM (`server/services/databaseService.ts`).
  - **Authentication:** JWT-based auth with Google OAuth support (`server/services/authService.ts`).
  - **Services:** `cacheService.ts`, `monitoringService.ts`, `sentryService.ts`, `logger.ts`.
  - **Routes:** Modular routing (`server/routes/`) - health, watchlist, analytics, auth, ticker data.
  
- **Data Services:**
  - **Single batch endpoint:** `/api/ticker-data/:ticker?mode=full` fetches 24 FMP endpoints in parallel.
  - **Extraction services:**
    - `src/services/financials/batchChartService.ts` - Extract time-series data for charts.
    - `src/services/financials/batchTableService.ts` - Extract metrics for tables.
    - `src/services/health/healthIndicatorService.ts` - Calculate health indicators (Valuation, Performance, Balance).
    - `src/services/financials/growthService.ts` - Calculate growth rates.
  - **Multi-layer caching:** Client cache (5 min) → Redis cache (7 days) → FMP API.
  - **Database tracking:** User searches, popular tickers, API analytics via Prisma.

## TypeScript Type System
- **Centralized types:** `src/types/index.ts` exports all types.
- **Type categories:**
  - `fmp.types.ts` - FMP API response types (FMPProfile, FMPQuote, etc.).
  - `batch.types.ts` - BatchData structure, cache entries, series data.
  - `server.types.ts` - Server-side types (APIError, APIResponse, RouteConfig, etc.).
- **Type safety:** All API responses validated via Zod schemas (`batchDataSchemas.ts`).
- **Strict mode:** TypeScript strict mode enabled for both frontend and backend.

## Developer Workflows
- **Start Dev Server:**
  ```bash
  npm install
  npm run start:dev      # Concurrently runs server + Vite dev server
  npm run server:dev     # Backend only (port 7071)
  npm run dev            # Frontend only (port 5173)
  ```
- **Database:**
  ```bash
  npm run db:migrate:dev # Run Prisma migrations (development)
  npm run db:studio      # Open Prisma Studio GUI
  npm run db:push        # Push schema changes
  npm run db:monitor     # Monitor connection pool performance
  ```
- **Testing:**
  ```bash
  npm test              # Run unit tests
  npm run test:e2e      # Run E2E tests
  npm run test:coverage # Generate coverage report
  npm run test:watch    # Watch mode
  ```
- **Production:**
  ```bash
  npm run build         # Build frontend
  npm run pm2:prod      # Start with PM2 (4 workers)
  npm run pm2:logs      # View logs
  npm run pm2:monit     # Monitor processes
  ```
- **Code Quality:**
  ```bash
  npm run lint:check    # Check linting errors
  npm run lint:fix      # Auto-fix linting issues
  npm run type-check    # Check TypeScript types (frontend)
  npm run type-check:server  # Check TypeScript types (backend)
  npm run validate      # Run full validation (lint + test + build)
  ```

## Key Conventions & Patterns

### API Endpoints & Routing
- **Base URL:** `http://localhost:7071/api` (development), `https://factorly.onrender.com/api` (production).
- **Main endpoints:**
  - `/api/ticker-data/:ticker?mode=full` - Batch data (24 FMP endpoints).
  - `/api/search?q=AAPL` - Search tickers.
  - `/api/popular?limit=10` - Popular tickers (from database).
  - `/api/watchlist` - User watchlist (requires auth).
  - `/api/health` - Health checks (database, Redis, FMP API).
  - `/api/auth/*` - Authentication routes.

### Data Caching Strategy
- **Client cache:** 5-minute TTL in `useTickerData.ts` (Map-based, per browser session).
- **Redis cache:** 7-day TTL for batch data (shared across all PM2 workers).
- **Cache keys:** `ticker-data:{TICKER}:{mode}` format.
- **ETag support:** Conditional requests with `If-None-Match` headers.

### Component Patterns
- **All components use TypeScript:** `.vue` files with `<script setup lang="ts">`.
- **Data fetching:** Use `useTickerData(tickerRef)` composable for batch data.
- **Chart data extraction:** Call functions from `batchChartService.ts`.
  ```typescript
  const revenueData = getRevenueSeriesFromBatch(batchData.value)
  ```
- **Table data extraction:** Call functions from `batchTableService.ts`.
  ```typescript
  const valuation = getValuationFromBatch(batchData.value)
  ```
- **Health indicators:** Use `healthIndicatorService.ts` for consistent health calculations.
- **Time series format:** ECharts expects `[[timestamp, value], ...]` arrays.

### Database Patterns (Prisma)
- **Models:** User, PopularTicker, SearchHistory, ApiRequest, ErrorLog, Session.
- **Connection pooling:** Optimized for PM2 cluster mode (4 workers).
  - Render PostgreSQL: 22 connections per worker (88 total + 9 buffer).
  - Local PostgreSQL: 23 connections per worker (92 total).
- **Service functions:** All database operations in `databaseService.ts`.
  ```typescript
  import { findOrCreateUser, logUserSearch, getPopularTickers } from './databaseService'
  ```
- **Error handling:** All Prisma calls wrapped in try-catch with logging.

### Authentication & Authorization
- **Strategy:** JWT tokens + HTTP-only cookies.
- **Supported methods:**
  - Email/password (bcrypt hashing).
  - Google OAuth 2.0.
  - IP-based anonymous sessions (auto-created).
- **Middleware:**
  - `authenticate` - Attaches user to request (optional).
  - `requireAuth` - Enforces authentication (returns 401 if not authenticated).
- **Protected routes:** Watchlist endpoints require authentication.

### FMP API Integration
- **Key endpoints used:**
  - `/api/v3/profile/{ticker}` - Company profile.
  - `/api/v3/quote/{ticker}` - Real-time quote.
  - `/api/v3/income-statement/{ticker}` - Income statements (annual/quarterly).
  - `/api/v3/balance-sheet-statement/{ticker}` - Balance sheets.
  - `/api/v3/cash-flow-statement/{ticker}` - Cash flow statements.
  - `/api/v4/score?symbol={ticker}` - **IMPORTANT:** Financial scores (Altman Z-Score, Piotroski).
    - **Note:** Use `/api/v4/score` NOT `/stable/financial-scores` for international tickers.
  - `/api/v3/historical-price-full/{ticker}` - Price history.
  - `/api/v4/advanced_levered_dcf?symbol={ticker}` - Advanced DCF valuation.
- **Batch fetching:** All 24 endpoints fetched in parallel via `Promise.allSettled()`.
- **Error handling:** Individual endpoint failures don't break entire batch.

### Formatting & Display
- **Numbers:** Use `fmtNumber()` from service modules.
  ```typescript
  fmtNumber(1234567) // "1.23M"
  ```
- **Percentages:** Use `fmtPct()` from service modules.
  ```typescript
  fmtPct(0.1234) // "12.3%"
  ```
- **Dates:** ISO 8601 format (YYYY-MM-DD) for API, localized display in UI.
- **Ticker symbols:** Always uppercased and trimmed.

### Error Handling & Monitoring
- **Sentry:** Error tracking and performance monitoring (`sentryService.ts`).
- **Logging:** Structured logging via `logger.ts`.
- **Health checks:** `/api/health` endpoint monitors all services.
- **Monitoring:** Real-time metrics via `monitoringService.ts`.

## Integration Points
- **External APIs:** 
  - FMP (Financial Modeling Prep) API - all financial data.
  - Google OAuth API - social authentication.
- **Databases:**
  - **PostgreSQL** - User data, analytics, popular tickers (Prisma ORM).
  - **Redis** - Caching layer (ioredis client).
- **Charting:** ECharts (via `vue-echarts`) - all charts use ECharts.
- **Caching:** 
  - **Development:** Local Redis (Docker - port 6380).
  - **Production:** Render Redis (auto-configured, 25MB free).
  - Multi-layer: Client cache (5 min) + Redis (7 days) + ETag.
- **Process Management:** PM2 cluster mode (4 workers) with automatic load balancing.
- **Deployment:** Render.com (Web Service + PostgreSQL + Redis).

## Testing Strategy
- **Unit tests:** Vitest + @testing-library/vue (`tests/unit/`).
- **E2E tests:** API integration tests (`tests/e2e/`).
- **Test helpers:** Reusable test utilities in `tests/e2e/helpers.ts`.
- **Coverage:** Run `npm run test:coverage` for coverage report.
- **Mocking:** Prisma mocked via `tests/__mocks__/prisma.ts`.

## Common Tasks & Examples

### Add a New Chart
1. Create extraction function in `src/services/financials/batchChartService.ts`:
   ```typescript
   export function getMySeriesFromBatch(batchData: BatchData | null): ChartSeriesData {
     if (!batchData?.data.incomeAnnual) return []
     return batchData.data.incomeAnnual.map(item => [
       new Date(item.date).getTime(),
       item.myMetric
     ])
   }
   ```
2. Create composable (if needed) in `src/composables/`.
3. Wire to Vue component using `useTickerData()`.

### Add a New Table Metric
1. Update interface in `src/services/financials/batchTableService.ts`.
2. Create extraction function:
   ```typescript
   export function getMyMetricsFromBatch(batchData: BatchData | null): MyMetrics {
     // Extract and format data
   }
   ```
3. Use in component.

### Add a New Health Indicator
1. Define metrics interface in `src/services/health/healthIndicatorService.ts`.
2. Create calculation function:
   ```typescript
   export function calculateMyHealth(metrics: MyMetrics): HealthIndicator | null {
     // Calculate health score
     return { label: 'My Health', status: 'good', tooltip: '...' }
   }
   ```
3. Add to `calculateAllHealthIndicators()`.

### Add a New API Endpoint
1. Create route file in `server/routes/myRoute.ts`.
2. Define request/response types in `server/types/api.types.ts`.
3. Implement route handlers with proper error handling.
4. Register route in `server/server.ts`.
5. Add corresponding frontend service/composable.

## Batch Data Structure
```typescript
interface BatchData {
  ticker: string
  timestamp: string
  fetchDuration: number
  data: {
    profile: FMPProfile[]
    quote: FMPQuote[]
    incomeAnnual: FMPIncomeStatement[]
    incomeQuarter: FMPIncomeStatement[]
    balanceAnnual: FMPBalanceSheet[]
    balanceQuarter: FMPBalanceSheet[]
    cashflowAnnual: FMPCashFlow[]
    cashflowQuarter: FMPCashFlow[]
    keyMetrics: FMPKeyMetrics[]
    ratiosAnnual: FMPRatiosTTM[]
    priceHistory: { symbol: string; historical: FMPHistoricalPrice[] }
    revenueSegments: any[]
    dividendHistory: { symbol: string; historical: FMPDividend[] }
    stockSplit: { symbol: string; historical: FMPStockSplit[] }
    earningsCalendar: any[]
    financialScores: any[]  // Altman Z-Score, Piotroski Score
    priceTargetSummary: any[]
    priceTargetConsensus: any[]
    insiderTrading: FMPInsiderTrading[]
    // ... + more endpoints
  }
}
```

## Critical Notes
- **TypeScript is mandatory:** All new code must be TypeScript (.ts/.vue with `<script setup lang="ts">`).
- **Type safety:** Use types from `src/types/` - never use `any` without justification.
- **FMP endpoint:** Use `/api/v4/score` for financial scores (NOT `/stable/financial-scores`).
- **Database:** Always use Prisma client - never raw SQL (except for specific analytics).
- **Error handling:** All async functions must have try-catch blocks.
- **Caching:** Check Redis before hitting FMP API.
- **Authentication:** Protected routes must use `requireAuth` middleware.
- **Testing:** Add tests for new features (unit + E2E).

---
For questions or unclear patterns, review:
- `src/types/` - Type definitions
- `src/services/` - Business logic
- `server/services/` - Backend services
- `tests/` - Test examples

Try to avoid generating documents or md files, except when it is requested.