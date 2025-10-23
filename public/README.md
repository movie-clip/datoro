# AI Insights - Static Bundle

Pre-generated AI insights served as a single optimized bundle (zero cost, fast delivery).

## 🚀 Generate Insights

**Using the AI Insights Tool:**

1. Navigate to the tool:
```bash
cd ai-insights-tool
```

2. Start the application:
```bash
npm run start:dev
```

3. Open http://localhost:5174 in your browser

4. Enter tickers, generate insights, and download the bundle

5. Copy `ai-insights-tool/output/ai-insights.json` to `public/ai-insights.json`

See `ai-insights-tool/README.md` for detailed instructions.

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
