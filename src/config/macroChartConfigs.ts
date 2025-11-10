/**
 * Macro Chart Configurations
 * Defines metadata and settings for all macro economic charts
 */

import { COLORS } from '../config/colors'
import type { ChartConfig } from '../types/macro.types'
import { percentFormatter, largeNumberFormatter } from '../utils/chartConfigFactory'

/**
 * Chart configuration metadata
 */
export const MACRO_CHART_CONFIGS: ChartConfig[] = [
  {
    id: 'unemployment',
    title: 'Unemployment Rate',
    dataKey: 'unemploymentRate',
    color: COLORS.chart.blue,
    valueFormatter: percentFormatter,
    tooltipFormatter: percentFormatter
  },
  {
    id: 'inflation',
    title: 'Inflation Rate',
    dataKey: 'inflation',
    color: COLORS.chart.orange,
    valueFormatter: percentFormatter,
    tooltipFormatter: percentFormatter
  },
  {
    id: 'fedFunds',
    title: 'Federal Funds Rate',
    dataKey: 'federalFunds',
    color: COLORS.chart.purple,
    valueFormatter: percentFormatter,
    tooltipFormatter: percentFormatter
  },
  {
    id: 'consumerSentiment',
    title: 'Consumer Sentiment',
    dataKey: 'consumerSentiment',
    color: COLORS.chart.green,
    valueFormatter: (val) => val.toFixed(2),
    tooltipFormatter: (val) => val.toFixed(2)
  },
  {
    id: 'retailSales',
    title: 'Retail Sales',
    dataKey: 'retailSales',
    color: COLORS.chart.blueLight,
    valueFormatter: largeNumberFormatter,
    tooltipFormatter: (val) => `$${largeNumberFormatter(val)}`
  },
  {
    id: 'housingStarts',
    title: 'Housing Starts',
    dataKey: 'housingStarts',
    color: '#9C27B0',
    valueFormatter: largeNumberFormatter,
    tooltipFormatter: (val) => `${largeNumberFormatter(val)} units`
  }
]
