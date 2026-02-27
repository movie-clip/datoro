# Project Review Playbook (Datoro)

Use this as the single checklist for every review cycle.

## 1) Define scope (5 min)
- Pick a review type:
  - `quick` (PR / small change)
  - `full` (release / monthly)
- Set review date and branch.
- Define success criteria for this cycle.

## 2) Run health gates (10–20 min)
Run from workspace root:

```powershell
node scripts/pre-deploy-check.mjs
npm run lint:check
npm run type-check
npm run type-check:server
npm run test
npm run security:audit
```

Record:
- pass/fail per command
- warning/error counts
- flaky behavior
- runtime notes

## 3) Architecture sanity check (15 min)
Verify these are still true:
- frontend uses `useTickerStore` and split static/dynamic endpoints
- backend ticker pipeline still uses cache + quote refresh strategy
- no direct FMP key exposure in client code
- auth-protected endpoints still use auth/admin middleware

## 4) Data correctness checks (10 min)
- Pick 3 tickers: one US large cap, one international (e.g. `.L`), one edge case.
- Validate core tabs: price, earnings, valuation, cash flow, insider.
- Confirm empty states are accurate and not misleading.

## 5) Observability & security checks (10 min)
- Check health endpoints behavior and access controls.
- Confirm logs are structured and no sensitive values are logged.
- Confirm security script result and note any script reliability issues.

## 6) Docs & config drift check (10 min)
- README accuracy vs actual code paths/scripts.
- Deployment docs accuracy (`DEPLOYMENT.md`, env vars, server entrypoint).
- Remove stale references and deprecated instructions.

## 7) Produce review output (15 min)
Create `docs/PROJECT_REVIEW_YYYY-MM-DD.md` with:
1. Executive summary
2. Scorecard (quality gates)
3. Top risks (P0/P1/P2)
4. Improvement plan (owner + ETA)
5. Next review date

---

## Review scoring rubric
- **Build health:** all type checks + tests pass
- **Code quality:** lint warnings trend down
- **Security:** no critical findings; tooling reliable
- **Data quality:** sampled tickers render correct values
- **Docs quality:** no known drift

Grade:
- **A**: all green, no major drift
- **B**: stable but with known medium issues
- **C**: quality debt slowing delivery
- **D/F**: release risk
