// src/services/company/cashflowService.ts
// Computes TTM Free Cash Flow from Finnhub quarterly cash-flow:
//   FCF_TTM  = sum_4q(Operating CF) - sum_4q(CapEx)
//   AdjFCF   = FCF_TTM - sum_4q(Stock-Based Compensation)

import { handleServiceError, type ServiceResponse } from '../shared'
import { formatNumber } from '@/utils/formatters'

/**
 * Cash flow facts result
 */
export interface CashFlowFacts {
  fcf: string
  adjFcf: string
}

/**
 * Fetch JSON from URL
 */
async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

/**
 * Get first valid number from object using candidate keys
 */
function firstNumber(obj: any, keys: string[]): number {
  for (const k of keys) {
    const v = Number(obj?.[k])
    if (Number.isFinite(v)) return v
  }
  return NaN
}

/**
 * Sum values across TTM (4 quarters)
 */
function sumTTM(rows: unknown[], candidates: string[]): number {
  let s = 0
  let found = false
  for (const r of rows) {
    const v = firstNumber(r, candidates)
    if (Number.isFinite(v)) { 
      s += v
      found = true 
    }
  }
  return found ? s : NaN
}

/**
 * Fetch cash flow facts (TTM FCF and adjusted FCF)
 * @param ticker - Stock ticker symbol
 * @returns Cash flow facts with formatted FCF values
 */
export async function fetchCashFlowFacts(ticker: string): Promise<ServiceResponse<CashFlowFacts>> {
  const t = (ticker || '').trim().toUpperCase()
  const out: CashFlowFacts = { fcf: '—', adjFcf: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }

  try {
    // 4 most recent quarters
    const cf = await getJson(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=cf&freq=quarterly`)
    const rows = (Array.isArray(cf?.data) ? cf.data : [])
      .sort((a: any, b: any) => String(b?.period || '').localeCompare(String(a?.period || '')))
      .slice(0, 4)

    if (!rows.length) return { data: out, error: 'No cash flow data found' }

    // CFO (Operating Cash Flow)
    const cfoTTM = sumTTM(rows, [
      'netCashProvidedByOperatingActivities',
      'cashFlowFromOperations',
      'operatingCashFlow'
    ])

    // CapEx (usually negative). Normalize to negative outflow.
    let capexTTM = sumTTM(rows, [
      'capitalExpenditures',
      'capitalExpenditure',
      'investmentInFixedAssets'
    ])
    if (Number.isFinite(capexTTM) && capexTTM > 0) capexTTM = -capexTTM

    // Stock-based comp (for adjusted FCF)
    const sbcTTM = sumTTM(rows, [
      'stockBasedCompensation',
      'stockBasedCompensationExpense',
      'stockCompensation'
    ])

    const fcfTTM =
      Number.isFinite(cfoTTM) && Number.isFinite(capexTTM) ? (cfoTTM - capexTTM) : NaN
    const adjFcfTTM =
      Number.isFinite(fcfTTM) && Number.isFinite(sbcTTM) ? (fcfTTM - sbcTTM) : NaN

    if (Number.isFinite(fcfTTM))   out.fcf = formatNumber(fcfTTM, { currency: false, decimals: 3 })
    if (Number.isFinite(adjFcfTTM)) out.adjFcf = formatNumber(adjFcfTTM, { currency: false, decimals: 3 })
    
    return { data: out, error: null }
  } catch (_error) {
    return handleServiceError(_error, 'fetchCashFlowFacts', out)
  }
}
