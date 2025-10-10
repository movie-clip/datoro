// Returns array of [ms, close] or []
export async function fetchYahooSeries(ticker, { range, interval }) {
  try {
    const url = `/yapi/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}&includePrePost=false`
    const res = await fetch(url)
    if (!res.ok) return []
    const j = await res.json()
    const r = j?.chart?.result?.[0]
    const ts = r?.timestamp
    if (!ts?.length) return []
    const adj = r?.indicators?.adjclose?.[0]?.adjclose
    const close = r?.indicators?.quote?.[0]?.close
    const closes = (adj && adj.length) ? adj : close
    if (!closes?.length) return []
    const out = []
    for (let i = 0; i < ts.length; i++) {
      const y = closes[i]
      if (y != null && isFinite(y)) out.push([ts[i] * 1000, y])
    }
    return out
  } catch {
    return []
  }
}
