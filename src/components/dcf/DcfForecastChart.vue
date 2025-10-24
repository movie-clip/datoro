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
  projectedPrices: {
    type: Array,
    default: () => []
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
  if (!props.projectedPrices || props.projectedPrices.length === 0) {
    return null
  }

  const years = props.projectedPrices.map(p => p.year)
  const prices = props.projectedPrices.map(p => p.price)

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
      // Projected prices only
      {
        name: 'Projected Price',
        type: 'line',
        data: prices,
        lineStyle: {
          color: '#00594c',
          width: 3
        },
        itemStyle: {
          color: '#00594c'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 89, 76, 0.3)' },
              { offset: 1, color: 'rgba(0, 89, 76, 0.05)' }
            ]
          }
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderColor: '#00594c',
            borderWidth: 2
          }
        },
        z: 3
      }
    ],
    legend: {
      show: false
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
  min-height: 400px;
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
