<template>
  <div class="heatmap-wrapper">
    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>Loading market data...</p>
    </div>

    <div
      v-else-if="!data || data.length === 0"
      class="empty-state"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
        />
      </svg>
      <p>No market data available</p>
    </div>

    <v-chart
      v-else
      class="heatmap-chart"
      :option="chartOption"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { TreemapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { HeatmapNode } from '../../composables/useMarketPerformance'
import type { SP500Performance } from '../../services/market/marketPerformanceService'

// Register ECharts components
use([
  CanvasRenderer,
  TreemapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent
])

interface Props {
  data: HeatmapNode[]
  sp500?: SP500Performance | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  sp500: null
})

// ECharts treemap configuration
const chartOption = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {}
  }

  // Use sector data as-is (now showing S&P 500 sectors)
  const chartData = [...props.data]

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const { name, value, data } = params
        const performance = data.performance || 0
        const perfStr = performance >= 0 ? `+${performance.toFixed(2)}%` : `${performance.toFixed(2)}%`
        const perfColor = performance >= 0 ? '#00C087' : '#ef4444'
        
        // Format market cap
        const marketCap = value / 1e12 // Trillions
        const marketCapStr = marketCap >= 1 
          ? `$${marketCap.toFixed(2)}T` 
          : `$${(value / 1e9).toFixed(1)}B`
        
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #E5E5E5;">${name}</div>
            <div style="font-size: 12px; color: rgba(229, 229, 229, 0.6); margin-bottom: 4px;">Market Cap: ${marketCapStr}</div>
            <div style="font-size: 14px; font-weight: 600; color: ${perfColor};">
              Performance: ${perfStr}
            </div>
          </div>
        `
      },
      backgroundColor: 'rgba(21, 21, 24, 0.95)',
      borderColor: '#2A2A2E',
      borderWidth: 1,
      textStyle: {
        color: '#E5E5E5',
        fontSize: 13
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);'
    },
    series: [
      {
        type: 'treemap',
        data: chartData,
        width: '100%',
        height: '100%',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: {
          show: false
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            const { name, data } = params
            const performance = data.performance || 0
            const perfStr = performance >= 0 ? `+${performance.toFixed(1)}%` : `${performance.toFixed(1)}%`
            // Show both name and performance
            return `{name|${name}}\n{perf|${perfStr}}`
          },
          rich: {
            name: {
              fontSize: 15,
              fontWeight: 'bold',
              color: '#fff',
              textShadowColor: 'rgba(0, 0, 0, 0.9)',
              textShadowBlur: 3,
              textShadowOffsetX: 1,
              textShadowOffsetY: 1,
              lineHeight: 20
            },
            perf: {
              fontSize: 14,
              fontWeight: '600',
              color: '#fff',
              textShadowColor: 'rgba(0, 0, 0, 0.9)',
              textShadowBlur: 3,
              textShadowOffsetX: 1,
              textShadowOffsetY: 1,
              lineHeight: 18
            }
          }
        },
        itemStyle: {
          borderColor: '#2A2A2E',
          borderWidth: 2,
          gapWidth: 2
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16
          },
          itemStyle: {
            borderColor: '#00A88E',
            borderWidth: 3,
            shadowBlur: 15,
            shadowColor: 'rgba(0, 168, 142, 0.4)'
          }
        }
      }
    ]
  }
})
</script>

<style scoped>
.heatmap-wrapper {
  width: 100%;
  height: 400px;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  padding: 16px;
}

.heatmap-chart {
  width: 100%;
  height: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: rgba(229, 229, 229, 0.6);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2A2A2E;
  border-top-color: #00A88E;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: rgba(229, 229, 229, 0.5);
}

.empty-state svg {
  opacity: 0.3;
}

.empty-state p {
  font-size: 15px;
  margin: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .heatmap-wrapper {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .heatmap-wrapper {
    height: 300px;
  }
}
</style>
