// src/services/company/kpiService.ts
// Cash Flow + Margins & Growth KPIs via Finnhub (server proxy: /api/finnhub/*)

import { type ServiceResponse } from '../shared'
import { formatPercent } from '@/utils/formatters'

/**
 * Cash flow KPIs
 */
export interface CashFlowKpis {
  fcfYield: string
  adjFcfYield: string
}

/**
 * Margins and growth KPIs
 */
export interface MarginsGrowthKpis {
  profitMargin: string
  operatingMargin: string
  qEarningsYoY: string
  qRevenueYoY: string
}

/**
 * Pick first valid number from object using candidate keys
 */
function pick(obj: any, keys: string[] = []): number {
  for (const k of keys) {
    const v = Number(obj?.[k])
    if (Number.isFinite(v)) return v
  }
  return NaN
}

/**
 * Finnhub sometimes returns "billions" for some aggregates; normalize to absolute USD
 */
function toUSD(x: any): number {
  const n = Number(x)
  if (!Number.isFinite(n)) return NaN
  return n < 1e6 ? n * 1e9 : n
}

/**
 * Fetch JSON from URL
 */
async function jget(url: string): Promise<unknown> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return r.json()
}

/**
 * Get quote data
 */
async function getQuote(t: string): Promise<unknown> {
  return jget(`/api/finnhub/quote?symbol=${encodeURIComponent(t)}`)
}

/**
 * Get company profile
 */
async function getProfile(t: string): Promise<unknown> {
  return jget(`/api/finnhub/stock/profile2?symbol=${encodeURIComponent(t)}`)
}

/**
 * Get all metrics
 */
async function getMetricAll(t: string): Promise<unknown> {
  return jget(`/api/finnhub/stock/metric?symbol=${encodeURIComponent(t)}&metric=all`)
}

/**
 * Get financial statements
 */
