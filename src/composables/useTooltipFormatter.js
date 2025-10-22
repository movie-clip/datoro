/**
 * Tooltip Formatter Composable
 * Provides tooltip configuration for ECharts with consistent formatting
 */

import { yFormatter } from '../utils/chartFormatters.js'

/**
 * Create a tooltip formatter function for ECharts
 * @param {Object} options - Configuration options
 * @param {string} options.kind - Chart type ('bar' or 'line')
 * @param {boolean} options.dualAxis - Whether chart has dual axis
 * @param {string} options.yFormat - Y-axis format mode
 * @returns {Function} Formatter function for ECharts tooltip
 */
export function createTooltipFormatter(options = {}) {
  const { kind = 'line', dualAxis = false, yFormat = 'short' } = options

  return (params) => {
    if (!params || params.length === 0) return ''

    // For bar charts, params[0].value is the data value, not an array
    // For line charts, params[0].value is [timestamp, value]
    const isBarChart = kind === 'bar'
    const date = isBarChart
      ? params[0].name // Bar chart uses category name (year)
      : new Date(params[0].value[0]).toLocaleDateString()

    let html = `<div style="font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #E5E5E5;">${date}</div>`

    params.forEach(item => {
      const marker = item.marker
      const name = item.seriesName || ''
      const value = isBarChart ? Number(item.value) : Number(item.value[1])
      const lname = String(name).toLowerCase()
      let formatted

      if (dualAxis) {
        // Dual axis specific formatting
        if (lname.includes('price')) {
          formatted = `$${value.toFixed(2)}`
        } else if (lname.includes('margin') || lname.includes('%')) {
          formatted = `${value.toFixed(1)}%`
        } else if (lname.includes('share')) {
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
        // Always use currency format for tooltips (consistent "$10B" format)
        if (yFormat === 'percent') {
          formatted = `${value.toFixed(1)}%`
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
 * @param {Object} options - Configuration options
 * @param {boolean} options.isLarge - Whether chart is in modal/large view
 * @param {boolean} options.isMobile - Whether on mobile device
 * @param {string} options.kind - Chart type ('bar' or 'line')
 * @param {boolean} options.dualAxis - Whether chart has dual axis
 * @param {string} options.yFormat - Y-axis format mode
 * @returns {Object} ECharts tooltip configuration
 */
export function getTooltipConfig(options = {}) {
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
