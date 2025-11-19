// src/services/financials/growthService.ts
// Centralized growth calculation service
// Calculations are lightweight and cached by Vue's computed properties

import { calculateGrowthRates, type GrowthRates } from '../../utils/growthCalculator'

/**
 * Time series data point: [timestamp, value]
 */
type SeriesDataPoint = [number, number]

/**
 * Get growth rates for a time series
 * Note: This is a pure calculation function - caching is handled by Vue's computed properties
 *
 * @param series - Time series data [[timestamp, value], ...]
 * @returns Growth rates { oneYear, twoYear, fiveYear }
 *
 * @example
 * const growth = getGrowthRates(revenueSeries)
 * // { oneYear: 5.2, twoYear: 10.5, fiveYear: 15.3 }
 */
export function getGrowthRates(
  series: SeriesDataPoint[]
): GrowthRates {
  if (!series || series.length === 0) {
    return { oneYear: null, twoYear: null, fiveYear: null }
  }

  return calculateGrowthRates(series)
}
