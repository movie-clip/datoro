<template>
  <div class="sp500-price-chart">
    <div class="chart-header">
      <h3>S&P 500 Historical Price</h3>
      <div v-if="!loading && priceData.length > 0" class="chart-info">
        <span class="info-item">
          Range: {{ formatDate(selectedRange.start) }} - {{ formatDate(selectedRange.end) }}
        </span>
        <span class="info-item performance" :class="rangePerformance >= 0 ? 'positive' : 'negative'">
          Performance: {{ rangePerformance >= 0 ? '+' : '' }}{{ rangePerformance.toFixed(2) }}%
        </span>
      </div>
    </div>
    
    <div v-if="loading" class="chart-loading">
      <div class="spinner"></div>
      <span>Loading S&P 500 data...</span>
    </div>
    
    <div v-else-if="error" class="chart-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{{ error }}</span>
    </div>
    
    <v-chart
      v-else
      ref="chartRef"
      class="chart"
      :option="chartOption"
      autoresize
      @datazoom="handleDataZoom"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
import {
  convertToChartFormat,
  calculatePerformance,
  getDataZoomDetails,
  formatDate as formatDateUtil,
  type PriceDataPoint
} from '../../services/market/sp500CalculationService'
import { validateHistoricalData } from '../../schemas/marketPerformanceSchemas'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent
])

interface Props {
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null
})

const emit = defineEmits<{
  rangeChange: [{ start: string; end: string }]
}>()

const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const priceData = ref<PriceDataPoint[]>([])
const selectedRange = ref({ start: '', end: '' })
const rangePerformance = ref(0)
const internalLoading = ref(false)
const internalError = ref<string | null>(null)
const debounceTimer = ref<number | null>(null)

// Computed loading state (use prop or internal)
const loading = computed(() => props.loading || internalLoading.value)
const error = computed(() => props.error || internalError.value)

// Fetch S&P 500 historical data (always 20 years)
async function fetchPriceData() {
  console.log(`[SP500 Chart] Fetching 20-year historical data`)
  internalLoading.value = true
  internalError.value = null
  
  try {
    const url = `http://localhost:7071/api/market/sp500/historical`
    console.log(`[SP500 Chart] Fetching from: ${url}`)
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error'
      throw new Error(`Failed to fetch S&P 500 data: ${response.status} ${statusText}`)
    }
    
    const data = await response.json()
    
    // Validate data using Zod schema
    const validation = validateHistoricalData(data)
    if (!validation.success) {
      console.error(`[SP500 Chart] Data validation failed:`, validation.errors)
      throw new Error(`Invalid data format: ${validation.errors?.join(', ')}`)
    }
    
    // TypeScript knows validation.data exists here because success is true
    const validatedData = validation.data!
    
    // Additional runtime checks for edge cases
    if (!validatedData.historical || validatedData.historical.length === 0) {
      throw new Error('No historical data available')
    }
    
    if (validatedData.historical.length === 1) {
      console.warn(`[SP500 Chart] Only one data point available - performance calculation not possible`)
    }
    
    console.log(`[SP500 Chart] Received and validated data:`, {
      symbol: validatedData.symbol,
      dataPoints: validatedData.historical.length,
      firstDate: validatedData.historical[0]?.date,
      lastDate: validatedData.historical[validatedData.historical.length - 1]?.date
    })
    
    // Convert to ECharts format using service
    priceData.value = convertToChartFormat(validatedData.historical)
    
    console.log(`[SP500 Chart] Converted ${priceData.value.length} data points for chart`)
    
    // Initialize selected range to full period
    if (priceData.value.length > 0) {
      const result = calculatePerformance(priceData.value, 0, priceData.value.length - 1)
      if (result) {
        selectedRange.value = {
          start: result.startDate,
          end: result.endDate
        }
        rangePerformance.value = result.performance
        console.log(`[SP500 Chart] Initial range: ${result.startDate} to ${result.endDate}, Performance: ${result.performance.toFixed(2)}%`)
        
        // Emit initial range so heatmap can load sector data for the full 20-year period
        emit('rangeChange', { start: result.startDate, end: result.endDate })
      }
    }
    
    internalLoading.value = false
  } catch (err) {
    console.error(`[SP500 Chart] Error fetching data:`, err)
    
    // Handle specific error types with user-friendly messages
    if (err instanceof TypeError && err.message.includes('fetch')) {
      internalError.value = 'Network error: Unable to connect to server. Please check your internet connection.'
    } else if (err instanceof DOMException && err.name === 'TimeoutError') {
      internalError.value = 'Request timeout: Server took too long to respond. Please try again.'
    } else if (err instanceof Error && err.message.includes('Failed to fetch')) {
      internalError.value = `Unable to load S&P 500 data. Please try again later.`
    } else if (err instanceof Error && err.message.includes('Invalid data format')) {
      internalError.value = 'Data validation error: Received invalid data from server.'
    } else if (err instanceof Error && err.message.includes('No historical data')) {
      internalError.value = 'No data available for this time period.'
    } else {
      internalError.value = err instanceof Error ? err.message : `Failed to load S&P 500 data`
    }
    
    internalLoading.value = false
  }
}

