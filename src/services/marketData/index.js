import { fetchYahooSeries } from './yahooProvider.js'
import { fetchStooqSeries } from './stooqProvider.js'

const cache = new Map()
// key: `${ticker}|${range}-${interval}-${stooqDays??'all'}` -> { series, ts }

export async function getPriceSeries(ticker, tfConfig, { prefer = 'yahoo' } = {}) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []

  const sDays = typeof tfConfig.stooqDays === 'function'
    ? tfConfig.stooqDays()
    : tfConfig.stooqDays

  const key = `${t}|${tfConfig.range}-${tfConfig.interval}-${sDays ?? 'all'}`
  if (cache.has(key)) return cache.get(key).series

  let series = []
  if (prefer === 'yahoo') {
    series = await fetchYahooSeries(t, tfConfig)
    if (!series.length) series = await fetchStooqSeries(t, { stooqDays: sDays })
  } else {
    series = await fetchStooqSeries(t, { stooqDays: sDays })
    if (!series.length) series = await fetchYahooSeries(t, tfConfig)
  }

  cache.set(key, { series, ts: Date.now() })
  return series
}
