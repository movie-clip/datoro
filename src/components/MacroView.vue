<template>
  <div class="macro-dashboard">
    <!-- Fixed Header -->
    <div class="macro-header-wrapper">
      <MacroHeader :index-data="indexData" />
    </div>

    <!-- Scrollable Body -->
    <div class="macro-body">
      <!-- Error State -->
      <div v-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>

      <!-- Charts Grid -->
      <div class="macro-grid">
        <!-- Dynamic Charts (with sync) -->
        <MacroChart
          v-for="(config, index) in chartConfigs"
          :key="config.id"
          :title="config.title"
          :chart="charts[index]!"
          :chart-option="getChartOption(config).value"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  BrushComponent,
  ToolboxComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { fetchAllMacroData, type MacroData, type EconomicIndicator } from '../services/macro/macroDataService'
import { useMacroChart } from '../composables/useMacroChart'
import { useChartSync } from '../composables/useChartSync'
import { createChartOptions, DEFAULT_SLIDER_CONFIG } from '../utils/chartConfigFactory'
import { MACRO_CHART_CONFIGS } from '../config/macroChartConfigs'
import { CACHE_TTL } from '../config/constants'
import type { ChartConfig } from '../types/macro.types'
import MacroChart from './macro/MacroChart.vue'
import MacroHeader from './macro/MacroHeader.vue'
import SkeletonLoader from './common/SkeletonLoader.vue'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  BrushComponent,
  ToolboxComponent
])

// Chart configurations
const chartConfigs = MACRO_CHART_CONFIGS

// Frontend cache for macro data
interface CachedMacroData {
  data: MacroData
  timestamp: number
}

let macroDataCache: CachedMacroData | null = null

/**
 * Check if cache is valid (not expired)
 */
function isCacheValid(): boolean {
  if (!macroDataCache) return false
  const now = Date.now()
  const age = now - macroDataCache.timestamp
  return age < CACHE_TTL.MACRO_DATA
}

/**
 * Get cached data if valid
 */
function getCachedData(): MacroData | null {
  if (isCacheValid()) {
    console.log('[Macro] Using cached data (age:', Math.floor((Date.now() - macroDataCache!.timestamp) / 1000), 's)')
    return macroDataCache!.data
  }
  return null
}

/**
 * Store data in cache
 */
function setCachedData(data: MacroData): void {
  macroDataCache = {
    data,
    timestamp: Date.now()
  }
  console.log('[Macro] Data cached for', CACHE_TTL.MACRO_DATA / 1000, 'seconds')
}

// Data state
const loading = ref(true)
const error = ref<string | null>(null)
const macroData = ref<MacroData | null>(null)

// Initialize charts using composable
const charts = chartConfigs.map(config => 
  useMacroChart({ id: config.id, syncedByDefault: true })
)

// Chart synchronization
const { setupChartSync } = useChartSync()

/**
 * Convert economic indicator data to chart format
 */
function convertToChartData(data: EconomicIndicator[] | undefined): [number, number][] {
  if (!data || data.length === 0) return []
  return data.map(item => [
    new Date(item.date).getTime(),
    item.value
  ])
}

/**
 * Get chart option for a specific configuration
 */
function getChartOption(config: ChartConfig) {
  return computed(() => {
    const dataKey = config.dataKey as keyof MacroData
    const rawData = macroData.value?.[dataKey] as EconomicIndicator[] | undefined
    const chartData = convertToChartData(rawData)

    return createChartOptions({
      data: chartData.length > 0 ? chartData : null,
      title: config.title,
      color: config.color,
      yAxisLabel: config.yAxisLabel,
      sliderConfig: DEFAULT_SLIDER_CONFIG,
      valueFormatter: config.valueFormatter,
      tooltipFormatter: config.tooltipFormatter
    })
  })
}

/**
 * Index Cards Data (S&P 500, Dow Jones, Russell 2000, Hang Seng, DAX)
 */
const indexData = computed(() => {
  if (!macroData.value?.indexStats || macroData.value.indexStats.length === 0) {
    return []
  }
  
  const indexNames: Record<string, string> = {
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow Jones',
    '^RUT': 'Russell 2000',
    '^HSI': 'Hang Seng',
    '^GDAXI': 'DAX'
  }
  
  return macroData.value.indexStats
    .filter(stat => stat && stat.symbol && typeof stat['1D'] === 'number')
    .map(stat => ({
      name: indexNames[stat.symbol] || stat.symbol,
      change: stat['1D'] || 0
    }))
})

/**
 * Load macro economic data with caching
 */
const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    
    // Check cache first
    const cached = getCachedData()
    if (cached) {
      macroData.value = cached
      loading.value = false
      return
    }
    
    // Fetch fresh data
    const freshData = await fetchAllMacroData()
    macroData.value = freshData
    
    // Store in cache
    setCachedData(freshData)
  } catch (err: any) {
    console.error('[Macro] Failed to load data:', err)
    error.value = err.message || 'Failed to load macro data'
  } finally {
    loading.value = false
  }
}

/**
 * Retry loading data
 */
const retry = () => {
  loadData()
}

/**
 * Setup chart synchronization on mount
 */
onMounted(async () => {
  await loadData()
  
  // Setup sync for all charts
  charts.forEach((chart, index) => {
    setupChartSync(charts, index)
  })
})
</script>

<style scoped>
/* ============================================
   MAIN CONTAINER (fills modal-container)
   ============================================ */
.macro-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ============================================
   FIXED HEADER
   ============================================ */
.macro-header-wrapper {
  flex-shrink: 0;
  border-bottom: 1px solid #2A2A2E;
  background: #1a1a1a;
}

/* ============================================
   SCROLLABLE BODY
   ============================================ */
.macro-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  scroll-snap-type: y proximity;
  scroll-padding-top: 20px;
}

.macro-body::-webkit-scrollbar {
  width: 8px;
}

.macro-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.macro-body::-webkit-scrollbar-thumb {
  background: rgba(0, 89, 76, 0.3);
  border-radius: 4px;
}

.macro-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 89, 76, 0.5);
}

/* ============================================
   ERROR STATE
   ============================================ */
.error-state {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
  scroll-snap-align: start;
}

.error-state p {
  color: #EF4444;
  margin: 0 0 15px 0;
}

.retry-btn {
  background: #EF4444;
  color: #FFF;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #DC2626;
  transform: translateY(-1px);
}

/* ============================================
   CHARTS GRID LAYOUT
   ============================================ */
.macro-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 100%;
}

/* Each row of charts will snap into view */
.macro-grid > * {
  scroll-snap-align: start;
}

/* First two charts (first row) */
.macro-grid > *:nth-child(1),
.macro-grid > *:nth-child(2) {
  scroll-snap-align: start;
}

/* ============================================
   RESPONSIVE LAYOUT
   ============================================ */
@media (max-width: 1024px) {
  .macro-grid {
    grid-template-columns: 1fr;
  }
  
  .macro-header-wrapper {
    padding: 15px 15px 0 15px;
  }
  
  .macro-body {
    padding: 15px;
  }
}
</style>
