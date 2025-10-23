# AI Insights - Static Bundle

Pre-generated AI insights served as a single optimized bundle (zero cost, fast delivery).

## 🚀 Generate Insights

**Prerequisites:**
1. Configure your AI provider (OpenAI/Ollama) locally for generation
2. See `scripts/generate-ai-insights.mjs` for configuration details

**Generate specific tickers:**
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT NVDA
# Automatically creates optimized bundle (ai-insights.json)
```

**Generate test set (10 tickers):**
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT AMZN GOOGL CRM ASML TSM DUOL SPGI MSCI
```

## ⚡ Bundle Architecture

**Single bundle file instead of individual files:**

- ✅ **1 HTTP request** for all insights
- ✅ **~26 KB** bundle size (~7 KB gzipped)
- ✅ **0.2s load time** with instant lookups
- ✅ **In-memory cache** after first load
- ✅ **No build step** required - generated directly

**The script creates `ai-insights.json` directly** - no separate build needed!

## 📝 Bundle Format

The generated bundle (`ai-insights.json`) uses an optimized format:

```json
{
  "AAPL": {
    "advantages": [
      { "title": "Brand Loyalty", "description": "..." },
      { "title": "Ecosystem Lock-in", "description": "..." }
    ],
    "risks": [
      { "title": "China Dependence", "description": "..." }
    ],
    "updated": "2025-10-17",
    "provider": "ollama"
  },
  "MSFT": { ... }
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
# Search for ticker → Load AI insights from bundle
```
