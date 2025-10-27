/**
 * Centralized color system for Factorly
 * 
 * This file defines all colors used throughout the application to ensure
 * consistency across components. Update colors here to change them globally.
 */

// Brand colors (Aston Martin inspired)
export const BRAND_PRIMARY = '#00A88E'  // Teal/green - primary brand color
export const BRAND_PRIMARY_DARK = '#00594C'  // Darker teal - for borders and accents

// Status colors for metrics and growth indicators
export const STATUS_SUCCESS = '#00A88E'  // Green - positive/good performance
export const STATUS_WARNING = '#F59E0B'  // Yellow/amber - neutral/moderate performance
export const STATUS_DANGER = '#ef4444'   // Red - negative/poor performance

// Convenience aliases for common use cases
export const COLORS = {
  // Brand
  brand: {
    primary: BRAND_PRIMARY,
    primaryDark: BRAND_PRIMARY_DARK,
  },
  
  // Status indicators
  status: {
    success: STATUS_SUCCESS,
    warning: STATUS_WARNING,
    danger: STATUS_DANGER,
  },
  
  // Growth indicators (semantic naming)
  growth: {
    positive: STATUS_SUCCESS,   // Green: Strong growth
    moderate: STATUS_WARNING,   // Yellow: Moderate growth
    negative: STATUS_DANGER,    // Red: Negative growth
  },
  
  // Financial metrics (semantic naming)
  metrics: {
    excellent: STATUS_SUCCESS,  // Green: Excellent metric value
    acceptable: STATUS_WARNING, // Yellow: Acceptable metric value
    poor: STATUS_DANGER,        // Red: Poor metric value
  }
} as const

/**
 * Get color based on growth rate threshold
 * @param growthRate - Growth rate as a percentage (e.g., 15 for 15%)
 * @param positiveThreshold - Threshold for positive growth (default: 10%)
 * @returns Color hex code or null
 */
export function getGrowthColor(growthRate: number | null | undefined, positiveThreshold: number = 10): string | null {
  if (growthRate === null || growthRate === undefined) return null
  if (growthRate > positiveThreshold) return COLORS.growth.positive
  if (growthRate >= 0) return COLORS.growth.moderate
  return COLORS.growth.negative
}

/**
 * Get color based on FCF Yield threshold
 * @param fcfYield - FCF Yield as a percentage (e.g., 2.5 for 2.5%)
 * @returns Color hex code or null
 */
export function getFCFYieldColor(fcfYield: number | null | undefined): string | null {
  // Debug - always log to see what's happening
  const result = fcfYield === null || fcfYield === undefined ? null
    : fcfYield > 2 ? COLORS.metrics.excellent
    : fcfYield >= 1 ? COLORS.metrics.acceptable
    : COLORS.metrics.poor
  
  console.log(`FCF Yield Color Debug: value=${fcfYield}, color=${result}`)
  return result
}

interface ThresholdConfig {
  excellent: number
  acceptable: number
}

/**
 * Get color based on a custom threshold range
 * @param value - The value to evaluate
 * @param thresholds - Threshold configuration
 * @returns Color hex code or null
 */
export function getThresholdColor(value: number | null | undefined, { excellent, acceptable }: ThresholdConfig): string | null {
  if (value === null || value === undefined) return null
  if (value >= excellent) return COLORS.metrics.excellent
  if (value >= acceptable) return COLORS.metrics.acceptable
  return COLORS.metrics.poor
}

// Export default for convenience
export default COLORS
