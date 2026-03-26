# AI Insights Tool

Standalone app for generating the static AI insights bundle used by the main Datoro app.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5174`.

## Output

Generated insights are written to:

- `output/ai-insights.json`

To use them in the main app, copy that file to:

- `public/ai-insights.json`

## Notes

- this tool is separate from the main app
- the main app serves static AI insights and does not call AI providers at runtime
