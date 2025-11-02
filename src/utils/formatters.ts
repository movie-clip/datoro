// src/utils/formatters.ts
// Centralized number and percentage formatting utilities
// Replaces duplicate fmtNumber/fmtPct implementations across codebase

/**
 * Options for number formatting
 */
export interface FormatNumberOptions {
  /** Include currency symbol ($) */
  currency?: boolean
  /** Number of decimal places */
  decimals?: number
  /** Value to return for null/undefined/NaN */
  nullValue?: string
  /** Minimum absolute value to display (smaller values return nullValue) */
  minValue?: number
}

/**
 * Format a number with K/M/B/T suffixes
 * 
 * @example
 * formatNumber(1234567) // "$1.23M"
 * formatNumber(1234567, { currency: false }) // "1.23M"
 * formatNumber(1234567.89, { decimals: 3 }) // "$1.235M"
 * formatNumber(null) // "—"
 * 
 * @param num - Number to format
 * @param options - Formatting options
 * @returns Formatted string with suffix
 */
export function formatNumber(
  num: number | null | undefined,
  options: FormatNumberOptions = {}
): string {
  const {
    currency = true,
    decimals = 2,
    nullValue = '—',
    minValue = 0
  } = options

  // Handle null/undefined/NaN
  if (num == null || !Number.isFinite(num)) {
    return nullValue
  }

  // Handle values below minimum threshold
  if (Math.abs(num) < minValue) {
    return nullValue
  }

  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)
  const prefix = currency ? '$' : ''

  // Apply suffix based on magnitude
  if (abs >= 1e12) {
    return `${prefix}${sign}${(abs / 1e12).toFixed(decimals)}T`
  }
  if (abs >= 1e9) {
    return `${prefix}${sign}${(abs / 1e9).toFixed(decimals)}B`
  }
  if (abs >= 1e6) {
    return `${prefix}${sign}${(abs / 1e6).toFixed(decimals)}M`
  }
  if (abs >= 1e3) {
    return `${prefix}${sign}${(abs / 1e3).toFixed(decimals)}K`
  }

  return `${prefix}${sign}${abs.toFixed(decimals)}`
}

/**
 * Format a decimal as a percentage
 * 
 * @example
 * formatPercent(0.1234) // "12.34%"
 * formatPercent(1.234) // "123%"
 * formatPercent(0.1234, 1) // "12.3%"
 * formatPercent(null) // "—"
 * 
 * @param num - Decimal value (e.g., 0.25 = 25%)
 * @param decimals - Number of decimal places (auto-adjusts for large values)
 * @param nullValue - Value to return for null/undefined/NaN
 * @returns Formatted percentage string
 */
export function formatPercent(
  num: number | null | undefined,
  decimals: number = 2,
  nullValue: string = '—'
): string {
  if (num == null || !Number.isFinite(num)) {
    return nullValue
  }

  const value = num * 100

  // Use fewer decimals for large percentages
  const actualDecimals = Math.abs(value) >= 100 ? 0 : decimals

  return `${value.toFixed(actualDecimals)}%`
}

/**
 * Legacy alias for formatNumber with currency enabled
 * @deprecated Use formatNumber() instead
 */
export function fmtNumber(num: number | null | undefined): string {
  return formatNumber(num, { currency: true, decimals: 2 })
}

/**
 * Legacy alias for formatPercent
 * @deprecated Use formatPercent() instead
 */
export function fmtPct(num: number | null | undefined): string {
  return formatPercent(num, 2)
}
