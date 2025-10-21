# AI Insights - Static JSON Files

Pre-generated AI insights served as static files (zero cost, fast delivery).

## 🚀 Generate Insights

**Prerequisites:**
1. Configure your AI provider (OpenAI/Ollama) locally for generation
2. See `scripts/generate-ai-insights.mjs` for configuration details

**Generate specific tickers:**
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT NVDA
# Automatically builds optimized bundle after generation
```

**Generate test set (10 tickers):**
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT AMZN GOOGL CRM ASML TSM DUOL SPGI MSCI
```

## ⚡ Optimization: Bundled Approach

**For 500 companies, we use a single bundle instead of 500 files:**

- ✅ **1 HTTP request** instead of 500
- ✅ **165 KB gzipped** instead of 700 KB
- ✅ **0.2s load time** instead of 25s
- ✅ **In-memory cache** for instant lookups
- ✅ **76% size reduction** with compression

**Bundle is automatically created** when you run the generation script!

Manual bundle build:
```bash
node scripts/build-insights-bundle.mjs
```

## 📝 File Format

```json
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "generated": "2025-01-15T10:30:00.000Z",
  "version": "1.0",
  "advantages": [
    { "title": "Brand Loyalty", "description": "..." },
    { "title": "Ecosystem Lock-in", "description": "..." }
  ],
  "risks": [
    { "title": "China Dependence", "description": "..." }
  ]
}
```

## ⚠️ Rate Limits

If you hit rate limits during generation:
- Wait a few minutes
- Run script again with failed tickers only
- Or increase delay in script (change `3000` to `5000` ms)

## 🧪 Testing

```bash
# Test in browser
npm run dev
# Search for ticker → Load AI insights from static files
```
