# Testing

This file covers unit, e2e, and load testing.

## Quick Commands

```bash
npm test
npm run test:unit
npm run test:e2e
npm run test:all
npm run test:coverage
```

## Unit Tests

- default command: `npm test`
- explicit unit suite: `npm run test:unit`
- single file:

```bash
npx vitest run tests/unit/path/to/file.test.ts
```

## E2E Tests

E2E tests expect the backend server to already be running.

Start the backend first:

```bash
npm run server
```

Or use the development env file:

```bash
npm run server:dev
```

Then run:

```bash
npm run test:e2e
```

Targeted suites:

```bash
npm run test:e2e:auth
npm run test:e2e:ticker
npm run test:e2e:dcf
npm run test:e2e:watchlist
```

Direct file runs:

```bash
npx vitest run tests/e2e/auth-flow.test.ts
npx vitest run tests/e2e/ticker-flow.test.ts
npx vitest run tests/e2e/dcf-data.test.ts
npx vitest run tests/e2e/watchlist.test.ts
```

Notes:

- default API URL is `http://localhost:7071`
- override with `TEST_API_URL`
- database, Redis, and `FMP_API_KEY` may be required depending on the suite
- test setup file is `tests/setup.ts`

## Load Tests

Load tests live in `tests/load/` and use k6.

Install k6, start the backend, then run one of:

```bash
k6 run tests/load/mixed-workload.js
k6 run tests/load/cached-workload.js
k6 run tests/load/split-cached-workload.js
k6 run tests/load/warm-efficiency-workload.js
k6 run tests/load/watchlist-stress.js
k6 run tests/load/dcf-stress.js
```

Common local setup:

```bash
npm run docker:dev:up
npm run server
```

To point k6 at a custom backend:

```bash
k6 run --env API_URL=http://localhost:7071 tests/load/mixed-workload.js
```

## Validation Flow

For a typical code change:

1. `npm run lint:check`
2. `npm run type-check`
3. `npm run type-check:server`
4. `npm run type-check:tests`
5. `npm test`
6. `npm run test:e2e` when backend behavior or critical flows changed

## CI

- GitHub Actions workflows live in `.github/workflows/`
- PR validation currently runs tests, lint, type checks, and build
- local CI dry run: `npm run ci:local:dry`
