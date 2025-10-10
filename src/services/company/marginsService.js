function pct(v){ return (Number.isFinite(v) ? (v*100).toFixed(2)+'%' : '—') }
async function j(url){ const r=await fetch(url); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }

export async function fetchMarginsGrowth(ticker){
  const t = (ticker||'').trim().toUpperCase()
  const out = { profitMargin:'—', operatingMargin:'—', earningsYoY:'—', revenueYoY:'—' }
  if (!t) return out

  // 1) TTM margins from metric
  try {
    const m = (await j(`/api/finnhub/stock/metric?symbol=${encodeURIComponent(t)}&metric=all`))?.metric || {}
    const pm = Number(m.netProfitMarginTTM ?? m.profitMarginTTM)
    const om = Number(m.operatingMarginTTM ?? m.operatingMargin)
    if (Number.isFinite(pm)) out.profitMargin = pct(pm / 100)   // Finnhub % often in absolute percent; divide by 100 -> frac
    if (Number.isFinite(om)) out.operatingMargin = pct(om / 100)
  } catch {}

  // 2) Quarterly YoY (income statement)
  try {
    const ic = await j(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=ic&freq=quarterly`)
    const rows = Array.isArray(ic?.data) ? ic.data : []
    if (rows.length >= 5) {
      // ensure sorted desc by period
      rows.sort((a,b)=> String(b?.period||'').localeCompare(String(a?.period||'')))
      const cur = rows[0]
      // find matching quarter 1 year earlier: same month/day but year-1; fallback rows[4]
      const curPeriod = String(cur?.period||'') // e.g., "2025-06-30"
      const targetY = curPeriod.slice(5) // "-06-30"
      let prev = rows.find(r => String(r?.period||'').endsWith(targetY) && String(r?.period||'') !== curPeriod) || rows[4]
      // Use netIncome and revenue fields
      const ni0 = Number(cur?.netIncome),   ni1 = Number(prev?.netIncome)
      const rv0 = Number(cur?.revenue),     rv1 = Number(prev?.revenue)

      if (Number.isFinite(ni0) && Number.isFinite(ni1) && Math.abs(ni1) > 1e-9) {
        out.earningsYoY = (( (ni0 - ni1) / Math.abs(ni1) ) * 100).toFixed(2) + '%'
      }
      if (Number.isFinite(rv0) && Number.isFinite(rv1) && Math.abs(rv1) > 1e-9) {
        out.revenueYoY = (( (rv0 - rv1) / Math.abs(rv1) ) * 100).toFixed(2) + '%'
      }
    }
  } catch {}

  return out
}
