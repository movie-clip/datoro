// src/services/financials/fmpProvider.js
// Financial Modeling Prep provider implementing the unified interface
// https://site.financialmodelingprep.com/developer/docs/

import { handleServiceError } from '../shared.js'

const BASE = '/api/fmp/api/v3'

async function getValuation(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { marketCap: '—', pe: '—', fpe: '—', ps: '—', pb: '—', evEbitda: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    const url = `${BASE}/profile/${t}`
    const res = await fetch(url)
    if (!res.ok) return { data: out, error: `HTTP ${res.status}` }
    const arr = await res.json()
    const d = arr[0] || {}
    if (d.mktCap) out.marketCap = fmtNumber(d.mktCap)
    if (d.pe) out.pe = d.pe.toFixed(2)
    if (d.priceToSalesTTM) out.ps = d.priceToSalesTTM.toFixed(2)
    if (d.priceToBookRatio) out.pb = d.priceToBookRatio.toFixed(2)
    if (d.enterpriseValue && d.ebitda) out.evEbitda = (d.enterpriseValue / d.ebitda).toFixed(2)
    // FPE not directly available
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getValuation')
  }
}

async function getCashFlowFacts(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { cfo: '—', capex: '—', fcf: '—', adjFcf: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    const url = `${BASE}/cash-flow-statement/${t}?period=quarter&limit=4`
    const res = await fetch(url)
    if (!res.ok) return { data: out, error: `HTTP ${res.status}` }
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length < 4) return { data: out, error: 'Not enough cash flow data' }
    let cfoTTM = 0, capexTTM = 0, sbcTTM = 0
    for (let i = 0; i < 4; ++i) {
      const row = arr[i]
      cfoTTM += Number(row.operatingCashFlow) || 0
      capexTTM += Number(row.capitalExpenditure) || 0
      sbcTTM += Number(row.stockBasedCompensation) || 0
    }
    const fcf = cfoTTM + capexTTM // CapEx negative
    out.cfo = fmtNumber(cfoTTM)
    out.capex = fmtNumber(Math.abs(capexTTM))
    out.fcf = fmtNumber(fcf)
    out.adjFcf = fmtNumber(fcf - sbcTTM)
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getCashFlowFacts')
  }
}

async function getMarginsGrowth(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { profitMargin: '—', operatingMargin: '—', earningsYoY: '—', revenueYoY: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    const url = `${BASE}/ratios-ttm/${t}`
    const res = await fetch(url)
    if (!res.ok) return { data: out, error: `HTTP ${res.status}` }
    const arr = await res.json()
    const d = arr[0] || {}
    if (d.netProfitMarginTTM) out.profitMargin = (d.netProfitMarginTTM * 100).toFixed(2) + '%'
    if (d.operatingProfitMarginTTM) out.operatingMargin = (d.operatingProfitMarginTTM * 100).toFixed(2) + '%'
    // YoY growth: use /income-statement and /income-statement-growth endpoints if needed
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getMarginsGrowth')
  }
}

async function getRevenueSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/income-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    const out = arr.map(row => [Date.parse(row.date), Number(row.revenue)])
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getRevenueSeries')
  }
}

async function getFcfSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/cash-flow-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    const out = arr.map(row => [Date.parse(row.date), Number(row.freeCashFlow)])
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getFcfSeries')
  }
}

function fmtNumber(n) {
  if (!Number.isFinite(n)) return '—'
  const s = Math.sign(n) < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + 'T'
  if (a >= 1e9 ) return s + (a / 1e9 ).toFixed(2) + 'B'
  if (a >= 1e6 ) return s + (a / 1e6 ).toFixed(2) + 'M'
  if (a >= 1e3 ) return s + (a / 1e3 ).toFixed(0) + 'K'
  return s + a.toFixed(0)
}

export default {
  getValuation,
  getCashFlowFacts,
  getMarginsGrowth,
  getRevenueSeries,
  getFcfSeries,
}
