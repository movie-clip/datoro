import { handleServiceError } from '../shared.js';

// Returns { data: { ... }, error: string|null }
export async function fetchValuation(ticker) {
  const t = (ticker || '').trim().toUpperCase();
  const out = {
    marketCap: '—',
    pe: '—',
    fpe: '—',
    ps: '—',
    pb: '—',
    evEbitda: '—',
  };
  if (!t) return { data: out, error: 'No ticker provided' };
  let mcUsd = NaN;
  let evUsd = NaN;
  let netDebtUsd = NaN;
  let totalDebtUsd = NaN;
  let totalCashUsd = NaN;
  let ebitdaTtmUsd = NaN;
  let ebitdaAnnualUsd = NaN;
  try {
    // 1) Basic metrics (TTM ratios + EV components if available)
    const basic = await f(`/api/finnhub/stock/metric?symbol=${encodeURIComponent(t)}&metric=all`);
    const m = basic?.metric || {};
    if (Number.isFinite(m.marketCapitalization)) {
      mcUsd = toUSD(m.marketCapitalization);
      out.marketCap = fmtNumber(mcUsd);
    }
    const pe = Number(m.peInclExtraTTM ?? m.peExclExtraTTM);
    const ps = Number(m.psTTM);
    const pb = Number(m.pb);
    if (Number.isFinite(pe)) out.pe = fmtRatio(pe);
    if (Number.isFinite(ps)) out.ps = fmtRatio(ps);
    if (Number.isFinite(pb)) out.pb = fmtRatio(pb);
    if (Number.isFinite(m.enterpriseValue))    evUsd = toUSD(m.enterpriseValue);
    if (Number.isFinite(m.netDebt))            netDebtUsd = toUSD(m.netDebt);
    if (Number.isFinite(m.totalDebt))          totalDebtUsd = toUSD(m.totalDebt);
    if (Number.isFinite(m.totalCash))          totalCashUsd = toUSD(m.totalCash);
    if (Number.isFinite(m.ebitdaTTM))          ebitdaTtmUsd = toUSD(m.ebitdaTTM);

    // 2) Fallback Market Cap from profile2 (if missing)
    if (!Number.isFinite(mcUsd)) {
      try {
        const prof = await f(`/api/finnhub/stock/profile2?symbol=${encodeURIComponent(t)}`);
        const mc = toUSD(prof?.marketCapitalization);
        if (Number.isFinite(mc)) {
          mcUsd = mc;
          out.marketCap = fmtNumber(mcUsd);
        }
      } catch {}
    }

    // 3) Financials (Income Statement annual) for fallback EBITDA
    if (!Number.isFinite(ebitdaTtmUsd)) {
      try {
        const finIC = await f(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=ic&freq=annual`);
        const rows = Array.isArray(finIC?.data) ? finIC.data : [];
        const latest = rows.find(r => r?.ebitda != null) || rows[0];
        const e = toUSD(latest?.ebitda);
        if (Number.isFinite(e)) ebitdaAnnualUsd = e;
      } catch {}
    }

    // 4) Financials (Balance Sheet annual) for fallback debt/cash
    if (!Number.isFinite(totalDebtUsd) || !Number.isFinite(totalCashUsd)) {
      try {
        const finBS = await f(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=bs&freq=annual`);
        const rows = Array.isArray(finBS?.data) ? finBS.data : [];
        const latest = rows[0] || {};
        if (!Number.isFinite(totalDebtUsd) && Number.isFinite(latest.totalDebt)) {
          totalDebtUsd = toUSD(latest.totalDebt);
        }
        if (!Number.isFinite(totalCashUsd)) {
          const cash = Number.isFinite(latest.cashAndShortTermInvestments)
            ? latest.cashAndShortTermInvestments
            : latest.totalCash;
          if (Number.isFinite(cash)) totalCashUsd = toUSD(cash);
        }
      } catch {}
    }

    // 5) Compute EV if missing, then EV/EBITDA
    if (!Number.isFinite(evUsd)) {
      if (Number.isFinite(mcUsd) && Number.isFinite(netDebtUsd)) {
        evUsd = mcUsd + netDebtUsd;
      } else if (Number.isFinite(mcUsd) && (Number.isFinite(totalDebtUsd) || Number.isFinite(totalCashUsd))) {
        const debt = Number.isFinite(totalDebtUsd) ? totalDebtUsd : 0;
        const cash = Number.isFinite(totalCashUsd) ? totalCashUsd : 0;
        evUsd = mcUsd + debt - cash;
      }
    }

    // Prefer EBITDA TTM for the ratio; fallback to latest annual
    const ebitdaForRatio = Number.isFinite(ebitdaTtmUsd) ? ebitdaTtmUsd : ebitdaAnnualUsd;
    if (Number.isFinite(evUsd) && Number.isFinite(ebitdaForRatio) && ebitdaForRatio > 0) {
      out.evEbitda = fmtRatio(evUsd / ebitdaForRatio);
    } else {
      out.evEbitda = '—';
    }

    // 6) Forward P/E (unchanged)
    try {
      const q = await f(`/api/finnhub/quote?symbol=${encodeURIComponent(t)}`);
      const price = Number(q?.c);
      if (Number.isFinite(price) && price > 0) {
        const est = await f(`/api/finnhub/stock/eps-estimate?symbol=${encodeURIComponent(t)}&freq=annual`);
        const rows = Array.isArray(est?.data) ? est.data : [];
        const year = new Date().getFullYear();
        const next = rows.find(r => Number(r?.period) > year) || rows.find(r => Number(r?.epsAvg));
        const epsAvg = Number(next?.epsAvg);
        if (Number.isFinite(epsAvg) && epsAvg > 0) out.fpe = fmtRatio(price / epsAvg);
      }
    } catch {}

    return { data: out, error: null };
  } catch (error) {
    return handleServiceError(error, 'fetchValuation');
  }
}
