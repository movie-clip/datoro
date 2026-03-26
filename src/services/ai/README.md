# AI Insights Service

The main app loads pre-generated AI insights from `public/ai-insights.json`.

Current behavior:

- runtime loader: `src/services/ai/insightsService.ts`
- source bundle: `public/ai-insights.json`
- generation tool: `ai-insights-tool/`

This means:

- no runtime OpenAI or Ollama calls in the main app
- no AI API keys required for the main frontend
- missing insights fall back gracefully per ticker

To refresh the bundle:

1. generate insights in `ai-insights-tool/`
2. copy `ai-insights-tool/output/ai-insights.json` to `public/ai-insights.json`
3. verify in local dev with `npm run dev`

Project-level setup docs live in `docs/development.md`.
