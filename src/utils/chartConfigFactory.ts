/**
 * Chart Configuration Factory
 * Utility functions to generate consistent ECharts configurations
 */

import type { EChartsOption } from 'echarts'
import type { ChartOptionsParams, SliderConfig } from '../types/macro.types'

interface TooltipSeriesParam {
  data: [number, number]
  seriesName: string
}

interface ChartLineSeries {
  name: string
  type: 'line'
  data: [number, number][]
  smooth: boolean
  symbol: 'circle' | 'none'
  symbolSize?: number
  lineStyle: {
    color: string
    width: number
    type?: 'dashed'
  }
  itemStyle: {
    color: string
    borderWidth?: number
    borderColor?: string
  }
  areaStyle?: {
    color: {
      type: 'linear'
      x: number
      y: number
      x2: number
      y2: number
      colorStops: Array<{ offset: number; color: string }>
    }
  }
  emphasis?: {
    focus: 'series'
    itemStyle: {
      borderWidth: number
      borderColor: string
    }
  }
  z?: number
  animation?: boolean
}

/**
 * Default slider configuration for all charts
 */
export const DEFAULT_SLIDER_CONFIG: SliderConfig = {
  height: 30,
  bottom: 10,
  borderColor: 'rgba(255, 255, 255, 0.03)',
  fillerColor: 'rgba(255, 255, 255, 0.03)',
  handleColor: 'rgba(255, 255, 255, 0.1)',
  textColor: '#999',
  dataBackgroundLine: '#444',
  dataBackgroundArea: 'rgba(0, 181, 154, 0.1)',
  moveHandleSize: 5
}

/**
 * Default value formatter (2 decimal places)
 */
const defaultFormatter = (value: number): string => value.toFixed(2)

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(data: [number, number][], period: number): [number, number][] {
  if (data.length < period) return []
  
  const sma: [number, number][] = []
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      const dataPoint = data[i - j]
      if (dataPoint) {
        sum += dataPoint[1]
      }
    }
    const average = sum / period
    const timestamp = data[i]?.[0]
    if (timestamp !== undefined) {
      sma.push([timestamp, average])
    }
  }
  
  return sma
}

/**
 * Creates a standardized ECharts option configuration
 */
export function createChartOptions(params: ChartOptionsParams): EChartsOption {
  const {
    data,
    title,
    color,
    yAxisLabel = '',
    sliderConfig = DEFAULT_SLIDER_CONFIG,
    valueFormatter = defaultFormatter,
    tooltipFormatter = valueFormatter,
    showAverage = false
  } = params

  if (!data || data.length === 0) {
    return createEmptyChartOptions(title)
  }

  // Calculate SMA (Simple Moving Average) if requested
  const smaData = showAverage && data.length > 0
    ? calculateSMA(data, 200) // SMA200
    : []

  const hasSMA = smaData.length > 0

  return {
    backgroundColor: 'transparent',
    title: {
      show: false
    },
    legend: showAverage && hasSMA ? {
      data: [title, 'SMA 200'],
      top: 5,
      left: 'center',
      textStyle: {
        color: '#9CA3AF',
        fontSize: 12
      },
      selected: {
        [title]: true,
        'SMA 200': false // Hidden by default
      }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 25, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#FFF',
        fontSize: 13
      },
      formatter: (rawParams: unknown) => {
        const params = Array.isArray(rawParams)
          ? rawParams as TooltipSeriesParam[]
          : [rawParams as TooltipSeriesParam]

        const firstParam = params[0]
        if (!firstParam) return ''

        const date = new Date(firstParam.data[0])
        const dateStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
        
        let content = `<div style="padding: 4px 0;">
          <div style="color: #999; font-size: 11px; margin-bottom: 4px;">${dateStr}</div>`
        
        // Show all visible series
        params.forEach((param) => {
          const value = tooltipFormatter(param.data[1])
          const seriesColor = param.seriesName === 'SMA 200' ? '#FBBF24' : color
          content += `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            <span style="display: inline-block; width: 10px; height: 10px; background: ${seriesColor}; border-radius: 50%;"></span>
            <span style="color: #999; font-size: 11px; min-width: 60px;">${param.seriesName}:</span>
            <span style="font-weight: 600;">${value}</span>
          </div>`
        })
        
        content += `</div>`
        return content
      }
    },
    grid: {
      top: showAverage && hasSMA ? 40 : 20,
      left: 60,
      right: 20,
      bottom: 60,
      containLabel: false
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisLabel: {
        color: '#999',
        fontSize: 10,
        formatter: (value: number) => {
          const date = new Date(value)
          return date.toLocaleDateString('en-US', {
            year: '2-digit',
            month: 'short'
          })
        }
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameTextStyle: {
        color: '#999',
        fontSize: 10,
        padding: [0, 0, 0, 0]
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#999',
        fontSize: 10,
        formatter: valueFormatter
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: title,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 0,
        lineStyle: {
          color,
          width: 2
        },
        itemStyle: {
          color
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}05` }
            ]
          }
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff'
          }
        }
      } as ChartLineSeries,
      // Add SMA line if requested
      ...(showAverage && smaData.length > 0 ? [{
        name: 'SMA 200',
        type: 'line',
        data: smaData,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#FBBF24', // Yellow
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#FBBF24'
        },
        z: 10,
        animation: false
      } as ChartLineSeries] : [])
    ],
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        ...sliderConfig,
        borderColor: sliderConfig.borderColor,
        fillerColor: sliderConfig.fillerColor,
        handleStyle: {
          color: sliderConfig.handleColor,
          borderColor: sliderConfig.handleColor
        },
        textStyle: {
          color: sliderConfig.textColor
        },
        dataBackground: {
          lineStyle: {
            color: sliderConfig.dataBackgroundLine
          },
          areaStyle: {
            color: sliderConfig.dataBackgroundArea
          }
        },
        moveHandleSize: sliderConfig.moveHandleSize
      }
    ]
  }
}

/**
 * Creates an empty chart configuration (for loading/error states)
 */
function createEmptyChartOptions(_title: string): EChartsOption {
  return {
    backgroundColor: 'transparent',
    title: {
      text: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: {
        color: '#666',
        fontSize: 14
      }
    },
    tooltip: {
      show: false
    },
    xAxis: {
      type: 'time',
      show: false
    },
    yAxis: {
      type: 'value',
      show: false
    }
  }
}

import { formatNumber, formatPercent } from './formatters'

/**
 * Percentage formatter helper
 */
export function percentFormatter(value: number): string {
  return formatPercent(value / 100, 2) // value is already in percentage form
}

/**
 * Large number formatter helper (with K/M/B/T suffixes) - matches main chart formatting
 * Uses consistent 2 decimal places like Revenue, Dividend Yield charts
 */
export function largeNumberFormatter(value: number): string {
  return formatNumber(value, { currency: false, decimals: 2 })
}
