/**
 * Factory functions for creating ECharts axis configurations
 * Extracted from BaseChart.vue to reduce complexity
 */

import { yFormatter, fmtShort } from './chartFormatters'

type ChartKind = 'bar' | 'line'
type YFormat = 'short' | 'currency' | 'percent' | 'price' | 'int' | 'decimal' | 'ratio' | 'default'
type RightAxisType = 'percentage' | 'default'

interface XAxisOptions {
  categoryData?: string[]
  isLarge?: boolean
  isMobile?: boolean
  isQuarterly?: boolean
}

interface YAxisOptions {
  yFormat?: YFormat
  isLarge?: boolean
  isMobile?: boolean
  chartTitle?: string
}

interface DualYAxisOptions {
  yFormat?: YFormat
  rightAxisType?: RightAxisType
  isLarge?: boolean
  isMobile?: boolean
  alignZero?: boolean // New option to align zero lines
}

interface YAxisConfigOptions extends YAxisOptions {
  dualAxis?: boolean
  rightAxisType?: RightAxisType
  alignZero?: boolean
}

interface MinMaxValue {
  min: number
  max: number
}

/**
 * Create X-axis configuration
 * @param kind - Chart kind ('bar' or 'line')
 * @param options - Configuration options
 * @returns ECharts X-axis configuration
 */
