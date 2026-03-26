# AGENTS.md

## Scope

- This file is for coding agents working in `D:\projects\datoro`.
- Primary app stack: Vue 3 + Vite + TypeScript frontend, Express + TypeScript backend, Prisma + PostgreSQL, Redis, Vitest.
- Main product goal: financial dashboard driven by a single batch ticker endpoint.
- Only rules file found in-repo: `.github/copilot-instructions.md`.
- No `.cursorrules` file or `.cursor/rules/` directory exists at the repo root.
- There is also a standalone `ai-insights-tool/` app, but root lint config ignores it; default to the main app unless the task explicitly targets that subproject.

## Repository Map

- `src/` - Vue frontend code.
- `src/components/` - UI components grouped by feature.
- `src/composables/` - reusable stateful logic, usually `useXxx.ts`.
- `src/services/` - frontend/domain logic and data transformation.
- `src/types/` - centralized TypeScript type exports.
- `server/` - Express API, middleware, services, config, and route handlers.
- `prisma/` - Prisma schema and migrations.
- `tests/unit/` - Vitest unit tests.
- `tests/e2e/` - API-style integration/E2E tests.
- `tests/load/` - k6 load testing scripts and docs.

## Install And Run

```bash
npm install
```

```bash
# frontend only
npm run dev

# backend only
npm run server

# backend with .env.development.local
npm run server:dev

# frontend + backend together
npm run start

# frontend + backend together with development env file
npm run start:dev
```

## Build, Lint, Typecheck

```bash
# production frontend build
npm run build

# preview built frontend
npm run preview

# lint all main-app code
npm run lint:check

# auto-fix lint issues where possible
npm run lint:fix

# frontend type check
npm run type-check

# backend type check
npm run type-check:server

# test project type check
npm run type-check:tests

# quick validation used before push
npm run validate:quick

# broader validation
npm run validate
```

Notes:

- Use `npm run lint:check`, not `npm run lint`; the package script is `lint:check`.
- `build` covers the Vite frontend build only.
- TypeScript is in strict mode for app and server configs.

## Test Commands

```bash
# default unit suite
npm test

# all tests matched by Vitest config
npm run test:all

# unit tests explicitly
npm run test:unit

# watch mode
npm run test:watch

# UI runner
npm run test:ui

# coverage
npm run test:coverage

# all e2e tests
npm run test:e2e

# targeted e2e scripts
npm run test:e2e:auth
npm run test:e2e:ticker
npm run test:e2e:dcf
npm run test:e2e:watchlist
```

## Running A Single Test

Preferred generic pattern:

```bash
npx vitest run tests/unit/path/to/file.test.ts
npx vitest run tests/e2e/path/to/file.test.ts
```

Run one test file and filter to one test name:

```bash
npx vitest run tests/unit/services/cacheService.test.ts -t "should set and get from memory cache"
```

Useful real examples from this repo:

```bash
npx vitest run tests/unit/services/batchDataService.test.ts
npx vitest run tests/unit/services/cacheService.test.ts
npx vitest run tests/e2e/auth-flow.test.ts
```

Watch a subset while developing:

```bash
npx vitest tests/unit/services/cacheService.test.ts --watch
npm run test:e2e:watch
```

## CI And Verification Caveats

- Do not assume CI currently enforces lint and type-checks reliably.
- `.github/workflows/ci.yml` tries `npm run lint`, but the actual script is `npm run lint:check`; that CI lint step is also `continue-on-error`.
- `.github/workflows/pr-checks.yml` runs tests and build, but not lint or type-check commands.
- If you change TypeScript, lint-sensitive code, or imports, run the relevant local checks yourself: `npm run lint:check`, `npm run type-check`, `npm run type-check:server`, and `npm run type-check:tests` as needed.
- CI Node versions are inconsistent today: `ci.yml` uses Node 22, while `pr-checks.yml` uses Node 18. Prefer changes that are compatible across both unless the repo standard is updated.
- `vitest.config.js` references `./tests/setup.js`, while the file present in the repo is `tests/setup.ts`; if test bootstrap behaves unexpectedly, verify this mismatch first.

## E2E And Environment Notes

- E2E tests expect the backend server to already be running.
- Start backend first with `npm run server` or `npm run server:dev`.
- Default API URL is `http://localhost:7071` unless `TEST_API_URL` overrides it.
- E2E flows may also need valid `DATABASE_URL`, Redis, and `FMP_API_KEY` in local env files.
- Vitest is configured for `environment: 'node'`, `globals: true`, and sequential execution to reduce DB conflicts.

## Database And Infra Commands

```bash
npm run db:migrate
npm run db:migrate:dev
npm run db:push
npm run db:studio
npm run db:monitor

npm run docker:dev:up
npm run docker:dev:down
npm run docker:dev:logs
```

## Rules Imported From `.github/copilot-instructions.md`

