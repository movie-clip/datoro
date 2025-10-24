<template>
  <div class="dcf-chart">
    <h3 class="chart-title">Price Forecast</h3>
    <div class="chart-container">
      <v-chart 
        v-if="chartOptions" 
        :option="chartOptions" 
        :autoresize="true"
        class="chart"
      />
      <div v-else class="chart-placeholder">
        <p>Enter assumptions to see price forecast</p>
      </div>
    </div>
  </div>
</template>

<script setup>
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

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const props = defineProps({
  scenarios: {
    type: Object,
    default: () => ({
      best: { projectedPrices: [] },
      average: { projectedPrices: [] },
      worst: { projectedPrices: [] }
    })
  },
  currentPrice: {
    type: Number,
    default: null
  },
  intrinsicValue: {
    type: Number,
    default: null
  }
})

const chartOptions = computed(() => {
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
  
  // Calculate Y-axis max from all scenario prices
  const allPrices = [...bestPrices, ...averagePrices, ...worstPrices]
  const maxPrice = Math.max(...allPrices)
  
  // Add 5% padding on top for better visualization
  const yAxisMax = Math.ceil(maxPrice + maxPrice * 0.05)

  return {
    backgroundColor: 'transparent',
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
      formatter: (params) => {
        let tooltip = `<strong>${params[0].axisValue}</strong><br/>`
        params.forEach(param => {
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
        formatter: (value) => `$${value.toFixed(0)}`
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
      }
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
  }
})
</script>

<style scoped>
.dcf-chart {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(0, 89, 76, 0.1);
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
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.4);
  font-size: 15px;
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
</style>
