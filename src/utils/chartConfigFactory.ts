/**
 * Chart Configuration Factory
 * Utility functions to generate consistent ECharts configurations
 */

import type { EChartsOption } from 'echarts'
import type { ChartOptionsParams, SliderConfig } from '../types/macro.types'

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
    tooltipFormatter = valueFormatter
  } = params

  if (!data || data.length === 0) {
    return createEmptyChartOptions(title)
  }

  return {
    backgroundColor: 'transparent',
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 25, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#FFF',
        fontSize: 13
      },
      formatter: (params: any) => {
        const point = params[0]
        if (!point) return ''
        
        const date = new Date(point.data[0])
        const dateStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
        const value = tooltipFormatter(point.data[1])
        
        return `
          <div style="padding: 4px 0;">
            <div style="color: #999; font-size: 11px; margin-bottom: 4px;">${dateStr}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
              <span style="font-weight: 600;">${value}</span>
            </div>
          </div>
        `
      }
    },
    grid: {
      top: 20,
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
        fontSize: 11,
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
        fontSize: 11,
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
        fontSize: 11,
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
      } as any
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
function createEmptyChartOptions(title: string): EChartsOption {
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

/**
 * Percentage formatter helper
 */
export function percentFormatter(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Large number formatter helper (with K/M/B/T suffixes) - matches main chart formatting
 * Uses consistent 2 decimal places like Revenue, Dividend Yield charts
 */
export function largeNumberFormatter(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  if (absValue >= 1e12) return `${sign}${(absValue / 1e12).toFixed(2)}T`
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(2)}B`
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(2)}M`
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(2)}K`
  return `${sign}${absValue.toFixed(2)}`
}
