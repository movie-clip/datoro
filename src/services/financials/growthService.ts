// src/services/financials/growthService.ts
// Centralized growth calculation service with caching
// Prevents duplicate calculations across HeroSection and BaseChart

import { calculateGrowthRates, type GrowthRates } from '../../utils/growthCalculator'

/**
 * Time series data point: [timestamp, value]
 */
type SeriesDataPoint = [number, number]

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: GrowthRates
  timestamp: number
}

// Cache for growth rate calculations
// Key format: `${ticker}-${dataType}-${lastDate}-${seriesLength}`
const growthCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get growth rates with caching to prevent duplicate calculations
 *
 * @param series - Time series data [[timestamp, value], ...]
 * @param ticker - Ticker symbol for cache key
 * @param dataType - Type of data ('revenue', 'netIncome', 'fcf', etc.)
 * @returns Growth rates { oneYear, twoYear, fiveYear }
 *
 * @example
 * const growth = getCachedGrowthRates(revenueSeries, 'AAPL', 'revenue')
 * // { oneYear: 5.2, twoYear: 10.5, fiveYear: 15.3 }
 */
export function getCachedGrowthRates(
  series: SeriesDataPoint[],
  ticker: string,
  dataType: string = 'data'
): GrowthRates {
  if (!series || series.length === 0) {
    return { oneYear: null, twoYear: null, fiveYear: null }
  }

  // Create cache key based on ticker, data type, and latest data point
  const lastDataPoint = series[series.length - 1]
  const cacheKey = `${ticker}-${dataType}-${lastDataPoint?.[0]}-${series.length}`

  // Check if we have cached result
  const cached = growthCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Calculate growth rates
  const rates = calculateGrowthRates(series)

  // Store in cache with timestamp
  growthCache.set(cacheKey, {
    data: rates,
    timestamp: Date.now()
  })

  // Auto-cleanup old cache entries after TTL
  setTimeout(() => {
    if (growthCache.has(cacheKey)) {
      growthCache.delete(cacheKey)
    }
  }, CACHE_TTL)

  return rates
}

/**
 * Clear all cached growth calculations
 * Useful when switching tickers or forcing refresh
 */
export function clearGrowthCache(): void {
  growthCache.clear()
}

/**
 * Get cache statistics for debugging
 */
export function getGrowthCacheStats(): { size: number; entries: string[] } {
  return {
    size: growthCache.size,
    entries: Array.from(growthCache.keys())
  }
}
