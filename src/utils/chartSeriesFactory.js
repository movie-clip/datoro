/**
 * Factory functions for creating ECharts series configurations
 * Extracted from BaseChart.vue to reduce complexity and improve maintainability
 */

import { convertToCategoryData } from './chartDataTransformers.js'
import { isConfiguredSeries, isMultiSeriesFormat, isConfiguredSeriesArray } from './chartTypeGuards.js'

/**
 * Create a bar series configuration
 * @param {Array} data - Time-series data [[timestamp, value], ...] or category values
 * @param {Object} options - Configuration options
 * @param {string} options.name - Series name
 * @param {number} options.barMaxWidth - Maximum bar width
 * @param {Array} options.yearsList - Category years (for category axis)
 * @param {string} options.stack - Stack identifier for stacked bars
 * @param {Object} options.itemStyle - Additional item styles
 * @returns {Object} ECharts bar series configuration
 */
export function createBarSeries(data, options = {}) {
  const {
    name = 'Series',
    barMaxWidth,
    yearsList = [],
    stack,
    itemStyle = {}
  } = options

  // Convert time-series to category values if category axis is used
  const barData = yearsList.length > 0 
    ? convertToCategoryData(data, yearsList)
    : data

  return {
    type: 'bar',
    name,
    data: barData,
    barMaxWidth,
    stack: stack || undefined,
    itemStyle: { opacity: 0.9, ...itemStyle }
  }
}

/**
 * Create a line series configuration
 * @param {Array} data - Time-series data [[timestamp, value], ...]
 * @param {Object} options - Configuration options
 * @param {string} options.name - Series name
 * @param {boolean} options.smooth - Enable smooth curves
 * @param {boolean} options.isLarge - Use thicker lines for large view
 * @param {Object} options.itemStyle - Additional item styles
 * @returns {Object} ECharts line series configuration
 */
export function createLineSeries(data, options = {}) {
  const {
    name = 'Series',
    smooth = false,
    isLarge = false,
    itemStyle = {}
  } = options

  return {
    type: 'line',
    name,
    data,
    smooth,
    showSymbol: false,
    emphasis: { disabled: true },
    lineStyle: { width: isLarge ? 3 : 2 },
    itemStyle: { opacity: 0.9, ...itemStyle }
  }
}

/**
 * Process multi-series data into series configurations
 * Handles both configured and unconfigured series formats
 * @param {Array} dataSource - Multi-series data
 * @param {string} kind - Chart kind ('bar' or 'line')
 * @param {Object} options - Configuration options
 * @param {Array} options.yearsList - Category years (for bar charts)
 * @param {number} options.barMaxWidth - Maximum bar width (for bar charts)
 * @param {boolean} options.smooth - Enable smooth curves (for line charts)
 * @param {boolean} options.isLarge - Use thicker lines (for line charts)
 * @returns {Array} Array of ECharts series configurations
 */
export function createMultiSeries(dataSource, kind, options = {}) {
  const {
    yearsList = [],
    barMaxWidth,
    smooth = false,
    isLarge = false
  } = options

  // If series already has 'type' property, it's a fully configured series
  if (isConfiguredSeriesArray(dataSource)) {
    // For bar charts with category axis, we still need to convert the data
    if (kind === 'bar' && yearsList.length > 0) {
      return dataSource.map((s) => ({
        ...s,
        // Convert time-series data to category values for ALL series (bars and lines)
        data: convertToCategoryData(s.data, yearsList)
      }))
    } else {
      // Use as-is for line charts (time axis)
      return dataSource
    }
  }

  // Otherwise, apply default configuration based on chart kind
  return dataSource.map((s) => {
    // For bar charts with category axis, convert time-series to category values
    const seriesData = (kind === 'bar' && yearsList.length > 0) 
      ? convertToCategoryData(s.data, yearsList)
      : s.data

    if (kind === 'bar') {
      return {
        type: 'bar',
        name: s.name,
        data: seriesData,
        stack: s.stack || undefined,
        barMaxWidth,
        itemStyle: { opacity: 0.9, ...(s.itemStyle || {}) }
      }
    } else {
      return {
        type: 'line',
        name: s.name,
        data: seriesData,
        smooth,
        showSymbol: false,
        emphasis: { disabled: true },
        lineStyle: { width: isLarge ? 3 : 2 },
        itemStyle: { opacity: 0.9, ...(s.itemStyle || {}) }
      }
    }
  })
}

/**
 * Create series configuration from various data source formats
 * Main entry point for series creation - handles all data formats
 * @param {Array|Object} dataSource - Data in various formats
 * @param {string} kind - Chart kind ('bar' or 'line')
 * @param {Object} options - Configuration options
 * @returns {Array} Array of ECharts series configurations
 */
export function createSeriesConfig(dataSource, kind, options = {}) {
  const { title = 'Series' } = options

  // Check if dataSource is already a fully configured series object
  if (isConfiguredSeries(dataSource)) {
    return [dataSource]
  }

  // Multi-series format: [{ name: 'FCF', data: [...] }, { name: 'SBC', data: [...] }]
  if (isMultiSeriesFormat(dataSource)) {
    return createMultiSeries(dataSource, kind, options)
  }

  // Single series format: [[timestamp, value], ...]
  if (kind === 'bar') {
    return [createBarSeries(dataSource, { name: title, ...options })]
  } else {
    return [createLineSeries(dataSource, { name: title, ...options })]
  }
}
