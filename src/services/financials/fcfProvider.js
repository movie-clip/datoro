// Uses Yahoo fundamentals-timeseries (crumb-free) to fetch Free Cash Flow.
// period: 'annual' | 'quarterly' -> types: annualFreeCashFlow | quarterlyFreeCashFlow
export async function fetchYahooFcfSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []

  const type = period === 'quarterly' ? 'quarterlyFreeCashFlow' : 'annualFreeCashFlow'
  const nowSec = Math.floor(Date.now() / 1000)
  const url =
    `/y2api/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(t)}` +
    `?type=${encodeURIComponent(type)}&period1=0&period2=${nowSec}&merge=false&lang=en-US&region=US`

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const j = await res.json()
    const r = j?.timeseries?.result?.[0]
    const arr = r?.[type]
    if (!Array.isArray(arr) || !arr.length) return []

    const out = []
    for (const row of arr) {
      const ts = row?.asOfDate ? Date.parse(row.asOfDate)
               : row?.timestamp ? row.timestamp * 1000
               : NaN
      const v = row?.reportedValue?.raw ?? row?.value
      if (Number.isFinite(ts) && Number.isFinite(v)) out.push([ts, v])
    }
    out.sort((a, b) => a[0] - b[0])
    return out
  } catch {
    return []
  }
}
