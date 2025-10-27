import { handleServiceError, type ServiceResponse } from '../shared'

/**
 * Margins and growth metrics
 */
export interface MarginsGrowth {
  profitMargin: string
  operatingMargin: string
  earningsYoY: string
  revenueYoY: string
}

/**
 * Format value as percentage
 */
function pct(v: number): string {
  return Number.isFinite(v) ? (v * 100).toFixed(2) + '%' : '—'
}

/**
 * Fetch JSON from URL
 */
async function j(url: string): Promise<any> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

/**
 * Fetch margins and growth metrics for a ticker
 * @param ticker - Stock ticker symbol
 * @returns Service response with margins and growth data
 */
export async function fetchMarginsGrowth(ticker: string): Promise<ServiceResponse<MarginsGrowth>> {
  const t = (ticker || '').trim().toUpperCase()
  const out: MarginsGrowth = { 
    profitMargin: '—', 
    operatingMargin: '—', 
    earningsYoY: '—', 
    revenueYoY: '—' 
  }
  
  if (!t) return { data: out, error: 'No ticker provided' }

  try {
    // 1) TTM margins from metric
    const m = (await j(`/api/finnhub/stock/metric?symbol=${encodeURIComponent(t)}&metric=all`))?.metric || {}
    const pm = Number(m.netProfitMarginTTM ?? m.profitMarginTTM)
    const om = Number(m.operatingMarginTTM ?? m.operatingMargin)
    
    if (Number.isFinite(pm)) out.profitMargin = pct(pm / 100)   // Finnhub % often in absolute percent; divide by 100 -> frac
    if (Number.isFinite(om)) out.operatingMargin = pct(om / 100)

    // 2) Quarterly YoY (income statement)
    const ic = await j(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=ic&freq=quarterly`)
    const rows = Array.isArray(ic?.data) ? ic.data : []
    
    if (rows.length >= 5) {
      // ensure sorted desc by period
      rows.sort((a: any, b: any) => String(b?.period || '').localeCompare(String(a?.period || '')))
      const cur = rows[0]
      
      // find matching quarter 1 year earlier: same month/day but year-1; fallback rows[4]
      const curPeriod = String(cur?.period || '') // e.g., "2025-06-30"
      const targetY = curPeriod.slice(5) // "-06-30"
      const prev = rows.find((r: any) => String(r?.period || '').endsWith(targetY) && String(r?.period || '') !== curPeriod) || rows[4]
      
      // Use netIncome and revenue fields
      const ni0 = Number(cur?.netIncome)
      const ni1 = Number(prev?.netIncome)
      const rv0 = Number(cur?.revenue)
      const rv1 = Number(prev?.revenue)

      if (Number.isFinite(ni0) && Number.isFinite(ni1) && Math.abs(ni1) > 1e-9) {
        out.earningsYoY = (((ni0 - ni1) / Math.abs(ni1)) * 100).toFixed(2) + '%'
      }
      if (Number.isFinite(rv0) && Number.isFinite(rv1) && Math.abs(rv1) > 1e-9) {
        out.revenueYoY = (((rv0 - rv1) / Math.abs(rv1)) * 100).toFixed(2) + '%'
      }
    }

    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'fetchMarginsGrowth', out)
  }
}