export function createXAxisConfig(kind: ChartKind, options: XAxisOptions = {}) {
  const {
    categoryData = [],
    isLarge = false,
    isMobile = false,
    isQuarterly = false
  } = options

  // For quarterly data in compact mode, show every other year (Q4 of every 2nd year)
  let axisLabelFormatter: ((value: string, index: number) => string) | undefined
  let axisLabelInterval: number | 'auto' | ((index: number, value: string) => boolean) = 'auto'

  if (kind === 'bar' && isQuarterly && !isLarge) {
    // In compact mode with quarterly data, show labels for Q4 of each year for readability
    // This prevents overlapping while still showing year progression
    axisLabelInterval = (index: number, value: string) => {
      // Show Q4 labels (end of year markers)
      return value.startsWith('Q4')
    }
  } else if (kind === 'bar' && isLarge) {
    // Large view: show all labels on desktop, fewer on mobile
    axisLabelInterval = isMobile ? 1 : 0
  }

  return {
    type: kind === 'bar' ? 'category' : 'time',
    data: kind === 'bar' ? categoryData : undefined,
    boundaryGap: kind === 'bar' ? true : false,
    axisLabel: { 
      color: '#ddd', 
      fontSize: isMobile ? 9 : (isLarge ? 13 : 10),
      rotate: kind === 'bar' ? 45 : 0, // Rotate bar chart labels in both compact and expanded modes
      hideOverlap: false,
      showMinLabel: true,
      showMaxLabel: true,
      formatter: axisLabelFormatter || (kind === 'bar' ? undefined : '{yyyy}'), // Category axis shows data as-is or custom formatter
      // For bar charts: controlled by logic above
      interval: axisLabelInterval
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
 * @param options - Configuration options
 * @returns ECharts Y-axis configuration
 */
export function createSingleYAxisConfig(options: YAxisOptions = {}) {
  const {
    yFormat = 'short',
    isLarge = false,
    isMobile = false,
    chartTitle = ''
  } = options

  // Special handling for Shares Outstanding chart
  const isSharesChart = chartTitle && chartTitle.includes('Shares Outstanding')

  return {
    type: 'value' as const,
    scale: true,
    splitNumber: 4, // Limit to 4 intervals (5 lines total) for cleaner axis
    min: (v: MinMaxValue) => {
      // Special handling for Shares Outstanding: min is 10% below lowest value for better visual difference
      if (isSharesChart) {
        return v.min * 0.50
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
    max: (v: MinMaxValue) => {
      // Special handling for Shares Outstanding: max is 2% above highest value for better scale
      if (isSharesChart) {
        return v.max * 1.02
      }
      
      const r = v.max - v.min
      if (r === 0) {
        const p = Math.abs(v.max) * 0.05 || 1
        return v.max + p
      }
      return v.max + r * 0.03 // Reduced padding from 0.06 to 0.03
    },
    axisLabel: { 
      color: '#ddd', 
      fontSize: isMobile ? 9 : (isLarge ? 13 : 10),
      formatter: (val: number) => yFormatter(val, yFormat) 
    },
    axisLine: { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
  }
}

/**
 * Create dual Y-axis configuration (left and right)
 * @param options - Configuration options
 * @returns Array of two ECharts Y-axis configurations
 */
export function createDualYAxisConfig(options: DualYAxisOptions = {}) {
  const {
    yFormat = 'short',
    rightAxisType = 'default',
    isLarge = false,
    isMobile = false,
    alignZero: _alignZero = false
  } = options

  // If alignZero is enabled, use alignTicks to synchronize the zero line position
  const leftAxisConfig = {
    type: 'value' as const,
    scale: true, // Always enable scale for proper data fitting
    position: 'left' as const,
    splitNumber: 4,
    alignTicks: false, // Let each axis scale independently
    min: (v: MinMaxValue) => {
      const r = v.max - v.min
      if (r === 0) {
        const p = Math.abs(v.min) * 0.05 || 1
        return v.min - p
      }
      const calculated = v.min - r * 0.05 // Add 5% padding at bottom
      // If all data is positive, start from zero
      if (v.min >= 0 && calculated < 0) {
        return 0
      }
      return calculated
    },
    max: (v: MinMaxValue) => {
      const r = v.max - v.min
      if (r === 0) {
        const p = Math.abs(v.max) * 0.05 || 1
        return v.max + p
      }
      return v.max + r * 0.05 // Add 5% padding at top
    },
    axisLabel: { 
      color: '#ddd', 
      fontSize: isMobile ? 9 : (isLarge ? 11 : 10),
      formatter: (val: number) => yFormatter(val, yFormat) 
    },
    axisLine: { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
  }

  const rightAxisConfig = {
    type: 'value' as const,
    position: 'right' as const,
    scale: true, // Always enable scale for proper data fitting
    alignTicks: false, // Don't force tick alignment - let each axis scale independently
    min: rightAxisType === 'percentage' ? (value: MinMaxValue) => {
      // Always start from 0 for positive margins, allow negative if needed
      if (value.min >= 0) return 0
      // For negative values, add padding
      return Math.floor(value.min / 10) * 10 - 5
    } : (value: MinMaxValue) => {
      const absMax = Math.max(Math.abs(value.min), Math.abs(value.max))
      return -absMax * 1.1
    },
    max: rightAxisType === 'percentage' ? (value: MinMaxValue) => {
      // Add dynamic padding based on data range
      const range = value.max - value.min
      const padding = Math.max(5, range * 0.15) // 15% padding or minimum 5%
      return Math.ceil((value.max + padding) / 5) * 5 // Round to nearest 5
    } : (value: MinMaxValue) => {
      const absMax = Math.max(Math.abs(value.min), Math.abs(value.max))
      return absMax * 1.1
    },
    splitNumber: 4,
    axisLabel: { 
      color: '#ddd', 
      fontSize: isMobile ? 9 : (isLarge ? 13 : 10),
      formatter: (val: number) => {
        if (rightAxisType === 'percentage') {
          return val.toFixed(1) + '%'
        }
        if (yFormat === 'ratio') {
          return yFormatter(val, yFormat)
        }
        return fmtShort(val)
      }
    },
    axisLine: { lineStyle: { color: '#aaa' } },
    splitLine: { 
      show: true,
      lineStyle: { 
        color: 'rgba(255,255,255,0.1)',
        type: 'dashed' as const
      }
    }
  }

  return [leftAxisConfig, rightAxisConfig]
}

/**
 * Create Y-axis configuration (single or dual)
 * Main entry point for Y-axis creation
 * @param options - Configuration options
 * @returns ECharts Y-axis configuration
 */
export function createYAxisConfig(options: YAxisConfigOptions = {}) {
  const { dualAxis = false } = options

  if (dualAxis) {
    return createDualYAxisConfig(options)
  }

  return createSingleYAxisConfig(options)
}
