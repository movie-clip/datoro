# Datoro Project Review — 2026-02-27

Scope: full review using `PROJECT_REVIEW_PLAYBOOK.md`.

## Executive summary
Project is stable and shippable, but quality debt remains high in lint warnings and documentation drift.

**Overall grade: B**

- Runtime/build health is good.
- Type safety gates pass.
- Unit tests pass.
- Main weakness is code quality debt (734 lint warnings) and noisy security-audit script behavior.

---

## 1) Quality gate scorecard

| Gate | Result | Notes |
|---|---|---|
| `node scripts/pre-deploy-check.mjs` | ✅ Pass | Completed successfully before this review |
| `npm run lint:check` | ⚠️ Pass with warnings | 734 warnings, 0 errors |
| `npm run type-check` | ✅ Pass | No frontend type errors |
| `npm run type-check:server` | ✅ Pass | No backend type errors |
| `npm run test` | ✅ Pass | 24 files, 467 tests passed |
| `npm run security:audit` | ⚠️ Pass with tool noise | Reports pass, but emits many `line is not defined` file-read warnings |

---

## 2) Key findings

### P1 — High priority
1. **Lint warning backlog is very large (734)**
   - This is slowing clean PR review and hides meaningful warnings.
   - Dominant categories: `@typescript-eslint/no-explicit-any`, `no-console`, unused vars.

2. **Security audit script reliability issue**
   - Script reports success but outputs a large number of warnings like `line is not defined` when scanning files.
   - This reduces trust in audit output and should be fixed before relying on it for release gates.

### P2 — Medium priority
3. **README drift from real codebase**
   - README still says frontend includes Chart.js at [README.md](README.md#L11), while project standard is ECharts.
   - README references `server/server.mjs` at [README.md](README.md#L126), but current server entry is `server/server.ts`.

4. **Known test log noise**
   - Unit tests pass, but output contains expected mocked warning/error logs.
   - Recommend reducing noise where possible to keep CI output signal high.

---

## 3) Improvement plan (short, practical)

### Sprint 1 (1 week)
- Fix `security-audit.mjs` scanner bug causing `line is not defined` warnings.
- Update README tech stack and server entrypoint references.
- Add `lint:baseline` tracking in CI (current count + trend).

### Sprint 2 (1–2 weeks)
- Reduce lint warnings by ~30–40% in core app paths first:
  - `src/stores/`
  - `src/services/financials/`
  - `src/components/layout/`
- Prioritize replacing `any` with concrete types in data extraction/transform paths.

### Sprint 3 (ongoing)
- Enforce warning budget for new code (no net increase).
- Continue warning burn-down per feature area.

---

## 4) Suggested owners
- **Tooling/CI:** backend maintainer (security audit script + lint baseline)
- **Docs:** frontend lead (README and deployment docs alignment)
- **Type/lint debt:** shared across feature owners by module

---

## 5) Next review checkpoint
- **Date:** 2026-03-13
- **Goal:**
  - lint warnings < 500
  - security audit script clean run (no scanner warnings)
  - README drift items closed
