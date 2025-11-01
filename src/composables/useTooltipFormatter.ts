/**
 * Tooltip Formatter Composable
 * Provides tooltip configuration for ECharts with consistent formatting
 */

import { yFormatter } from '../utils/chartFormatters'

interface TooltipFormatterOptions {
  kind?: 'bar' | 'line'
  dualAxis?: boolean
  yFormat?: 'short' | 'currency' | 'percent' | 'price' | 'int'
}

interface TooltipConfigOptions extends TooltipFormatterOptions {
  isLarge?: boolean
  isMobile?: boolean
}

interface TooltipParam {
  marker: string
  seriesName: string
  name: string
  value: number | [number, number]
}

interface EChartsTooltipConfig {
  show?: boolean
  trigger?: string
  confine?: boolean
  triggerOn?: string
  position?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  textStyle?: {
    color: string
    fontSize: number
  }
  formatter?: (params: TooltipParam | TooltipParam[]) => string
}

/**
 * Create a tooltip formatter function for ECharts
 * @param options - Configuration options
 * @returns Formatter function for ECharts tooltip
 */
export function createTooltipFormatter(options: TooltipFormatterOptions = {}): (params: TooltipParam | TooltipParam[]) => string {
  const { kind = 'line', dualAxis = false, yFormat = 'short' } = options

  return (params) => {
    if (!params || (Array.isArray(params) && params.length === 0)) return ''

    const paramsArray = Array.isArray(params) ? params : [params]
    if (paramsArray.length === 0) return ''

    const firstParam = paramsArray[0]
    if (!firstParam) return ''

    // For bar charts, params[0].value is the data value, not an array
    // For line charts, params[0].value is [timestamp, value]
    const isBarChart = kind === 'bar'
    const date = isBarChart
      ? firstParam.name // Bar chart uses category name (year)
      : new Date((firstParam.value as [number, number])[0]).toLocaleDateString()

    let html = `<div style="font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #E5E5E5;">${date}</div>`

    // Filter out zero values and sort by value (descending)
    const sortedParams = paramsArray
      .map(item => {
        const value = isBarChart ? Number(item.value) : Number((item.value as [number, number])[1])
        return { ...item, numericValue: value }
      })
      .filter(item => item.numericValue !== 0 && !isNaN(item.numericValue))
      .sort((a, b) => b.numericValue - a.numericValue) // Sort descending (biggest first)

    sortedParams.forEach(item => {
      const marker = item.marker
      const name = item.seriesName || ''
      const value = item.numericValue
      
      const lname = String(name).toLowerCase()
      let formatted: string

      // Check if this is shares data (shares outstanding, diluted shares, etc.)
      // Exclude "Share Buybacks" which is a dollar amount, not share count
      const isSharesData = (lname.includes('shares') || lname.includes('outstanding')) && !lname.includes('buyback')

      if (dualAxis) {
        // Dual axis specific formatting
        if (lname.includes('price')) {
          formatted = `$${value.toFixed(2)}`
        } else if (lname.includes('margin') || lname.includes('%')) {
          formatted = `${value.toFixed(1)}%`
        } else if (isSharesData) {
          const sign = value >= 0 ? '+' : ''
          const abs = Math.abs(value)
          formatted = abs >= 1000
            ? `${sign}${(value / 1000).toFixed(1)}K shares`
            : `${sign}${value.toFixed(0)} shares`
        } else {
          // For dual axis non-price values, use currency format
          formatted = yFormatter(value, 'currency')
        }
      } else {
        // Check for shares data first (before applying currency format)
        if (isSharesData) {
          // Format shares as millions (e.g., "1,234M shares")
          const abs = Math.abs(value)
          if (abs >= 1e9) {
            formatted = `${(value / 1e9).toFixed(2)}B shares`
          } else if (abs >= 1e6) {
            formatted = `${(value / 1e6).toFixed(0)}M shares`
          } else if (abs >= 1e3) {
            formatted = `${(value / 1e3).toFixed(0)}K shares`
          } else {
            formatted = `${Math.round(value).toLocaleString()} shares`
          }
        } else if (yFormat === 'percent') {
          formatted = `${value.toFixed(1)}%`
        } else if (yFormat === 'price') {
          // Format as price with 2 decimal places
          formatted = `$${value.toFixed(2)}`
        } else if (yFormat === 'int') {
          formatted = Math.round(value).toLocaleString()
        } else {
          // For 'short' and 'currency' modes, always show currency format in tooltip
          formatted = yFormatter(value, 'currency')
        }
      }

      html += `<div style="color: #E5E5E5;">${marker} ${name}: ${formatted}</div>`
    })
    return html
  }
}

/**
 * Get tooltip configuration for ECharts
 * @param options - Configuration options
 * @returns ECharts tooltip configuration
 */
export function getTooltipConfig(options: TooltipConfigOptions = {}): EChartsTooltipConfig {
  const {
    isLarge = false,
    isMobile = false,
    kind = 'line',
    dualAxis = false,
    yFormat = 'short'
  } = options

  const formatter = createTooltipFormatter({ kind, dualAxis, yFormat })

  // Compact view on mobile - disable tooltips to prevent persistence bug
  if (isMobile && !isLarge) {
    return {
      show: false
    }
  }

  // Unified tooltip configuration for both modal and compact views
  return {
    trigger: 'axis',
    confine: isMobile, // Keep tooltip within chart bounds on mobile
    triggerOn: isMobile ? 'click' : 'mousemove|click', // Tap to show on mobile, hover/click on desktop
    position: isMobile ? 'top' : undefined, // Fixed position on mobile
    backgroundColor: 'rgba(21, 21, 24, 0.95)',
    borderColor: '#2A2A2E',
    borderWidth: 1,
    textStyle: {
      color: '#E5E5E5',
      fontSize: 13 // Unified font size for both compact and modal views
    },
    formatter
  }
}
