# Load Tests

Canonical testing docs live in `docs/testing.md`.

## Prerequisites

- install k6
- start the backend with `npm run server` or `npm run server:dev`
- start Redis if the scenario depends on it

## Common Commands

```bash
k6 run tests/load/mixed-workload.js
k6 run tests/load/cached-workload.js
k6 run tests/load/split-cached-workload.js
k6 run tests/load/warm-efficiency-workload.js
k6 run tests/load/watchlist-stress.js
k6 run tests/load/dcf-stress.js
```

Custom API target:

```bash
k6 run --env API_URL=http://localhost:7071 tests/load/mixed-workload.js
```
