/**
 * Macro Dashboard Type Definitions
 * Centralized types for macro economic charts and dashboard components
 */

import type { EChartsOption } from 'echarts'

/**
 * Chart metadata configuration
 */
export interface ChartConfig {
  id: string
  title: string
  dataKey: keyof import('../services/macro/macroDataService').MacroData
  color: string
  yAxisLabel?: string
  valueFormatter?: (value: number) => string
  tooltipFormatter?: (value: number) => string
}

/**
 * Chart state management
 */
export interface ChartState {
  isZoomed: boolean
  isSynced: boolean
  chartRef: any // VChart instance type
}

/**
 * Time range for synchronized zooming
 */
export interface TimeRange {
  start: number
  end: number
}

/**
 * Slider configuration for consistent styling
 */
export interface SliderConfig {
  height: number
  bottom: number
  borderColor: string
  fillerColor: string
  handleColor: string
  textColor: string
  dataBackgroundLine: string
  dataBackgroundArea: string
  moveHandleSize: number
}

/**
 * Chart synchronization configuration
 */
export interface SyncConfig {
  enabled: boolean
  timeRange: TimeRange
  isSyncing: boolean
}

/**
 * Index card data for header display
 */
export interface IndexData {
  name: string
  change: number
}

/**
 * Chart options factory parameters
 */
export interface ChartOptionsParams {
  data: [number, number][] | null
  title: string
  color: string
  yAxisLabel?: string
  sliderConfig: SliderConfig
  valueFormatter?: (value: number) => string
  tooltipFormatter?: (value: number) => string
  showAverage?: boolean
}
