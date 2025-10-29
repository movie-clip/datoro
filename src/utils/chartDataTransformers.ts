/**
 * Chart Data Transformation Utilities
 * Functions for converting and transforming chart data formats
 */

type TimeSeriesPoint = [number, number]

interface SeriesObject {
  name: string
  data: TimeSeriesPoint[]
  [key: string]: unknown
}

/**
 * Extract unique years from time-series data points
 * @param dataPoints - Array of time-series points [[timestamp, value], ...]
 * @returns Sorted array of unique years
 * @example extractYearsFromSeries([[new Date('2020').getTime(), 100], ...]) => [2020, 2021, ...]
 */
export function extractYearsFromSeries(dataPoints: TimeSeriesPoint[]): number[] {
  if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0) {
    return []
  }

  const years = new Set<number>()
  dataPoints.forEach(point => {
    if (Array.isArray(point) && point[0]) {
      const year = new Date(point[0]).getFullYear()
      years.add(year)
    }
  })

  return Array.from(years).sort((_a, _b) => a - b)
}

/**
 * Convert time-series data to category-aligned values for bar charts
 * Maps timestamp-based data points to specific years/timestamps, filling missing entries with 0
 * @param timeSeriesData - Array of [timestamp, value] pairs
 * @param categoryYears - Array of years OR timestamps to map values to
 * @returns Array of values aligned to categoryYears
 * @example convertToCategoryData([[ts1, 100], [ts2, 200]], [2020, 2021]) => [100, 200]
 * @example convertToCategoryData([[ts1, 100], [ts2, 200]], [ts1, ts2, ts3]) => [100, 200, 0]
 */
export function convertToCategoryData(timeSeriesData: TimeSeriesPoint[], categoryYears: number[]): number[] {
  if (!timeSeriesData || !Array.isArray(timeSeriesData) || timeSeriesData.length === 0) {
    return []
  }

  // Check if categoryYears contains timestamps (large numbers > year 9999)
  const isTimestampMode = categoryYears.length > 0 && categoryYears[0] > 10000

  if (isTimestampMode) {
    // Timestamp mode: direct timestamp matching for quarterly data
    const timestampValueMap = new Map<number, number>()
    timeSeriesData.forEach(point => {
      if (Array.isArray(point) && point.length >= 2) {
        timestampValueMap.set(point[0], point[1])
      }
    })
    return categoryYears.map(ts => timestampValueMap.get(ts) || 0)
  } else {
    // Year mode: map timestamps to years for annual data
    const yearValueMap = new Map<number, number>()
    timeSeriesData.forEach(point => {
      if (Array.isArray(point) && point.length >= 2) {
        const year = new Date(point[0]).getFullYear()
        yearValueMap.set(year, point[1])
      }
    })
    return categoryYears.map(year => yearValueMap.get(year) || 0)
  }
}

/**
 * Get all data points from series (handles multiple series formats)
 * @param series - Series data (can be single array or array of series objects)
 * @returns Flattened array of all data points
 */
export function getAllDataPoints(series: TimeSeriesPoint[] | SeriesObject[]): TimeSeriesPoint[] {
  if (!series || !Array.isArray(series)) {
    return []
  }

  const allPoints: TimeSeriesPoint[] = []

  // Handle multiple series format [{name, data}, ...]
  if ((series as SeriesObject[])[0]?._data) {
    (series as SeriesObject[]).forEach(s => {
      if (Array.isArray(s._data)) {
        allPoints.push(...s.data)
      }
    })
  }
  // Handle single series format [[timestamp, value], ...]
  else if (Array.isArray(series)) {
    allPoints.push(...(series as TimeSeriesPoint[]))
  }

  return allPoints
}