// Handle dataZoom event from chart - only update when drag ends
function handleDataZoom(event: any) {
  try {
    // The event structure has start/end directly on the event object, not in a batch array
    const zoom = event.batch?.[0] || event
    
    if (typeof zoom.start !== 'number' || typeof zoom.end !== 'number') {
      console.warn('[SP500 Chart] Invalid zoom parameters:', zoom)
      return
    }
    
    if (!priceData.value || priceData.value.length === 0) {
      console.warn('[SP500 Chart] No price data available')
      return
    }
    
    // Get dataZoom details for UI update
    const details = getDataZoomDetails(priceData.value, zoom.start, zoom.end)
    
    if (!details) {
      console.error('[SP500 Chart] Failed to calculate dataZoom details')
      return
    }

    // Calculate performance for UI display
    const result = calculatePerformance(priceData.value, details.startIdx, details.endIdx)
    
    if (!result) {
      console.error('[SP500 Chart] Failed to calculate performance')
      return
    }
    
    // Always update the performance label immediately for smooth feedback
    selectedRange.value = { start: result.startDate, end: result.endDate }
    rangePerformance.value = result.performance
    
    // Clear previous debounce timer
    if (debounceTimer.value !== null) {
      window.clearTimeout(debounceTimer.value)
    }
    
    // Debounce the API call for sector data (500ms delay to wait for drag end)
    debounceTimer.value = window.setTimeout(() => {
      console.log(`[SP500 Chart] Range updated: ${result.startDate} to ${result.endDate}, Performance: ${result.performance.toFixed(2)}%`)
      emit('rangeChange', { start: result.startDate, end: result.endDate })
    }, 500) // Increased to 500ms to better capture drag end
  } catch (err) {
    console.error('[SP500 Chart] Error in handleDataZoom:', err)
  }
}

// Format date for display
function formatDate(dateStr: string): string {
  return formatDateUtil(dateStr)
}

// Chart configuration
const chartOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  grid: {
    left: '2%',
    right: '8%', // More space for Y-axis labels
    top: '8%',
    bottom: '25%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(21, 21, 24, 0.95)',
    borderColor: '#2A2A2E',
    borderWidth: 1,
    textStyle: { color: '#E5E5E5', fontSize: 12 },
    formatter: (params: any) => {
      const point = params[0]
      const date = new Date(point.value[0]).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
      const price = point.value[1].toFixed(2)
      return `
        <div style="font-weight: 600; margin-bottom: 4px;">${date}</div>
        <div style="color: #00A88E;">Price: $${price}</div>
      `
    }
  },
  xAxis: {
    type: 'time',
    boundaryGap: false as any,
    axisLine: { lineStyle: { color: '#2A2A2E' } },
    axisLabel: { 
      color: 'rgba(229, 229, 229, 0.6)',
      fontSize: 11,
      formatter: (value: number) => {
        const date = new Date(value)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
    },
    splitLine: { show: false }
  },
  yAxis: {
    type: 'value',
    position: 'right',
    scale: true, // Enable smart scaling
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { 
      color: 'rgba(229, 229, 229, 0.6)',
      fontSize: 11,
      formatter: (value: number) => {
        // Format with commas for readability
        if (value >= 1000) {
          return `$${(value / 1000).toFixed(1)}K`
        }
        return `$${value.toFixed(0)}`
      }
    },
    splitLine: {
      lineStyle: { color: 'rgba(42, 42, 46, 0.3)', type: 'dashed' }
    },
    splitNumber: 6, // Control number of grid lines
    minInterval: 100 // Minimum interval between ticks
  },
  dataZoom: [
    {
      type: 'inside',
      start: 0,
      end: 100,
      zoomOnMouseWheel: 'shift',
      throttle: 50 // Throttle drag events
    },
    {
      type: 'slider',
      start: 0,
      end: 100,
      height: 30,
      bottom: 10,
      handleSize: '80%',
      throttle: 50, // Throttle drag events during interaction
      handleStyle: {
        color: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      },
      dataBackground: {
        lineStyle: { color: '#444', width: 1 },
        areaStyle: { color: 'rgba(0, 181, 154, 0.1)' }
      },
      selectedDataBackground: {
        lineStyle: { color: '#999', width: 1.5 },
        areaStyle: { color: 'rgba(255, 255, 255, 0.15)' }
      },
      fillerColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: 'rgba(255, 255, 255, 0.03)',
      textStyle: { color: '#999', fontSize: 10 },
      brushSelect: false,
      moveHandleSize: 5
    }
  ],
  series: [
    {
      name: 'S&P 500',
      type: 'line',
      data: priceData.value.map(point => [point.timestamp, point.price]),
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: '#00A88E',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 168, 142, 0.3)' },
            { offset: 1, color: 'rgba(0, 168, 142, 0)' }
          ]
        }
      },
      emphasis: {
        disabled: true
      }
    }
  ]
}))

// Fetch data on mount
onMounted(() => {
  fetchPriceData()
})

// Clean up on unmount
onUnmounted(() => {
  // Clear any pending debounce timers
  if (debounceTimer.value !== null) {
    window.clearTimeout(debounceTimer.value)
    debounceTimer.value = null
  }
})
</script>

<style scoped>
.sp500-price-chart {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0px;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid #2A2A2E;
}

.chart-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #E5E5E5;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.info-item {
  color: rgba(229, 229, 229, 0.7);
  font-weight: 500;
}

.info-item.performance {
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(42, 42, 46, 0.4);
}

.info-item.performance.positive {
  color: #00C087;
  background: rgba(0, 192, 135, 0.1);
}

.info-item.performance.negative {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.chart {
  width: 100%;
  height: 205px;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 280px;
  color: rgba(229, 229, 229, 0.6);
  font-size: 13px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(42, 42, 46, 0.3);
  border-top-color: #00A88E;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 280px;
  color: #EF4444;
  font-size: 13px;
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .chart {
    height: 240px;
  }
  
  .sp500-price-chart {
    padding: 16px;
  }
}
</style>
