/**
 * S&P 500 Calculation Service
 * 
 * Handles all calculations and data transformations for S&P 500 historical data.
 * Separated from component for better testability and maintainability.
 */

export interface PriceDataPoint {
  timestamp: number
  price: number
}

export interface HistoricalPriceRecord {
  date: string
  close: number
}

export interface DataZoomEventPayload {
  start?: number
  end?: number
  startValue?: number
  endValue?: number
  batch?: DataZoomEventPayload[]
}

export interface DateRange {
  start: string // ISO date format YYYY-MM-DD
  end: string
}

export interface PerformanceResult {
  performance: number // Percentage
  startPrice: number
  endPrice: number
  startDate: string
  endDate: string
}

export interface DataZoomIndices {
  startIdx: number
  endIdx: number
  startDate: string
  endDate: string
  startPrice: number
  endPrice: number
}

/**
 * Convert FMP historical data to ECharts format
 * @param historicalData FMP API response data
 * @returns Array of [timestamp, price] tuples in chronological order
 */
export function convertToChartFormat(historicalData: HistoricalPriceRecord[]): PriceDataPoint[] {
  if (!historicalData || historicalData.length === 0) {
    return []
  }

  // API returns data in chronological order (oldest first)
  // Convert to [timestamp, price] format for ECharts
  return historicalData.map(item => ({
    timestamp: new Date(item.date).getTime(),
    price: item.close
  }))
}

/**
 * Calculate performance between two indices in the price data array
 * @param priceData Array of price data points
 * @param startIdx Starting index
 * @param endIdx Ending index
 * @returns Performance result with percentage and price details
 */
export function calculatePerformance(
  priceData: PriceDataPoint[],
  startIdx: number,
  endIdx: number
): PerformanceResult | null {
  // Validate inputs
  if (!priceData || priceData.length === 0) {
    return null
  }

  if (startIdx < 0 || startIdx >= priceData.length) {
    return null
  }

  if (endIdx < 0 || endIdx >= priceData.length) {
    return null
  }

  const startPoint = priceData[startIdx]!
  const endPoint = priceData[endIdx]!

  const startPrice = startPoint.price
  const endPrice = endPoint.price
  const startDate = new Date(startPoint.timestamp).toISOString().split('T')[0]!
  const endDate = new Date(endPoint.timestamp).toISOString().split('T')[0]!

  // Calculate total return: (endPrice - startPrice) / startPrice * 100
  const performance = ((endPrice - startPrice) / startPrice) * 100

  return {
    performance,
    startPrice,
    endPrice,
    startDate,
    endDate
  }
}

/**
 * Calculate indices from dataZoom percentages
 * @param zoomStart Start percentage (0-100)
 * @param zoomEnd End percentage (0-100)
 * @param totalLength Total number of data points
 * @returns Calculated start and end indices
 */
export function calculateDataZoomIndices(
  zoomStart: number,
  zoomEnd: number,
  totalLength: number
): { startIdx: number; endIdx: number } {
  if (totalLength === 0) {
    return { startIdx: 0, endIdx: 0 }
  }

  // Calculate indices from percentages
  let startIdx = Math.floor((zoomStart / 100) * totalLength)
  let endIdx = Math.floor((zoomEnd / 100) * totalLength)

  // Adjust endIdx - if zoom.end is 100%, we want the last index
  // Otherwise, subtract 1 because the end percentage is exclusive
  if (zoomEnd < 100) {
    endIdx = Math.max(0, endIdx - 1)
  } else {
    endIdx = totalLength - 1
  }

  // Clamp indices to valid range
  startIdx = Math.max(0, Math.min(startIdx, totalLength - 1))
  endIdx = Math.max(0, Math.min(endIdx, totalLength - 1))

  return { startIdx, endIdx }
}

/**
 * Get data zoom indices with full details
 * @param priceData Array of price data points
 * @param zoomStart Start percentage (0-100)
 * @param zoomEnd End percentage (0-100)
 * @returns Full details including dates and prices
 */
export function getDataZoomDetails(
  priceData: PriceDataPoint[],
  zoomStart: number,
  zoomEnd: number
): DataZoomIndices | null {
  if (!priceData || priceData.length === 0) {
    return null
  }

  const { startIdx, endIdx } = calculateDataZoomIndices(zoomStart, zoomEnd, priceData.length)

  const startPoint = priceData[startIdx]
  const endPoint = priceData[endIdx]

  if (!startPoint || !endPoint) {
    return null
  }

  return {
    startIdx,
    endIdx,
    startDate: new Date(startPoint.timestamp).toISOString().split('T')[0]!,
    endDate: new Date(endPoint.timestamp).toISOString().split('T')[0]!,
    startPrice: startPoint.price,
    endPrice: endPoint.price
  }
}

/**
 * Format date for display
 * @param dateStr ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Nov 7, 2025")
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  } catch {
    return dateStr
  }
}

/**
 * Validate price data array
 * @param priceData Array of price data points
 * @returns true if valid, false otherwise
 */
export function validatePriceData(priceData: PriceDataPoint[]): boolean {
  if (!priceData || !Array.isArray(priceData)) {
    return false
  }

  if (priceData.length === 0) {
    return false
  }

  // Check that all data points have valid timestamps and prices
  return priceData.every(point => 
    point &&
    typeof point.timestamp === 'number' &&
    typeof point.price === 'number' &&
    point.timestamp > 0 &&
    point.price > 0
  )
}

/**
 * Check if data is in chronological order
 * @param priceData Array of price data points
 * @returns true if chronological (oldest first), false otherwise
 */
export function isChronological(priceData: PriceDataPoint[]): boolean {
  if (!priceData || priceData.length < 2) {
    return true // Single point or empty is considered chronological
  }

  for (let i = 1; i < priceData.length; i++) {
    if (priceData[i]!.timestamp < priceData[i - 1]!.timestamp) {
      return false
    }
  }

  return true
}
