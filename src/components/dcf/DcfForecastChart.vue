<template>
  <div class="dcf-chart">
    <h3 class="chart-title">
      Price Forecast
      <span
        v-if="selectedModel"
        class="chart-subtitle"
      >
        {{ selectedModel === 'peg' ? '(PEG Model)' : '(Advanced DCF)' }}
      </span>
    </h3>
    <div class="chart-container">
      <v-chart 
        v-if="chartOptions" 
        :key="selectedModel"
        :option="chartOptions" 
        :autoresize="true"
        class="chart"
      />
      <div
        v-else
        class="chart-placeholder"
      >
        <svg
          v-if="pegError"
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <line
            x1="12"
            y1="8"
            x2="12"
            y2="12"
          />
          <line
            x1="12"
            y1="16"
            x2="12.01"
            y2="16"
          />
        </svg>
        <p
          v-if="pegError"
          class="error-message"
        >
          {{ pegError }}
        </p>
        <p v-else>
          Enter assumptions to see price forecast
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import type { EChartsOption } from 'echarts'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

type ValuationModel = 'peg' | 'advancedDcf'

interface ProjectedPrice {
  year: number
  price: number
}

interface ScenarioData {
  projectedPrices: ProjectedPrice[]
  intrinsicValue?: number | null
  upside?: number | null
}

interface Scenarios {
  best: ScenarioData
  average: ScenarioData
  worst: ScenarioData
}

interface Props {
  scenarios?: Scenarios
  currentPrice?: number | null
  intrinsicValue?: number | null
  pegError?: string | null
  selectedModel?: ValuationModel
}

const props = withDefaults(defineProps<Props>(), {
  scenarios: () => ({
    best: { projectedPrices: [] },
    average: { projectedPrices: [] },
    worst: { projectedPrices: [] }
  }),
  currentPrice: null,
  intrinsicValue: null,
  pegError: null,
  selectedModel: 'peg'
})

const chartOptions = computed((): EChartsOption | null => {
  // Check if we have data for at least one scenario
  const hasData = props.scenarios.average?.projectedPrices?.length > 0
  if (!hasData) {
    return null
  }

  // Extract years from average scenario (all scenarios have same years)
  const years = props.scenarios.average.projectedPrices.map(p => p.year)
  
  // Extract prices for each scenario
  const bestPrices = props.scenarios.best.projectedPrices.map(p => p.price)
  const averagePrices = props.scenarios.average.projectedPrices.map(p => p.price)
  const worstPrices = props.scenarios.worst.projectedPrices.map(p => p.price)
  
  // Calculate Y-axis max from all scenario prices and current price
  const allPrices = [...bestPrices, ...averagePrices, ...worstPrices]
  const hasValidPrice = props.currentPrice != null && !isNaN(props.currentPrice)
  if (hasValidPrice) {
    allPrices.push(props.currentPrice!)
  }
  const maxPrice = Math.max(...allPrices)
  
  // Add 5% padding on top for better visualization
  const yAxisMax = Math.ceil(maxPrice + maxPrice * 0.05)

  // Create current price line data (horizontal line across all years)
  const currentPriceLine = hasValidPrice 
    ? years.map(() => props.currentPrice)
    : []

  return {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 400,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 400,  // Smooth transition for data updates
    animationEasingUpdate: 'cubicInOut',
    grid: {
      top: 40,
      right: 20,
      bottom: 60,
      left: 70,
      containLabel: false
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: 'rgba(0, 89, 76, 0.5)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 13
      },
      formatter: (params: any) => {
        let tooltip = `<strong>${params[0].axisValue}</strong><br/>`
        params.forEach((param: any) => {
          const color = param.color
          const value = param.value !== null 
            ? `$${param.value.toFixed(2)}`
            : 'N/A'
          tooltip += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${color};"></span>${param.seriesName}: ${value}<br/>`
        })
        return tooltip
      }
    },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yAxisMax,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        formatter: (value: number) => `$${value.toFixed(0)}`
      }
    },
    series: [
      // Best case scenario - Green
      {
        name: 'Best Case',
        type: 'line',
        data: bestPrices,
        lineStyle: {
          color: '#00b894',
          width: 2.5
        },
        itemStyle: {
          color: '#00b894'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 184, 148, 0.2)' },
              { offset: 1, color: 'rgba(0, 184, 148, 0.02)' }
            ]
          }
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderColor: '#00b894',
            borderWidth: 2
          }
        },
        z: 3
      },
      // Average case scenario - Yellow
      {
        name: 'Average Case',
        type: 'line',
        data: averagePrices,
        lineStyle: {
          color: '#fdcb6e',
          width: 3
        },
        itemStyle: {
          color: '#fdcb6e'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(253, 203, 110, 0.25)' },
              { offset: 1, color: 'rgba(253, 203, 110, 0.03)' }
            ]
          }
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderColor: '#fdcb6e',
            borderWidth: 2
          }
        },
        z: 4
      },
      // Worst case scenario - Red
      {
        name: 'Worst Case',
        type: 'line',
        data: worstPrices,
        lineStyle: {
          color: '#ff7675',
          width: 2.5
        },
        itemStyle: {
          color: '#ff7675'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 118, 117, 0.2)' },
              { offset: 1, color: 'rgba(255, 118, 117, 0.02)' }
            ]
          }
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderColor: '#ff7675',
            borderWidth: 2
          }
        },
        z: 2
      },
      // Current price reference line
      ...(hasValidPrice ? [{
        name: 'Current Price',
        type: 'line',
        data: currentPriceLine,
        lineStyle: {
          color: '#74b9ff',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#74b9ff'
        },
        symbol: 'none',
        z: 4,
        tooltip: {
          formatter: `Current Price: $${props.currentPrice!.toFixed(2)}`
        }
      }] : [])
    ],
    legend: {
      show: true,
      bottom: 10,
      textStyle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11
      },
      itemWidth: 20,
      itemHeight: 10
    }
  } as EChartsOption
})
</script>

<style scoped>
.dcf-chart {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(56, 189, 248, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chart-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.chart-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 350px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.4);
  font-size: 15px;
  gap: 12px;
  padding: 20px;
  text-align: center;
}

.chart-placeholder svg {
  color: #f39c12;
  stroke: #f39c12;
}

.chart-placeholder .error-message {
  color: rgba(255, 255, 255, 0.7);
  max-width: 400px;
  line-height: 1.6;
  margin: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .chart-container {
    height: 300px;
  }

  .dcf-chart {
    padding: 20px 16px;
  }
}

/* iPhone 12-16 Portrait (390px-430px) */
@media (max-width: 430px) {
  .dcf-chart {
    padding: 12px;
  }

  .section-title {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .chart-container {
    height: 280px;
  }

  .scenario-legend {
    gap: 8px;
    flex-wrap: wrap;
  }

  .legend-item {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* iPhone 12-16 Landscape */
@media (max-height: 430px) and (orientation: landscape) {
  .dcf-chart {
    padding: 8px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 10px;
  }

  .chart-container {
    height: 200px;
  }

  .scenario-legend {
    gap: 6px;
  }

  .legend-item {
    font-size: 10px;
    padding: 3px 6px;
  }
}
</style>
