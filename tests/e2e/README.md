# E2E Tests

Canonical testing docs live in `docs/testing.md`.

## Run E2E Tests

Start the backend first:

```bash
npm run server
```

Then run:

```bash
npm run test:e2e
```

Useful targeted commands:

```bash
npm run test:e2e:auth
npm run test:e2e:ticker
npm run test:e2e:dcf
npm run test:e2e:watchlist
```

Notes:

- default API URL is `http://localhost:7071`
- override with `TEST_API_URL`
- test setup file is `tests/setup.ts`
- some suites require a working database, Redis, and `FMP_API_KEY`