async function getFinancials(t: string, statement: string, freq: string): Promise<unknown> {
  return jget(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=${statement}&freq=${freq}`)
}

/* -----------------------------------------------
   CASH FLOW KPIs
   ----------------------------------------------- */
/**
 * Fetch cash flow KPIs (FCF yield, adjusted FCF yield)
 * @param ticker - Stock ticker symbol
 * @returns Cash flow KPIs
 */
export async function fetchCashFlowKpis(ticker: string): Promise<CashFlowKpis> {
  const t = (ticker || '').trim().toUpperCase()
  const out: CashFlowKpis = { fcfYield: '—', adjFcfYield: '—' }
  if (!t) return out

  // price (quote)
  let price = NaN
  try {
    const q = await getQuote(t)
    price = Number(q?.c)
  } catch {}

  // shares outstanding (profile)
  let shares = NaN
  try {
    const p = await getProfile(t)
    shares = Number(p?.shareOutstanding ?? p?.sharesOutstanding)
  } catch {}

  // cash flow statement (annual) for FCF and SBC; also pick CFO and CapEx if FCF missing
  let fcf = NaN, cfo = NaN, capex = NaN, sbc = NaN
  try {
    const cf = await getFinancials(t, 'cf', 'annual')
    const rows = Array.isArray(cf?.data) ? cf.data : []
    // most recent with usable fields
    const latest = rows.find((r: any) => r) || {}
    // Try direct FCF, else compute CFO - CapEx
    fcf = pick(latest, ['freeCashFlow', 'freeCashFlowTtm'])
    cfo = pick(latest, ['cashFlowFromOperations', 'netCashProvidedByOperatingActivities', 'operatingCashFlow'])
    capex = pick(latest, ['capitalExpenditure', 'capitalExpenditures', 'capex'])
    if (!Number.isFinite(fcf) && Number.isFinite(cfo) && Number.isFinite(capex)) {
      // Note: many statements record CapEx as negative. We want CFO - CapEx (CapEx negative), so add if negative.
      fcf = cfo - capex
    }
    // Stock-based compensation (added back to CFO on CF statement)
    sbc = pick(latest, ['shareBasedCompensation', 'stockBasedCompensation', 'shareBasedCompensationExpense'])
  } catch {}

  // fallback shares from marketCap/price if needed and available
  if (!Number.isFinite(shares)) {
    try {
      const metric = await getMetricAll(t)
      const m = metric?.metric || {}
      const mc = toUSD(m.marketCapitalization)
      if (Number.isFinite(mc) && Number.isFinite(price) && price > 0) {
        shares = mc / price
      }
    } catch {}
  }

  // Compute FCF per share and yields
  const fcfPerShare = (Number.isFinite(fcf) && Number.isFinite(shares) && shares > 0) ? (fcf / shares) : NaN
  const fcfYield = (Number.isFinite(fcfPerShare) && Number.isFinite(price) && price > 0) ? (fcfPerShare / price) : NaN

  // Adjusted FCF excludes SBC add-back: CFO_adj = CFO - SBC; FCF_adj = CFO_adj - CapEx
  let adjFcf = NaN
  if (Number.isFinite(cfo) && Number.isFinite(capex) && Number.isFinite(sbc)) {
    const cfoAdj = cfo - sbc
    adjFcf = cfoAdj - capex
  } else if (Number.isFinite(fcf) && Number.isFinite(sbc)) {
    // If only FCF and SBC present, approximate FCF_adj ≈ FCF - SBC
    adjFcf = fcf - sbc
  }
  const adjFcfPerShare = (Number.isFinite(adjFcf) && Number.isFinite(shares) && shares > 0) ? (adjFcf / shares) : NaN
  const adjFcfYield = (Number.isFinite(adjFcfPerShare) && Number.isFinite(price) && price > 0) ? (adjFcfPerShare / price) : NaN

  out.fcfYield = Number.isFinite(fcfYield) ? formatPercent(fcfYield) : '—'
  out.adjFcfYield = Number.isFinite(adjFcfYield) ? formatPercent(adjFcfYield) : '—'
  return out
}

/* -----------------------------------------------
   MARGINS & GROWTH
   ----------------------------------------------- */
/**
 * Fetch margins and growth KPIs
 * @param ticker - Stock ticker symbol
 * @returns Margins and growth KPIs
 */
export async function fetchMarginsGrowth(ticker: string): Promise<MarginsGrowthKpis> {
  const t = (ticker || '').trim().toUpperCase()
  const out: MarginsGrowthKpis = { 
    profitMargin: '—', 
    operatingMargin: '—', 
    qEarningsYoY: '—', 
    qRevenueYoY: '—' 
  }
  if (!t) return out

  // Try TTM margins from metric
  let pm = NaN, om = NaN
  try {
    const m = await getMetricAll(t)
    const met = m?.metric || {}
    pm = Number(met.netProfitMarginTTM ?? met.netMarginTTM ?? met.netProfitMarginAnnual)
    om = Number(met.operatingMarginTTM ?? met.operatingMarginAnnual)
  } catch {}

  // Fallback to annual income statement if needed
  if (!Number.isFinite(pm) || !Number.isFinite(om)) {
    try {
      const ic = await getFinancials(t, 'ic', 'annual')
      const rows = Array.isArray(ic?.data) ? ic.data : []
      const latest = rows[0] || {}
      const revenue = pick(latest, ['revenue', 'totalRevenue', 'salesRevenueNet'])
      const netInc = pick(latest, ['netIncome', 'netIncomeCommonStockholders'])
      const opInc = pick(latest, ['operatingIncome', 'operatingIncomeLoss'])
      if (!Number.isFinite(pm) && Number.isFinite(netInc) && Number.isFinite(revenue) && revenue !== 0) {
        pm = netInc / revenue
      }
      if (!Number.isFinite(om) && Number.isFinite(opInc) && Number.isFinite(revenue) && revenue !== 0) {
        om = opInc / revenue
      }
    } catch {}
  }

  // Quarterly YoY growth for earnings (net income) and revenue
  try {
    const icQ = await getFinancials(t, 'ic', 'quarterly')
    const rowsQ = (Array.isArray(icQ?.data) ? icQ.data : []).slice().sort((a: any, b: any) => {
      const da = Date.parse(a?.period || a?.reportDate || a?.date || '')
      const db = Date.parse(b?.period || b?.reportDate || b?.date || '')
      return db - da
    })
    const cur = rowsQ[0] || {}
    const prevYear = rowsQ.find((r: any) => {
      const d0 = Date.parse(cur?.period || cur?.reportDate || cur?.date || '')
      const d1 = Date.parse(r?.period || r?.reportDate || r?.date || '')
      if (!Number.isFinite(d0) || !Number.isFinite(d1)) return false
      const diffDays = Math.abs((d0 - d1) / (1000 * 60 * 60 * 24))
      return diffDays > 300 && diffDays < 460 // roughly 1 year window
    }) || rowsQ[4] // fallback: 4 quarters back

    const revNow = pick(cur, ['revenue', 'totalRevenue', 'salesRevenueNet'])
    const revOld = pick(prevYear || {}, ['revenue', 'totalRevenue', 'salesRevenueNet'])
    const niNow = pick(cur, ['netIncome', 'netIncomeCommonStockholders'])
    const niOld = pick(prevYear || {}, ['netIncome', 'netIncomeCommonStockholders'])

    if (Number.isFinite(revNow) && Number.isFinite(revOld) && revOld !== 0) {
      out.qRevenueYoY = formatPercent((revNow - revOld) / Math.abs(revOld))
    }
    if (Number.isFinite(niNow) && Number.isFinite(niOld) && niOld !== 0) {
      out.qEarningsYoY = formatPercent((niNow - niOld) / Math.abs(niOld))
    }
  } catch {}

  out.profitMargin = Number.isFinite(pm) ? formatPercent(pm) : '—'
  out.operatingMargin = Number.isFinite(om) ? formatPercent(om) : '—'
  return out
}
