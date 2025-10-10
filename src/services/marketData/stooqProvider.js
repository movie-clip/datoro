// Returns array of [ms, close] or []
export async function fetchStooqSeries(ticker, { stooqDays }) {
  const t = (ticker || '').toLowerCase()
  const candidates = (t.includes('.') || t.startsWith('^')) ? [t] : [t + '.us', t]

  for (const sym of candidates) {
    try {
      const res = await fetch(`/stooq/q/d/l/?s=${encodeURIComponent(sym)}&i=d`)
      if (!res.ok) continue
      const csv = await res.text()
      const lines = csv.trim().split('\n')
      if (lines.length <= 1) continue
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const iDate = headers.indexOf('date')
      const iClose = headers.indexOf('close')
      if (iDate === -1 || iClose === -1) continue
      const rows = lines.slice(1).map(line => line.split(','))
      let series = rows.map(cols => {
        const d = new Date(cols[iDate])
        const y = Number(cols[iClose])
        return (isFinite(y) && !Number.isNaN(d.valueOf())) ? [d.getTime(), y] : null
      }).filter(Boolean)
      if (stooqDays && series.length > stooqDays) series = series.slice(-stooqDays)
      if (series.length) return series
    } catch { /* try next */ }
  }
  return []
}
