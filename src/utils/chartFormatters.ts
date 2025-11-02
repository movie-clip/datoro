/**
 * Chart Formatting Utilities
 * Pure functions for formatting chart values (numbers, currency, percentages)
 */

import { formatNumber, formatPercent } from './formatters'

type FormatMode = 'short' | 'currency' | 'percent' | 'price' | 'int' | 'decimal' | 'ratio' | 'default'

/**
 * Format large numbers with abbreviated suffixes (K, M, B, T)
 * @param n - Number to format
 * @returns Formatted number with suffix
 * @example fmtShort(1500000) => "1.5M"
 */
export function fmtShort(n: number): string {
  return formatNumber(n, { currency: false, decimals: 1 })
}

/**
 * Format decimal numbers (e.g., per-share values)
 * @param n - Number to format
 * @returns Formatted decimal with 1 decimal place
 * @example fmtDecimal(7.3020) => "$7.3"
 */
export function fmtDecimal(n: number): string {
  return formatNumber(n, { currency: true, decimals: 1 })
}

/**
 * Format ratio numbers (e.g., P/E, P/S ratios)
 * @param n - Number to format
 * @returns Formatted ratio with 1 decimal place
 * @example fmtRatio(25.67) => "25.7"
 */
export function fmtRatio(n: number): string {
  return n.toFixed(1)
}

/**
 * Format Y-axis values based on display mode
 * @param v - Value to format
 * @param mode - Format mode: 'short', 'currency', 'percent', 'price', 'int', 'decimal', 'ratio', or default
 * @returns Formatted value
 * @example yFormatter(1500000, 'currency') => "$1.5M"
 * @example yFormatter(182.45, 'price') => "$182"
 * @example yFormatter(7.3020, 'decimal') => "$7.3"
 * @example yFormatter(25.67, 'ratio') => "25.7"
 */
export function yFormatter(v: number, mode: FormatMode): string {
  if (mode === 'short') return fmtShort(v)
  if (mode === 'currency') return formatNumber(v, { currency: true, decimals: 1 })
  if (mode === 'percent') return formatPercent(v / 100, 2) // v is already in percentage form
  if (mode === 'price') return '$' + Math.round(v).toString()
  if (mode === 'int') return Math.round(v).toLocaleString()
  if (mode === 'decimal') return fmtDecimal(v)
  if (mode === 'ratio') return fmtRatio(v)
  return Math.round(v).toString()
}
