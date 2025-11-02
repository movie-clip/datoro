/**
 * Fiscal Quarter Utilities
 * 
 * Centralized utilities for handling fiscal quarter data from FMP API.
 * FMP returns fiscal quarters in the format: [timestamp, value, period, fiscalYear]
 * where period is "Q1", "Q2", "Q3", "Q4" and fiscalYear is "2024", "2025", etc.
 */

/**
 * Type for data points with optional fiscal quarter information
 */
export interface FiscalQuarterData {
  period?: string      // Fiscal period (e.g., "Q1", "Q2", "Q3", "Q4")
  fiscalYear?: string  // Fiscal year (e.g., "2024", "2025")
}

/**
 * Type for fiscal quarter info extracted from array format
 */
export interface FiscalQuarterInfo {
  period: string
  year: string
}

/**
 * Check if a data point has fiscal quarter information
 * Works with both object format and array format
 */
export function hasFiscalQuarter(
  dataPoint: FiscalQuarterData | unknown[]
): dataPoint is FiscalQuarterData | [number, number, string, string] {
  if (Array.isArray(dataPoint)) {
    return dataPoint.length === 4 && typeof dataPoint[2] === 'string' && typeof dataPoint[3] === 'string'
  }
  const point = dataPoint as FiscalQuarterData
  return !!(point.period && point.fiscalYear)
}

/**
 * Create a 2-element array [timestamp, value] from object data
 */
export function toSimpleDataPoint(
  date: number, 
  value: number
): [number, number] {
  return [date, value]
}

/**
 * Create a 4-element array [timestamp, value, period, fiscalYear] from object data
 */
export function toFiscalDataPoint(
  date: number, 
  value: number, 
  period: string, 
  fiscalYear: string
): [number, number, string, string] {
  return [date, value, period, fiscalYear]
}

/**
 * Convert object data to array format, conditionally including fiscal quarter info
 * 
 * @param date - Timestamp in milliseconds
 * @param value - Numeric value
 * @param fiscalData - Optional fiscal quarter information
 * @returns Either [timestamp, value] or [timestamp, value, period, fiscalYear]
 * 
 * @example
 * // With fiscal quarters
 * toDataPoint(timestamp, 1000, { period: 'Q1', fiscalYear: '2025' })
 * // => [timestamp, 1000, 'Q1', '2025']
 * 
 * // Without fiscal quarters
 * toDataPoint(timestamp, 1000, {})
 * // => [timestamp, 1000]
 */
export function toDataPoint(
  date: number,
  value: number,
  fiscalData: FiscalQuarterData
): [number, number] | [number, number, string, string] {
  if (fiscalData.period && fiscalData.fiscalYear) {
    return toFiscalDataPoint(date, value, fiscalData.period, fiscalData.fiscalYear)
  }
  return toSimpleDataPoint(date, value)
}

/**
 * Extract fiscal quarter info from a 4-element array
 */
export function extractFiscalQuarter(
  dataPoint: [number, number, string, string]
): FiscalQuarterInfo {
  return {
    period: dataPoint[2],
    year: dataPoint[3]
  }
}

/**
 * Create a fiscal quarter label from period and year
 * 
 * @example
 * formatFiscalQuarter('Q1', '2025') // => 'Q1 2025'
 */
export function formatFiscalQuarter(period: string, year: string): string {
  return `${period} ${year}`
}

/**
 * Build a Map of timestamp → fiscal quarter info from data points
 * Optimized for O(1) lookups instead of O(n) find() operations
 * 
 * @param dataPoints - Array of data points (can be 2-element or 4-element arrays)
 * @returns Map with timestamp keys and fiscal quarter info values
 * 
 * @example
 * const data = [
 *   [1609459200000, 100, 'Q1', '2021'],
 *   [1617235200000, 110, 'Q2', '2021']
 * ]
 * const map = buildFiscalQuarterMap(data)
 * map.get(1609459200000) // => { period: 'Q1', year: '2021' }
 */
export function buildFiscalQuarterMap(
  dataPoints: Array<[number, number] | [number, number, string, string]>
): Map<number, FiscalQuarterInfo> {
  const map = new Map<number, FiscalQuarterInfo>()
  
  dataPoints.forEach(point => {
    if (point && point.length === 4) {
      const [ts, , period, year] = point as [number, number, string, string]
      if (!map.has(ts)) {
        map.set(ts, { period: String(period), year: String(year) })
      }
    }
  })
  
  return map
}

/**
 * Calculate calendar quarter from a timestamp
 * Fallback for data without FMP fiscal quarter information
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Fiscal quarter label (e.g., "Q1 2025")
 */
export function calculateCalendarQuarter(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const quarter = Math.floor((month - 1) / 3) + 1
  return `Q${quarter} ${year}`
}

/**
 * Generate category labels for quarterly data
 * Uses FMP fiscal quarters if available, otherwise calculates from timestamps
 * 
 * @param dataPoints - Array of data points
 * @returns Object with timestamps and corresponding category labels
 */
export function generateQuarterlyLabels(
  dataPoints: Array<[number, number] | [number, number, string, string]>
): { timestamps: number[]; categoryData: string[] } {
  const uniqueTimestamps = [...new Set(dataPoints.map(point => point[0]))].sort((a, b) => a - b)
  
  const firstPoint = dataPoints.find(p => p && p.length > 0)
  const hasFiscalQuarters = firstPoint && firstPoint.length === 4
  
  if (hasFiscalQuarters) {
    // Use FMP fiscal quarters with O(1) Map lookup
    const fiscalQuarterMap = buildFiscalQuarterMap(dataPoints)
    
    const categoryData = uniqueTimestamps.map(ts => {
      const fiscalInfo = fiscalQuarterMap.get(ts)
      return fiscalInfo 
        ? formatFiscalQuarter(fiscalInfo.period, fiscalInfo.year)
        : ''
    })
    
    return { timestamps: uniqueTimestamps, categoryData }
  } else {
    // Fallback: calculate calendar quarters
    const categoryData = uniqueTimestamps.map(ts => calculateCalendarQuarter(ts))
    return { timestamps: uniqueTimestamps, categoryData }
  }
}
