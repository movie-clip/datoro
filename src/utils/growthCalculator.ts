// src/utils/growthCalculator.ts

/**
 * Time series data point [timestamp, value]
 */
type DataPoint = [number, number]

/**
 * Growth rates for different periods
 */
export interface GrowthRates {
  oneYear: number | null
  twoYear: number | null
  fiveYear: number | null
}

/**
 * Calculate growth percentages for different time periods
 * @param data - Array of [timestamp, value] pairs sorted by date
 * @returns Growth rates for 1y, 2y, 5y periods
 */
export function calculateGrowthRates(data: DataPoint[]): GrowthRates {
  if (!data || data.length < 2) {
    return { oneYear: null, twoYear: null, fiveYear: null }
  }

  // Ensure data is sorted by date (ascending)
  const sortedData = [...data].sort((_a, _b) => a[0] - b[0])
  
  const latest = sortedData[sortedData.length - 1]
  if (!latest) return { oneYear: null, twoYear: null, fiveYear: null }
  
  const latestValue = latest[1]
  const latestDate = latest[0]
  
  // Find values for different periods
  const oneYearAgo = latestDate - (365 * 24 * 60 * 60 * 1000)
  const twoYearsAgo = latestDate - (2 * 365 * 24 * 60 * 60 * 1000)
  const fiveYearsAgo = latestDate - (5 * 365 * 24 * 60 * 60 * 1000)
  
  const findClosestValue = (targetDate: number): number | null => {
    // Find the data point closest to the target date
    let closest: number | null = null
    let minDiff = Infinity
    
    for (const [date, value] of sortedData) {
      const diff = Math.abs(date - targetDate)
      if (diff < minDiff) {
        minDiff = diff
        closest = value
      }
    }
    
    // Only return if we found a point within 6 months of target
    if (minDiff < 180 * 24 * 60 * 60 * 1000) {
      return closest
    }
    return null
  }
  
  const calculateGrowth = (oldValue: number | null, newValue: number): number | null => {
    if (oldValue === null || oldValue === 0 || newValue === null) return null
    return ((newValue - oldValue) / Math.abs(oldValue)) * 100
  }
  
  const oneYearValue = findClosestValue(oneYearAgo)
  const twoYearValue = findClosestValue(twoYearsAgo)
  const fiveYearValue = findClosestValue(fiveYearsAgo)
  
  return {
    oneYear: calculateGrowth(oneYearValue, latestValue),
    twoYear: calculateGrowth(twoYearValue, latestValue),
    fiveYear: calculateGrowth(fiveYearValue, latestValue)
  }
}

/**
 * Calculate CAGR (Compound Annual Growth Rate) for multi-year periods
 * @param data - Array of [timestamp, value] pairs
 * @param years - Number of years for CAGR calculation
 * @returns CAGR percentage or null if not enough data
 */
export function calculateCAGR(data: DataPoint[], years: number): number | null {
  if (!data || data.length < 2 || years <= 0) return null
  
  const sortedData = [...data].sort((_a, _b) => a[0] - b[0])
  const latest = sortedData[sortedData.length - 1]
  if (!latest) return null
  
  const latestValue = latest[1]
  const latestDate = latest[0]
  const targetDate = latestDate - (years * 365 * 24 * 60 * 60 * 1000)
  
  // Find closest value to target date
  let closestValue: number | null = null
  let minDiff = Infinity
  
  for (const [date, value] of sortedData) {
    const diff = Math.abs(date - targetDate)
    if (diff < minDiff) {
      minDiff = diff
      closestValue = value
    }
  }
  
  // Only calculate if we found a point within 6 months of target
  if (minDiff > 180 * 24 * 60 * 60 * 1000) return null
  if (closestValue === null || closestValue <= 0 || latestValue <= 0) return null
  
  // CAGR formula: ((End Value / Start Value) ^ (1 / years)) - 1
  const cagr = (Math.pow(latestValue / closestValue, 1 / years) - 1) * 100
  return cagr
}

/**
 * Format growth percentage for display
 * @param growth - Growth percentage
 * @returns Formatted string with + or - prefix
 */
export function formatGrowth(growth: number | null | undefined): string {
  if (growth === null || growth === undefined || isNaN(growth)) {
    return 'N/A'
  }
  
  const sign = growth >= 0 ? '+' : ''
  return `${sign}${growth.toFixed(1)}%`
}
