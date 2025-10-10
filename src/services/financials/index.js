import { fetchYahooRevenueSeries } from './revenueProvider.js'
import { fetchYahooFcfSeries }     from './fcfProvider.js'

const cache = new Map()
// keys used:
//  - `${T}|revenue|${period}`
//  - `${T}|fcf|${period}`

export async function getRevenueSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []
  const key = `${t}|revenue|${period}`
  if (cache.has(key)) return cache.get(key)
  const series = await fetchYahooRevenueSeries(t, period)
  cache.set(key, series)
  return series
}

export async function getFcfSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []
  const key = `${t}|fcf|${period}`
  if (cache.has(key)) return cache.get(key)
  const series = await fetchYahooFcfSeries(t, period)
  cache.set(key, series)
  return series
}
