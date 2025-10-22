/**
 * Chart Formatting Utilities
 * Pure functions for formatting chart values (numbers, currency, percentages)
 */

/**
 * Format large numbers with abbreviated suffixes (K, M, B, T)
 * @param {number} n - Number to format
 * @returns {string} Formatted number with suffix
 * @example fmtShort(1500000) => "2M"
 */
export function fmtShort(n) {
  const a = Math.abs(n)
  if (a >= 1e12) return (n / 1e12).toFixed(1) + 'T'
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

/**
 * Format Y-axis values based on display mode
 * @param {number} v - Value to format
 * @param {string} mode - Format mode: 'short', 'currency', 'percent', 'int', or default
 * @returns {string} Formatted value
 * @example yFormatter(1500000, 'currency') => "$2M"
 */
export function yFormatter(v, mode) {
  if (mode === 'short') return fmtShort(v)
  if (mode === 'currency') return '$' + fmtShort(v)
  if (mode === 'percent') return v.toFixed(2) + '%'
  if (mode === 'int') return Math.round(v).toLocaleString()
  return Math.round(v).toString()
}
