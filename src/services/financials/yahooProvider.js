// Returns array of [ms, fcf] where fcf = Operating Cash Flow + CapEx (CapEx usually negative)
// period: 'annual' | 'quarterly'
export async function fetchYahooCashflowSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []

  // Fetch only the module we need (reduces failure risk)
  const module = period === 'quarterly'
    ? 'cashflowStatementHistoryQuarterly'
    : 'cashflowStatementHistory'

  const url =
    `/y2api/v10/finance/quoteSummary/${encodeURIComponent(t)}` +
    `?lang=en-US&region=US&corsDomain=finance.yahoo.com&modules=${module}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('[FCF] HTTP error', res.status, res.statusText)
      return []
    }
    const j = await res.json()
    const err = j?.quoteSummary?.error
    if (err) {
      console.warn('[FCF] Yahoo error', err)
      return []
    }
    const root = j?.quoteSummary?.result?.[0]
    if (!root) return []

    const bag = period === 'quarterly'
      ? root?.cashflowStatementHistoryQuarterly
      : root?.cashflowStatementHistory

    const arr = bag?.cashflowStatements
    if (!Array.isArray(arr) || !arr.length) return []

    const firstNum = (...vals) => {
      for (const v of vals) {
        if (typeof v === 'number' && Number.isFinite(v)) return v
      }
      return null
    }

    const out = []
    for (const node of arr) {
      const ts = (node?.endDate?.raw ? node.endDate.raw * 1000
               : node?.endDate?.fmt   ? Date.parse(node.endDate.fmt)
               : NaN)

      const cfo = firstNum(
        node?.totalCashFromOperatingActivities?.raw,
        node?.operatingCashflow?.raw,
        node?.netCashProvidedByOperatingActivities?.raw
      )

      const capex = firstNum(
        node?.capitalExpenditures?.raw,
        node?.investmentsInPropertyPlantAndEquipment?.raw
      )

      if (!Number.isFinite(ts) || cfo == null || capex == null) continue

      const fcf = cfo + capex // CapEx typically negative => CFO + CapEx == CFO - |CapEx|
      if (Number.isFinite(fcf)) out.push([ts, fcf])
    }

    out.sort((a, b) => a[0] - b[0])
    return out
  } catch (e) {
    console.warn('[FCF] Exception', e)
    return []
  }
}
