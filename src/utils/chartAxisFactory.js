/**
 * Factory functions for creating ECharts axis configurations
 * Extracted from BaseChart.vue to reduce complexity
 */

import { yFormatter, fmtShort } from './chartFormatters.js'

/**
 * Create X-axis configuration
 * @param {string} kind - Chart kind ('bar' or 'line')
 * @param {Object} options - Configuration options
 * @param {Array} options.categoryData - Category data for bar charts
 * @param {boolean} options.isLarge - Large view mode
 * @param {boolean} options.isMobile - Mobile device
 * @returns {Object} ECharts X-axis configuration
 */
export function createXAxisConfig(kind, options = {}) {
  const {
    categoryData = [],
    isLarge = false,
    isMobile = false
  } = options

  return {
    type: kind === 'bar' ? 'category' : 'time',
    data: kind === 'bar' ? categoryData : undefined,
    boundaryGap: kind === 'bar' ? true : false,
    axisLabel: { 
      color: '#ddd', 
      fontSize: isMobile ? 10 : (isLarge ? 14 : 12),
      rotate: (kind === 'bar' && isLarge) ? 45 : 0,
      hideOverlap: false,
      showMinLabel: true,
      showMaxLabel: true,
      formatter: kind === 'bar' ? undefined : '{yyyy}', // Category axis shows data as-is
      // For bar charts: show all labels on desktop (interval: 0), fewer on mobile (interval: 1)
      interval: (kind === 'bar' && isLarge) ? (isMobile ? 1 : 0) : 'auto'
    },
    axisTick: {
      alignWithLabel: true,
      show: true
    },
    axisLine: { lineStyle: { color: '#aaa' } },
    splitLine: { show: false }
  }
}

/**
 * Create single Y-axis configuration
 * @param {Object} options - Configuration options
 * @param {string} options.yFormat - Y-axis format ('short', 'currency', 'percent', 'int')
 * @param {boolean} options.isLarge - Large view mode
 * @param {boolean} options.isMobile - Mobile device
 * @param {string} options.chartTitle - Chart title for special handling
 * @returns {Object} ECharts Y-axis configuration
 */
export function createSingleYAxisConfig(options = {}) {
  const {
    yFormat = 'short',
    isLarge = false,
    isMobile = false,
    chartTitle = ''
  } = options

  // Special handling for Shares Outstanding chart
  const isSharesChart = chartTitle && chartTitle.includes('Shares Outstanding')

  return {
    type: 'value',
    scale: true,
    splitNumber: 4, // Limit to 4 intervals (5 lines total) for cleaner axis
    min: (v) => {
      // Special handling for Shares Outstanding: min is 20% below lowest value
      if (isSharesChart) {
        return v.min * 0.8
      }
      
      const r = v.max - v.min
      if (r === 0) {
        const p = Math.abs(v.min) * 0.05 || 1
        return v.min - p
      }
      const calculated = v.min - r * 0.03 // Reduced padding from 0.06 to 0.03
      // If all data is positive, don't let axis go negative
      if (v.min >= 0 && calculated < 0) {
        return 0
      }
      return calculated
    },
    max: (v) => {
      const r = v.max - v.min
      if (r === 0) {
        const p = Math.abs(v.max) * 0.05 || 1
        return v.max + p
      }
      return v.max + r * 0.03 // Reduced padding from 0.06 to 0.03
    },
    axisLabel: { 
      color: '#ddd', 
      fontSize: isMobile ? 10 : (isLarge ? 14 : 12),
      formatter: (val) => yFormatter(val, yFormat) 
    },
    axisLine: { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
  }
}

/**
 * Create dual Y-axis configuration (left and right)
 * @param {Object} options - Configuration options
 * @param {string} options.yFormat - Left Y-axis format
 * @param {string} options.rightAxisType - Right axis type ('percentage' or 'default')
 * @param {boolean} options.isLarge - Large view mode
 * @param {boolean} options.isMobile - Mobile device
 * @returns {Array} Array of two ECharts Y-axis configurations
 */
export function createDualYAxisConfig(options = {}) {
  const {
    yFormat = 'short',
    rightAxisType = 'default',
    isLarge = false,
    isMobile = false
  } = options

  return [
    // Left axis (for price/primary data)
    {
      type: 'value',
      scale: true,
      position: 'left',
      axisLabel: { 
        color: '#ddd', 
        fontSize: isMobile ? 10 : (isLarge ? 14 : 12),
        formatter: (val) => yFormatter(val, yFormat) 
      },
      axisLine: { lineStyle: { color: '#aaa' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
    },
    // Right axis (for insider trading/secondary data or percentage margins)
    {
      type: 'value',
      position: 'right',
      min: rightAxisType === 'percentage' ? 0 : (value) => {
        // Ensure 0 is always centered by making bounds symmetric
        const absMax = Math.max(Math.abs(value.min), Math.abs(value.max))
        // Add 10% padding to prevent data from touching edges
        return -absMax * 1.1
      },
      max: rightAxisType === 'percentage' ? (value) => {
        // Round up to nearest 10 for clean scale (e.g., 38% -> 40%)
        return Math.ceil(value.max / 10) * 10
      } : (value) => {
        // Ensure 0 is always centered by making bounds symmetric
        const absMax = Math.max(Math.abs(value.min), Math.abs(value.max))
        // Add 10% padding to prevent data from touching edges
        return absMax * 1.1
      },
      splitNumber: 4, // Force 4 split lines for better centering
      axisLabel: { 
        color: '#ddd', 
        fontSize: isMobile ? 10 : (isLarge ? 14 : 12),
        formatter: (val) => {
          if (rightAxisType === 'percentage') {
            return val.toFixed(1) + '%'
          }
          // Use same formatting as shares outstanding chart
          return fmtShort(val)
        }
      },
      axisLine: { lineStyle: { color: '#aaa' } },
      splitLine: { 
        show: true,
        lineStyle: { 
          color: 'rgba(255,255,255,0.1)',
          type: 'dashed'
        }
      }
    }
  ]
}

/**
 * Create Y-axis configuration (single or dual)
 * Main entry point for Y-axis creation
 * @param {Object} options - Configuration options
 * @param {boolean} options.dualAxis - Enable dual axis
 * @param {string} options.yFormat - Y-axis format
 * @param {string} options.rightAxisType - Right axis type (for dual axis)
 * @param {boolean} options.isLarge - Large view mode
 * @param {boolean} options.isMobile - Mobile device
 * @returns {Object|Array} ECharts Y-axis configuration
 */
export function createYAxisConfig(options = {}) {
  const { dualAxis = false } = options

  if (dualAxis) {
    return createDualYAxisConfig(options)
  }

  return createSingleYAxisConfig(options)
}
