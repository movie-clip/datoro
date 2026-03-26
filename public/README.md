# Public Assets

This folder contains static assets served directly by the frontend.

Important generated asset:

- `public/ai-insights.json` - bundled AI insights used by the main app

To refresh AI insights:

1. generate a new bundle in `ai-insights-tool/`
2. copy `ai-insights-tool/output/ai-insights.json` into this folder
3. verify with `npm run dev`

See `docs/development.md` for the main workflow.
