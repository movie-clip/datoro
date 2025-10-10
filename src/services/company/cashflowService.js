// src/services/company/cashflowService.js
// Computes TTM Free Cash Flow from Finnhub quarterly cash-flow:
//   FCF_TTM  = sum_4q(Operating CF) - sum_4q(CapEx)
//   AdjFCF   = FCF_TTM - sum_4q(Stock-Based Compensation)

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

async function getJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

function firstNumber(obj, keys) {
  for (const k of keys) {
    const v = Number(obj?.[k])
    if (Number.isFinite(v)) return v
  }
  return NaN
}

function sumTTM(rows, candidates) {
  let s = 0, found = false
  for (const r of rows) {
    const v = firstNumber(r, candidates)
    if (Number.isFinite(v)) { s += v; found = true }
  }
  return found ? s : NaN
}

export async function fetchCashFlowFacts(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { fcf: '—', adjFcf: '—' }
  if (!t) return out

  try {
    // 4 most recent quarters
    const cf = await getJson(`/api/finnhub/stock/financials?symbol=${encodeURIComponent(t)}&statement=cf&freq=quarterly`)
    const rows = (Array.isArray(cf?.data) ? cf.data : [])
      .sort((a, b) => String(b?.period || '').localeCompare(String(a?.period || '')))
      .slice(0, 4)

    if (!rows.length) return out

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

    if (Number.isFinite(fcfTTM))   out.fcf = fmtNumber(fcfTTM)
    if (Number.isFinite(adjFcfTTM)) out.adjFcf = fmtNumber(adjFcfTTM)
  } catch {
    // swallow and return what we have
  }

  return out
}
