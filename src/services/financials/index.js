import { fetchYahooRevenueSeries } from './revenueProvider.js'

const cache = new Map()
// key: `${ticker}|revenue|${period}` -> series

export async function getRevenueSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []

  const key = `${t}|revenue|${period}`
  if (cache.has(key)) return cache.get(key)

  const series = await fetchYahooRevenueSeries(t, period)
  cache.set(key, series)
  return series
}
