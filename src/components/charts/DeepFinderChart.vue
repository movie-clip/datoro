<template>
  <div class="deep-finder-chart">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading stock screener data...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <div v-else-if="props.tickers.length === 0" class="no-data">
      <p>Add stocks to your watchlist to analyze them here</p>
    </div>
    
    <div v-else-if="stocks.length > 0">
      <!-- Chart with scrolling -->
      <div class="chart-container">
        <v-chart 
          ref="chartRef"
          :option="chartOption" 
          :autoresize="true"
          :style="{ height: chartHeight }"
          class="chart"
        />
      </div>
      
      <!-- Summary stats - outside scrollable container -->
      <div class="summary-stats">
        <div class="stat-item oversold">
          <span class="stat-label">Most Oversold</span>
          <span class="stat-value">{{ mostOversold }}</span>
        </div>
        <div class="stat-item overbought">
          <span class="stat-label">Most Overbought</span>
          <span class="stat-value">{{ mostOverbought }}</span>
        </div>
        <div class="stat-item total">
          <span class="stat-label">Total Stocks</span>
          <span class="stat-value">{{ stocks.length }}</span>
        </div>
      </div>
    </div>
    
    <div v-else class="no-data">
      No data available
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import type { EChartsOption } from 'echarts'
import { fetchDeepFinderData, getDistanceColor, type DeepFinderStock } from '../../services/deepFinder/deepFinderService'
import { DEEP_FINDER_CONFIG } from '../../config/deepFinderStocks'
import { API_ABSOLUTE_URL } from '../../utils/apiConfig'

// Helper to get full icon URL (ECharts needs absolute URLs in production)
const getIconUrl = (ticker: string): string => {
  return `${API_ABSOLUTE_URL}/api/company-icon/${ticker}`
}

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

// Types
interface Props {
  tickers?: string[]
}

// Props
const props = withDefaults(defineProps<Props>(), {
  tickers: () => []
})

