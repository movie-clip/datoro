/**
 * Factory functions for creating ECharts series configurations
 * Extracted from BaseChart.vue to reduce complexity and improve maintainability
 */

import { convertToCategoryData } from './chartDataTransformers'
import { isConfiguredSeries, isMultiSeriesFormat, isConfiguredSeriesArray } from './chartTypeGuards'

type ChartKind = 'bar' | 'line'

interface SeriesItemStyle {
  opacity?: number
  color?: string
  [key: string]: unknown
}

interface BarSeriesOptions {
  name?: string
  barMaxWidth?: number
  yearsList?: number[]
  stack?: string
  itemStyle?: SeriesItemStyle
}

interface LineSeriesOptions {
  name?: string
  smooth?: boolean
  isLarge?: boolean
  itemStyle?: SeriesItemStyle
}

interface MultiSeriesOptions {
  yearsList?: number[]
  barMaxWidth?: number
  smooth?: boolean
  isLarge?: boolean
}

interface SeriesConfigOptions extends MultiSeriesOptions {
  title?: string
}

export interface SeriesDataObject {
  name: string
  data: [number, number][]
  stack?: string
  itemStyle?: SeriesItemStyle
  type?: string
  [key: string]: unknown
}

/**
 * Create a bar series configuration
 * @param data - Time-series data [[timestamp, value], ...] or category values
 * @param options - Configuration options
 * @returns ECharts bar series configuration
 */
export function createBarSeries(data: [number, number][] | number[], options: BarSeriesOptions = {}) {
  const {
    name = 'Series',
    barMaxWidth,
    yearsList = [],
    stack,
    itemStyle = {}
  } = options

  // Convert time-series to category values if category axis is used
  const barData = yearsList.length > 0 
    ? convertToCategoryData(data as [number, number][], yearsList)
    : data

  return {
    type: 'bar' as const,
    name,
    data: barData,
    barMaxWidth,
    stack: stack || undefined,
    itemStyle: { opacity: 0.9, ...itemStyle }
  }
}

/**
 * Create a line series configuration
 * @param data - Time-series data [[timestamp, value], ...]
 * @param options - Configuration options
 * @returns ECharts line series configuration
 */
export function createLineSeries(data: [number, number][], options: LineSeriesOptions = {}) {
  const {
    name = 'Series',
    smooth = false,
    isLarge = false,
    itemStyle = {}
  } = options

  return {
    type: 'line' as const,
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
 * @param dataSource - Multi-series data
 * @param kind - Chart kind ('bar' or 'line')
 * @param options - Configuration options
 * @returns Array of ECharts series configurations
 */
export function createMultiSeries(dataSource: SeriesDataObject[], kind: ChartKind, options: MultiSeriesOptions = {}) {
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
      return dataSource.map((s) => {
        // Strip yAxisIndex to avoid conflicts - parent component controls axis configuration
        const { yAxisIndex, ...cleanSeries } = s
        return {
          ...cleanSeries,
          // Convert time-series data to category values for ALL series (bars and lines)
          data: convertToCategoryData(s.data, yearsList)
        }
      })
    } else {
      // Strip yAxisIndex from configured series - parent component controls axis configuration
      return dataSource.map((s) => {
        const { yAxisIndex, ...cleanSeries } = s
        return cleanSeries
      })
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
        type: 'bar' as const,
        name: s.name,
        data: seriesData,
        stack: s.stack || undefined,
        barMaxWidth,
        itemStyle: { opacity: 0.9, ...(s.itemStyle || {}) }
      }
    } else {
      return {
        type: 'line' as const,
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
 * @param dataSource - Data in various formats
 * @param kind - Chart kind ('bar' or 'line')
 * @param options - Configuration options
 * @returns Array of ECharts series configurations
 */
export function createSeriesConfig(
  dataSource: [number, number][] | [number, number, string, string][] | SeriesDataObject[] | Record<string, unknown>, 
  kind: ChartKind, 
  options: SeriesConfigOptions = {}
) {
  const { title = 'Series' } = options

  // Check if dataSource is already a fully configured series object
  if (isConfiguredSeries(dataSource)) {
    return [dataSource]
  }

  // Multi-series format: [{ name: 'FCF', data: [...] }, { name: 'SBC', data: [...] }]
  if (isMultiSeriesFormat(dataSource)) {
    return createMultiSeries(dataSource as SeriesDataObject[], kind, options)
  }

  // Single series format: [[timestamp, value], ...]
  if (kind === 'bar') {
    return [createBarSeries(dataSource as [number, number][], { name: title, ...options })]
  } else {
    return [createLineSeries(dataSource as [number, number][], { name: title, ...options })]
  }
}
