# Operations

## Admin-Protected Endpoints

For production operations, set `ADMIN_API_KEY` and send:

```text
X-Admin-Key: <your-secret>
```

Key endpoints:

- `GET /api/cache/stats`
- `POST /api/cache/clear`
- `GET /api/monitoring/stats`
- `POST /api/monitoring/reset`
- `GET /api/analytics/stats`
- `GET /api/health/database`

To require the admin key for readiness too:

```text
READINESS_REQUIRE_ADMIN_KEY=true
```

## Analytics

GA4 tracking is wired through:

- `index.html`
- `src/services/analytics/gaService.ts`

Tracked events include ticker search, watchlist actions, auth events, chart views, tool opens, and errors.

If analytics behavior changes, update the implementation and the docs together.

## AI Insights

The main app serves AI insights from:

- `public/ai-insights.json`

The runtime loader is:

- `src/services/ai/insightsService.ts`

The generation workflow lives in:

- `ai-insights-tool/`

## Common Commands

```bash
node scripts/pre-deploy-check.mjs
npm run security:audit
npm run db:studio
npm run docker:dev:up
npm run docker:dev:down
```

## Review Process

- active review checklist: `docs/PROJECT_REVIEW_PLAYBOOK.md`
- archived review records: `docs/reviews/`
