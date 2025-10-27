// src/services/marketData/index.ts
// Market data service with caching

import { fetchFmpSeries, type TimeframeRange, type PriceDataPoint } from './fmpProvider'
import type { ServiceResponse } from '../shared'

/**
 * Timeframe configuration
 */
interface TimeframeConfig {
  range: TimeframeRange
  interval: string
}

// Cache for price series
const cache = new Map<string, ServiceResponse<PriceDataPoint[]>>()

/**
 * Get price series with caching
 * @param ticker - Stock ticker symbol
 * @param tfConfig - Timeframe configuration
 * @returns Price series data
 */
export async function getPriceSeries(
  ticker: string,
  tfConfig: TimeframeConfig
): Promise<ServiceResponse<PriceDataPoint[]>> {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) {
    return { data: [], error: 'No ticker provided' }
  }

  const key = `${t}|${tfConfig.range}-${tfConfig.interval}`
  const cached = cache.get(key)
  if (cached) return cached

  const result = await fetchFmpSeries(t, tfConfig)
  cache.set(key, result)
  return result
}
