# Copilot Instructions for `finance-view`

## Project Overview
- **Stack:** Vue 3 (script setup), Vite, ESM Node.js server (Express), Chart.js, ECharts, Finnhub & Yahoo Finance APIs.
- **Purpose:** Interactive financial data dashboard for equities, showing price, revenue, cash flow, margins, and valuation metrics.

## Architecture & Data Flow
- **Frontend:**
  - Vue SFCs in `src/components/` (e.g., `RevenueChart.vue`, `BaseChart.vue`).
  - State and data-fetching logic in `src/composables/` (e.g., `useRevenueSeries.js`).
  - Chart rendering via ECharts (`vue-echarts`) and Chart.js.
  - Styling: `src/styles/globals.css` and component-scoped styles.
- **Data Services:**
  - All API calls are proxied through Vite dev server (`vite.config.js` proxy) or the custom Node server (`server/server.mjs`) to avoid CORS and hide API keys.
  - Financial data providers in `src/services/financials/` (Yahoo, Finnhub) and `src/services/marketData/` (Yahoo, Stooq).
  - Company KPIs, margins, and valuation logic in `src/services/company/`.
  - Data is cached in-memory per session (see `cache` in service modules).

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
  - Yahoo endpoints: `/yapi/*` (price), `/y2api/*` (fundamentals)
  - Finnhub endpoints: `/api/finnhub/*` (via Node server)
- **Data Caching:**
  - Service modules cache results in a `Map` keyed by ticker/period.
- **Component Patterns:**
  - Charts expect `[ [timestamp, value], ... ]` arrays.
  - Use composables for async data/state (e.g., `useRevenueSeries`).
- **Formatting:**
  - Custom number/percent formatting in service modules (see `fmtNumber`, `fmtPct`).
- **Ticker Handling:**
  - Tickers are always uppercased and trimmed before use.

## Integration Points
- **External APIs:** Yahoo Finance, Finnhub, Stooq (via server or Vite proxy)
- **Charting:** ECharts (via `vue-echarts`), Chart.js
- **No authentication/authorization** in current codebase.

## Examples
- To add a new financial metric, create a provider in `src/services/financials/`, expose via `index.js`, and wire to a composable/component.
- To add a new chart, create a Vue SFC in `src/components/`, use `BaseChart` for rendering, and fetch data via a composable.

---
For questions or unclear patterns, review `src/services/` and `src/components/` for concrete usage examples.
