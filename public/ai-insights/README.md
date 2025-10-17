# AI Insights - Static JSON Files

Pre-generated AI insights served as static files (zero cost, fast delivery).

## 🚀 Generate Insights

**Prerequisites:**
1. Start your server: `npm run pm2:start` (or `node server/server.mjs`)
2. Ensure your AI provider (ChatGPT/Claude/etc) is configured in `.env`

**Generate specific tickers:**
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT NVDA
```

**Generate test set (10 tickers):**
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT AMZN GOOGL CRM ASML TSM DUOL SPGI MSCI
```

## ⚡ Features

- ✅ Uses exact same prompts and API as web page
- ✅ Identical user experience (same AI responses)
- ✅ Saves to JSON files automatically
- ✅ Rate limiting built-in (3s delay between tickers)
- ✅ Retry logic for API failures
- ✅ Progress tracking and error reporting

## 📝 File Format

```json
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "lastUpdated": "2025-10-18",
  "version": "1.0",
  "provider": "ollama",
  "insights": {
    "competitiveAdvantages": [
      { "title": "Brand Loyalty", "description": "..." },
      { "title": "Ecosystem Lock-in", "description": "..." }
    ],
    "investmentRisks": [
      { "title": "China Dependence", "description": "..." }
    ]
  }
}
```

## ⚠️ Rate Limits

If you hit rate limits:
- Wait a few minutes
- Run script again with failed tickers only
- Or increase delay in script (change `3000` to `5000` ms)

## 🧪 Test Files

```bash
# Validate JSON structure
node tests/manual/test-static-insights.mjs

# Test in browser
npm run dev
# Search for ticker → Click "AI Analysis" tab
```
