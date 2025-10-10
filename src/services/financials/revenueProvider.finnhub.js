// src/services/financials/revenueProvider.finnhub.js
// Quarterly revenue bars for the last ~5 years using Finnhub.
// Source: /api/finnhub/stock/financials?statement=ic&freq=quarterly

async function j(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function fetchRevenueQuarterly5Y_Finnhub(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []

  // Income Statement, quarterly
  const ic = await j(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=ic&freq=quarterly`)
  const rows = Array.isArray(ic?.data) ? ic.data.slice() : []
  if (!rows.length) return []

  // sort ascending by period (YYYY-MM-DD)
  rows.sort((a, b) => new Date(a?.period || 0) - new Date(b?.period || 0))

  // last date -> cutoff = last date minus 5 years
  const last = new Date(rows[rows.length - 1]?.period || 0)
  if (isNaN(+last)) return []
  const cutoff = new Date(last)
  cutoff.setFullYear(cutoff.getFullYear() - 5)
  const cutoffMs = cutoff.getTime()

  // pick a revenue field; Finnhub uses `revenue` (primary). Fallbacks just in case.
  const pickRevenue = (r) => {
    const cands = ['revenue', 'totalRevenue', 'salesRevenueNet']
    for (const k of cands) {
      const v = Number(r?.[k])
      if (Number.isFinite(v)) return v
    }
    return NaN
  }

  const series = []
  for (const r of rows) {
    const d = new Date(r?.period || 0)
    if (isNaN(+d) || d.getTime() < cutoffMs) continue
    const rev = pickRevenue(r)
    if (Number.isFinite(rev)) series.push([d.getTime(), rev])
  }

  return series
}
