# Datoro

Financial dashboard built with Vue 3, Vite, Express, Prisma, PostgreSQL, Redis, and Vitest.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy the environment template and fill in the required values:
```bash
cp .env.example .env.local
```

3. Start the frontend and backend together:
```bash
npm run start:dev
```

4. Open:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:7071`

Minimum local env vars:
- `DATABASE_URL`
- `FMP_API_KEY`
- `JWT_SECRET`

## Common Scripts

```bash
# development
npm run dev
npm run server
npm run server:dev
npm run start
npm run start:dev

# validation
npm run lint:check
npm run type-check
npm run type-check:server
npm run type-check:tests
npm test
npm run test:e2e
npm run build
```

## Project Structure

- `src/` frontend app
- `server/` backend API and services
- `prisma/` schema and migrations
- `tests/` unit, e2e, and load tests
- `docs/` active project docs
- `ai-insights-tool/` standalone AI insights generator

## Documentation

- `docs/development.md` local setup, env vars, structure, and AI insights workflow
- `docs/testing.md` unit, e2e, and load testing
- `DEPLOYMENT.md` deployment and pre-deploy checks
- `docs/operations.md` analytics, admin endpoints, and operations notes
- `docs/PROJECT_REVIEW_PLAYBOOK.md` recurring review checklist
- `docs/reviews/README.md` archived review and audit records

## Notes

- AI insights load from `public/ai-insights.json`; the main app does not call OpenAI or Ollama at runtime.
- GitHub workflows live in `.github/workflows/`.
- Render deployment is defined in `render.yaml`.