- Use TypeScript everywhere; new frontend code should be `.vue` with `<script setup lang="ts">` or `.ts` modules.
- Prefer centralized types from `src/types/`; avoid `any` unless justified.
- Frontend charts use ECharts via `vue-echarts`; do not introduce Chart.js-based patterns.
- Main data path is the batch ticker endpoint: `/api/ticker-data/:ticker?mode=full`.
- Batch extraction belongs in services like `src/services/financials/batchChartService.ts` and `src/services/financials/batchTableService.ts`.
- Use `healthIndicatorService.ts` for health scoring instead of inventing parallel logic.
- For financial scores, use the FMP `/api/v4/score` endpoint, not `/stable/financial-scores`.
- Protected routes must use auth middleware such as `requireAuth`.
- Prisma is the default DB access layer; avoid raw SQL unless there is a clear existing exception.
- Add tests for new features, especially when touching backend services or data extraction.

## Import And Module Conventions

- Frontend commonly uses the `@/` alias for imports from `src/`.
- Frontend also contains some relative imports; prefer the existing style of the file you are editing and avoid churn-only rewrites.
- Server code is ESM TypeScript and imports local modules with explicit `.js` extensions, for example `../services/logger.js`.
- Use `import type` for type-only imports when possible.
- Keep exports centralized when a feature already has an index or type barrel.

## Formatting And File Editing

- No dedicated Prettier config is present; do not reformat files wholesale.
- Follow the local style of the file you are touching.
- In practice, frontend files are often semicolon-light; some server files use semicolons. Preserve nearby style.
- Prefer single quotes unless the surrounding file consistently uses something else.
- Keep diffs focused; avoid style-only changes mixed with logic changes.
- ESLint enforces `prefer-const`, `no-var`, and warns on most `console` usage in app/server code.

## TypeScript Guidelines

- Assume strict TypeScript and satisfy the compiler without weakening types.
- Start from existing domain interfaces in `src/types/` and `server/types/` before creating new ones.
- Validate external API data at boundaries; this repo already uses Zod in backend batch fetching.
- Avoid `any`; if unavoidable, keep it local and documented by naming or narrow casts.
- Prefer narrow return types for services and composables.
- Keep nullable and fallback behavior explicit, especially for financial data with partial coverage.

## Naming Conventions

- Vue components: `PascalCase.vue`.
- Composables: `useXxx.ts`.
- Services: descriptive `camelCase` exports inside `*Service.ts` files.
- Types/interfaces: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` when they are true constants shared broadly.
- Test files: `*.test.ts` colocated under `tests/unit/` or `tests/e2e/`.

## Vue Frontend Patterns

- Prefer `<script setup lang="ts">`.
- Use typed `defineProps`, `withDefaults`, and `defineEmits` patterns already common in components.
- Reuse shared UI primitives when applicable, especially `src/components/common/BaseDropdown.vue` for dropdowns.
- Keep component state in composables when logic is reusable or data-heavy.
- Use component-scoped styles for local styling, and shared CSS only when multiple features depend on it.
- For large chart datasets, preserve existing ECharts performance patterns such as progressive rendering, sampling, and stable keys.
- Do not force chart rerenders with data-dependent `:key` props when smooth updates are expected.

## Backend Patterns

- Prefer route handlers wrapped with `server/utils/asyncHandler.ts`.
- Validate input close to the edge using the existing Joi validation middleware when a route already follows that pattern.
- Normalize tickers to uppercase and trimmed values before cache or API operations.
- Keep caching/versioning behavior intact when touching ticker or macro routes.
- Use service modules for side effects and data access; keep route files focused on HTTP concerns.

## Error Handling And Logging

- Do not use `console.log` in production backend code.
- Use `server/services/logger.ts` for server logging.
- For backend errors, prefer structured logging with context metadata.
- Use the centralized error middleware in `server/middleware/errorHandler.ts`; do not leak stacks to clients.
- For async server work, either throw typed errors or pass failures into existing error utilities.
- Frontend code still contains some `console.error` usage; follow existing patterns sparingly and avoid adding noisy logs unless needed for diagnosis.

## Testing Expectations

- Unit tests are the default fast feedback loop.
- E2E tests are sequential and can conflict with shared DB state; keep them isolated and clean up test data.
- Mock external systems in unit tests when possible: FMP HTTP, Redis, Prisma, and auth boundaries already have examples.
- When adding backend behavior, prefer at least one service-level unit test.
- When adding a critical user flow or API contract, add or extend an E2E test.

## Agent Workflow Tips

- Check for existing patterns before inventing a new abstraction.
- Preserve batch-fetch, cache, auth, and health-indicator architecture unless the task explicitly changes them.
- Be careful with env-dependent commands; avoid destructive DB commands unless explicitly requested.
- If you touch docs, keep them aligned with actual scripts and config files rather than stale workflow placeholders.
