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

### 2. Configure API Keys

**For first-time setup:**
1. Copy `.env.example` to `.env.local`
2. Get your API keys and add them to `.env.local`

```bash
# .env.local

# Required: FMP API Key (for financial data)
# Get yours at: https://site.financialmodelingprep.com/developer/docs
FMP_API_KEY=your_actual_fmp_api_key

# Optional: OpenAI API Key (for AI analysis features)
# Get yours at: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=your_openai_api_key
```

**Notes:**
- FMP API key is **required** for all financial data
- OpenAI API key is **optional** - only needed for "Competitive Advantages" and "Investment Risks" AI analysis sections
- Without OpenAI key, the dashboard will still work but AI sections will show an error
- If `.env.local` already exists, you can update keys there when needed

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

## Features

### Financial Data
- **9 Interactive Charts:** Price, Revenue (segmented), Operating Expenses (segmented), Free Cash Flow, EPS, Cash & Debt, Shares Outstanding, Dividend Yield, Insider Trading
- **4 Metrics Tables:** Valuation (including Forward P/E), Cash Flow (FCF yields), Margins & Growth, Balance Sheet (including Altman Z-Score)
- **Company Header:** Real-time price, P/L, next earnings date

### AI-Powered Analysis (Optional)
- **Competitive Advantages:** AI-generated analysis of company's moat and strengths
- **Investment Risks:** AI-generated risk assessment
- **Smart Caching:** Results cached for 30 days to minimize API costs
- **Cost-Efficient:** Uses GPT-4o-mini model (~150 tokens per analysis)

## Project Structure

- `src/components/` - Vue components (charts, tables, ticker bar)
- `src/composables/` - Data-fetching composables
- `src/services/financials/` - FMP provider for financial data
- `src/services/marketData/` - FMP provider for price data
- `src/services/ai/` - ChatGPT integration with caching
- `server/server.mjs` - Express proxy server

## Build

```bash
npm run build
npm run preview
```
