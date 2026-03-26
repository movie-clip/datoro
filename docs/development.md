# Development

## Requirements

- Node.js `>=18 <23`
- npm
- PostgreSQL for database-backed features
- Redis is optional locally, but recommended for realistic backend behavior
- `FMP_API_KEY` for financial data

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Fill in the minimum required values:

- `DATABASE_URL`
- `FMP_API_KEY`
- `JWT_SECRET`

4. Start the app:

```bash
npm run start:dev
```

Other common commands:

```bash
npm run server
npm run server:dev
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:7071`

## Environment Notes

- Use `.env.example` as the env reference.
- `server:dev` loads `.env.development.local`.
- `VITE_API_BASE_URL` can stay empty in local development.
- `REDIS_URL` is optional locally; memory cache still works.

## Project Layout

- `src/` Vue frontend
- `src/components/` UI components
- `src/composables/` reusable frontend logic
- `src/services/` domain and data services
- `server/` Express routes, middleware, and services
- `prisma/` schema and migrations
- `tests/` unit, e2e, and load tests

## AI Insights

The app uses a static bundle at `public/ai-insights.json`.

- runtime code loads the bundle through `src/services/ai/insightsService.ts`
- the main app does not call OpenAI or Ollama at runtime
- new insights are generated separately in `ai-insights-tool/`

Update flow:

1. Generate or refresh insights in `ai-insights-tool/`
2. Copy `ai-insights-tool/output/ai-insights.json` to `public/ai-insights.json`
3. Run `npm run dev` and verify a ticker with bundled insights

## Common Commands

```bash
npm run lint:check
npm run lint:fix
npm run type-check
npm run type-check:server
npm run type-check:tests
npm test
npm run test:e2e
npm run build
```

## Related Docs

- `docs/testing.md`
- `DEPLOYMENT.md`
- `docs/operations.md`
- `scripts/voice-generation/README.md`
