# Finance View

Interactive financial data dashboard built with Vue 3, displaying equity price charts, revenue, cash flow, margins, and valuation metrics.

## Tech Stack

- **Frontend:** Vue 3 (script setup), Vite, ECharts, Chart.js
- **Backend:** Express proxy server (Node 18+)
- **Data Provider:** Financial Modeling Prep (FMP)

## Quick Start

**Option 1: Start both servers with one command (recommended)**
```bash
npm install
npm start
```

**Option 2: Start servers separately**
```bash
# Terminal 1: Backend server
npm run server

# Terminal 2: Frontend dev server  
npm run dev
```

Open `http://localhost:5173` in your browser.

## Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure FMP API Key

**For first-time setup:**
1. Copy `.env.example` to `.env.local`
2. Get your free API key from [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs)
3. Replace `your_fmp_api_key_here` with your actual key in `.env.local`

```bash
# .env.local
FMP_API_KEY=your_actual_fmp_api_key
```

**Note:** If `.env.local` already exists, you can update the API key there when needed.

### 3. Start Backend Proxy Server
The backend server automatically loads the API key from `.env.local`:
```bash
npm run server
```

The server will start on `http://localhost:7071` and securely inject the API key server-side (never exposed to browser).

### 4. Start Frontend Dev Server
In a separate terminal:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Project Structure

- `src/components/` - Vue components (charts, tables, ticker bar)
- `src/composables/` - Data-fetching composables
- `src/services/financials/` - FMP provider for financial data
- `src/services/marketData/` - FMP provider for price data
- `server/server.mjs` - Express proxy server

## Build

```bash
npm run build
npm run preview
```
