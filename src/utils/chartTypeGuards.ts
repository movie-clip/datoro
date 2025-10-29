/**
 * Chart Data Type Guards
 * Utility functions to determine the format/structure of chart data
 */

/**
 * Check if data is a fully configured series object (has 'type' property)
 * @param data - Data to check
 * @returns True if data is a configured series object
 * @example isConfiguredSeries({type: 'bar', name: 'Sales', data: [...]}) => true
 */
export function isConfiguredSeries(data: unknown): boolean {
  return data !== null && typeof data === 'object' && 'type' in data
}

/**
 * Check if data is in multi-series format (array of objects with 'name' property)
 * @param data - Data to check
 * @returns True if data is multi-series format
 * @example isMultiSeriesFormat([{name: 'FCF', data: [...]}, {name: 'SBC', data: [...]}]) => true
 */
export function isMultiSeriesFormat(data: unknown): boolean {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    'name' in data[0]
  )
}

/**
 * Check if data is a simple time-series array format [[timestamp, value], ...]
 * @param data - Data to check
 * @returns True if data is simple time-series format
 * @example isSimpleTimeSeries([[1609459200000, 100], [1612137600000, 150]]) => true
 */
export function isSimpleTimeSeries(data: unknown): boolean {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    Array.isArray(data[0]) &&
    data[0].length >= 2 &&
    typeof data[0][0] === 'number'
  )
}

/**
 * Check if data array contains fully configured series objects
 * @param data - Data to check
 * @returns True if array contains configured series
 * @example isConfiguredSeriesArray([{type: 'bar', name: 'A', data: [...]}]) => true
 */
export function isConfiguredSeriesArray(data: unknown): boolean {
  return isMultiSeriesFormat(data) && Array.isArray(data) && data.length > 0 && isConfiguredSeries(data[0])
}

/**
 * Check if data needs series configuration
 * @param data - Data to check
 * @returns True if data needs configuration (not already configured)
 */
export function needsSeriesConfiguration(data: unknown): boolean {
  if (isConfiguredSeries(_data)) {
    return false
  }
  if (isMultiSeriesFormat(_data) && Array.isArray(_data) && data.length > 0 && isConfiguredSeries(data[0])) {
    return false
  }
  return true
}