// State
const stocks = ref<DeepFinderStock[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const chartRef = ref<InstanceType<typeof VChart> | null>(null)

// Computed
const mostOversold = computed(() => {
  if (stocks.value.length === 0) return 'N/A'
  const stock = stocks.value[0] // Already sorted by distance (lowest first)
  if (!stock) return 'N/A'
  return `${stock.ticker} (${stock.distance.toFixed(1)}%)`
})

const mostOverbought = computed(() => {
  if (stocks.value.length === 0) return 'N/A'
  const stock = stocks.value[stocks.value.length - 1] // Highest distance
  if (!stock) return 'N/A'
  return `${stock.ticker} (+${stock.distance.toFixed(1)}%)`
})

// Dynamic chart height based on number of stocks
const chartHeight = computed(() => {
  const height = Math.max(450, stocks.value.length * 40)
  return `${height}px`
})

// Chart configuration
const chartOption = computed<EChartsOption>(() => {
  if (stocks.value.length === 0) return {}
  
  // Prepare data for horizontal bar chart
  const tickers = stocks.value.map(s => s.ticker)
  const distances = stocks.value.map(s => s.distance)
  const colors = stocks.value.map(s => getDistanceColor(s.distance, DEEP_FINDER_CONFIG.neutralThreshold))
  
  return {
    grid: {
      left: '12%',
      right: '10%',
      top: '3%',
      bottom: '3%',
      containLabel: false
    },
    xAxis: {
      type: 'value',
      name: '% from MA200',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: {
        fontSize: 12,
        color: 'rgba(229, 229, 229, 0.6)'
      },
      axisLabel: {
        formatter: '{value}%',
        color: 'rgba(229, 229, 229, 0.6)',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
          type: 'dashed'
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.15)'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: tickers,
      axisLabel: {
        color: '#E5E5E5',
        fontSize: 12, // Reduced from 14 to 12 for compact layout
        fontWeight: 600,
        formatter: (value: string, index: number) => {
          // Return format: {img|ticker} ticker with padding
          return `{img${index}|}  ${value}`
        },
        rich: tickers.reduce((acc, ticker, index) => {
          acc[`img${index}`] = {
            backgroundColor: {
              image: getIconUrl(ticker)
            },
            height: 16, // Reduced from 18 to 16
            width: 16 // Reduced from 18 to 16
          }
          return acc
        }, {} as Record<string, any>)
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.15)'
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: distances.map((distance, index) => ({
          value: distance,
          itemStyle: {
            color: colors[index]
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            const stock = stocks.value[params.dataIndex]
            if (!stock) return ''
            return `${stock.distance > 0 ? '+' : ''}${stock.distance.toFixed(1)}%`
          },
          color: '#E5E5E5',
          fontSize: 10
        },
        barWidth: '40%', // Reduced from 60% to 40% (33% smaller)
        barGap: '20%', // Add gap between bars
        emphasis: {
          disabled: true
        }
      }
    ]
  }
})

// Methods
async function loadData(): Promise<void> {
  // Don't fetch if no tickers
  if (!props.tickers || props.tickers.length === 0) {
    stocks.value = []
    loading.value = false
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const data = await fetchDeepFinderData(props.tickers)
    stocks.value = data.stocks || []
  } catch (err) {
    console.error('[DeepFinderChart] Error loading data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
}

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Lifecycle
onMounted(() => {
  if (props.tickers && props.tickers.length > 0) {
    loadData()
  } else {
    loading.value = false
  }
})

// Watch for ticker changes with debounce (avoid excessive API calls)
watch(() => props.tickers, (newTickers, oldTickers) => {
  // Skip if arrays are the same (avoid unnecessary reloads)
  if (JSON.stringify(newTickers) === JSON.stringify(oldTickers)) {
    return
  }
  
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  // Debounce for 500ms to avoid rapid API calls
  debounceTimer = setTimeout(() => {
    loadData()
  }, 500)
})

// Watch for chart resize
watch(() => stocks.value.length, () => {
  if (chartRef.value) {
    chartRef.value.resize()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<style scoped>
/* ============================================ */
/* MAIN CONTAINER */
/* ============================================ */
.deep-finder-chart {
  width: 100%;
  min-height: 600px;
  padding: 0;
  background: transparent;
  border-radius: 0;
}

/* ============================================ */
/* LOADING STATE */
/* ============================================ */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: rgba(255, 255, 255, 0.6);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00C087;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================ */
/* ERROR STATE */
/* ============================================ */
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #EF4444;
  padding: 20px;
  text-align: center;
}

/* ============================================ */
/* CHART CONTAINER (SCROLLABLE) */
/* ============================================ */
.chart-container {
  width: 100%;
  max-height: 530px; /* Fixed max height */
  overflow-y: auto; /* Enable vertical scrolling */
  overflow-x: hidden;
  border-radius: 8px;
  background: rgba(50, 50, 55, 0.4); /* Greyish background */
  padding: 0px;
}

/* Custom scrollbar styling */
.chart-container::-webkit-scrollbar {
  width: 8px;
}

.chart-container::-webkit-scrollbar-track {
  background: #1E1E22;
  border-radius: 4px;
}

.chart-container::-webkit-scrollbar-thumb {
  background: #3A3A3E;
  border-radius: 4px;
}

.chart-container::-webkit-scrollbar-thumb:hover {
  background: #4A4A4E;
}

/* ============================================ */
/* CHART ELEMENT */
/* ============================================ */
.chart {
  width: 100%;
  height: auto; /* Dynamic height based on stocks */
  min-height: 530px;
}

/* ============================================ */
/* SUMMARY STATS (FOOTER) */
/* ============================================ */
.summary-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
  padding: 16px 0px;
  background: rgba(0, 89, 76, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(0, 192, 135, 0.2);
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.stat-item.oversold .stat-value {
  color: #EF4444;
}

.stat-item.overbought .stat-value {
  color: #00C087;
}

/* ============================================ */
/* NO DATA STATE */
/* ============================================ */
.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: rgba(255, 255, 255, 0.5);
}

/* ============================================ */
/* RESPONSIVE - MOBILE */
/* ============================================ */
@media (max-width: 768px) {
  .deep-finder-chart {
    padding: 0;
    min-height: 500px;
  }
  
  .chart {
    height: 600px;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
  }
  
  .stat-item {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
