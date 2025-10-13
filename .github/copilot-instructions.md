# Copilot Instructions for `Factorly`

## Project Overview
- **Stack:** Vue 3 (script setup), Vite, ESM Node.js server (Express), Chart.js, ECharts, FMP (Financial Modeling Prep) API.
- **Purpose:** Interactive financial data dashboard for equities, showing price, revenue, cash flow, margins, and valuation metrics.
- **Data Architecture:** Single batch endpoint fetches all data from FMP (96.7% API reduction vs original multi-call approach).

## Architecture & Data Flow
- **Frontend:**
  - Vue SFCs in `src/components/` (e.g., `RevenueChart.vue`, `BaseChart.vue`).
  - State and data-fetching logic in `src/composables/` (e.g., `useTickerData.js` - shared batch data composable).
  - Chart rendering via ECharts (`vue-echarts`) and Chart.js.
  - Styling: `src/styles/globals.css` and component-scoped styles.
- **Data Services:**
  - All API calls proxied through Node server (`server/server.mjs`) to hide API keys and enable caching.
  - **Single batch endpoint:** `/api/ticker-data/:ticker?mode=full` fetches 17 FMP endpoints in parallel.
  - **Batch service:** `server/services/batchDataService.js` - parallel fetching of all financial data.
  - **Extraction services:** `src/services/financials/batchChartService.js` and `batchTableService.js` - extract data from batch for charts/tables.
  - **Multi-layer caching:** Client cache (5 min) → Redis cache (7 days) → FMP API.
  - Data cached in Redis (shared across PM2 workers) with intelligent TTL strategy.

## Developer Workflows
- **Start Dev Server:**
  - `npm install`
  - `npm run dev` (Vite, frontend only)
  - For backend proxy: `FINNHUB_API_KEY=YOUR_KEY node server/server.mjs` (Node 18+)
- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **No formal test suite** (as of Oct 2025).

## Key Conventions & Patterns
- **API Proxying:**
  - FMP endpoints: `/api/ticker-data/:ticker` (batch endpoint via Node server)
  - All FMP calls include API key injection server-side
- **Data Caching:**
  - **Client cache:** 5-minute TTL in `useTickerData.js` composable (Map-based, per browser session)
  - **Redis cache:** 7-day TTL for batch data (shared across all PM2 workers)
  - Cache keys: `ticker-data:{TICKER}:{mode}` for batch endpoint
- **Component Patterns:**
  - All components use `useTickerData(tickerRef)` composable to access shared batch data
  - Charts extract data via functions in `batchChartService.js` (e.g., `getRevenueSeriesFromBatch()`)
  - Tables extract data via functions in `batchTableService.js` (e.g., `getValuationFromBatch()`)
  - Charts expect `[ [timestamp, value], ... ]` arrays for time series
- **Formatting:**
  - Custom number/percent formatting in service modules (see `fmtNumber`, `fmtPct`).
- **Ticker Handling:**
  - Tickers are always uppercased and trimmed before use.

## Integration Points
- **External APIs:** FMP (Financial Modeling Prep) API only - all financial data
- **Charting:** ECharts (via `vue-echarts`), Chart.js
- **Caching:** Redis Cloud for server-side cache (shared across workers)
- **Process Management:** PM2 cluster mode (4 workers)
- **No authentication/authorization** in current codebase.

## Examples
- To add a new chart: Create extraction function in `batchChartService.js`, create composable using `useTickerData()`, wire to Vue component.
- To add a new table: Create extraction function in `batchTableService.js`, use in component with `useTickerData()`.
- Batch data structure: `{ ticker, timestamp, fetchDuration, data: { profile, quote, incomeAnnual, incomeQuarter, ... } }`

---
For questions or unclear patterns, review `src/services/` and `src/components/` for concrete usage examples.
