<template>
  <div class="macro-dashboard">
    <!-- Fixed Header -->
    <div class="macro-header-wrapper">
      <MacroHeader 
        :index-data="indexData"
        :index-loading="indexLoading"
        :index-error="indexError ?? undefined"
        :selected-region="selectedRegion"
        @region-change="handleRegionChange"
        @retry-index="loadIndexData"
      />
    </div>

    <!-- Scrollable Body -->
    <div class="macro-body">
      <!-- Error State -->
      <div
        v-if="error"
        class="error-state"
      >
        <p>{{ error }}</p>
        <button
          class="retry-btn"
          @click="retry"
        >
          Retry
        </button>
      </div>

      <!-- Charts Grid -->
      <div class="macro-grid">
        <!-- Dynamic Charts (with sync) -->
        <MacroChart
          v-for="(config, index) in chartConfigs"
          :key="config.id"
          :title="getChartTitle(config)"
          :chart="charts[index]!"
          :chart-option="getChartOption(config).value"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
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
import { fetchAllMacroData, fetchIndexStats, type MacroData, type EUMacroData, type EconomicIndicator, type Region, type IndexStats } from '../services/macro/macroDataService'
import { useMacroChart } from '../composables/useMacroChart'
import { useChartSync } from '../composables/useChartSync'
import { createChartOptions, DEFAULT_SLIDER_CONFIG } from '../utils/chartConfigFactory'
import { MACRO_CHART_CONFIGS } from '../config/macroChartConfigs'
import { CACHE_TTL } from '../config/constants'
import type { ChartConfig } from '../types/macro.types'
import MacroChart from './macro/MacroChart.vue'
import MacroHeader from './macro/MacroHeader.vue'

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
  data: MacroData | EUMacroData
  timestamp: number
  region: Region
}

let macroDataCache: CachedMacroData | null = null

/**
 * Check if cache is valid (not expired) and region matches
 */
function isCacheValid(region: Region): boolean {
  if (!macroDataCache) return false
  if (macroDataCache.region !== region) return false
  const now = Date.now()
  const age = now - macroDataCache.timestamp
  return age < CACHE_TTL.MACRO_DATA
}

/**
 * Get cached data if valid
 */
function getCachedData(region: Region): MacroData | EUMacroData | null {
  if (isCacheValid(region)) {
    return macroDataCache!.data
  }
  return null
}

/**
 * Store data in cache
 */
function setCachedData(data: MacroData | EUMacroData, region: Region): void {
  macroDataCache = {
    data,
    timestamp: Date.now(),
    region
  }
}

// Region state
const selectedRegion = ref<Region>('US')

// Data state
const indexLoading = ref(true)
const macroLoading = ref(true)
const loading = computed(() => indexLoading.value || macroLoading.value)
const error = ref<string | null>(null)
const indexError = ref<string | null>(null)
const macroData = ref<MacroData | EUMacroData | null>(null)

// Index data - separate from region-based macroData, always shows US indices
const indexData = ref<Array<{ name: string; change: number }>>([])

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
  return data.map(item => {
    // Handle both YYYY-MM-DD and YYYY-MM formats (Eurostat uses YYYY-MM)
    let dateStr = item.date
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      // If format is YYYY-MM, append -01 to make it YYYY-MM-DD
      dateStr = `${dateStr}-01`
    }
    return [
      new Date(dateStr).getTime(),
      item.value
    ]
  })
}

/**
 * Map chart data key to the correct key based on region
 */
function getDataKeyForRegion(chartDataKey: string): string {
  if (selectedRegion.value === 'EU') {
    // Map US keys to EU keys
    const keyMap: Record<string, string> = {
      'federalFunds': 'interestRate',       // Fed Funds → ECB Interest Rate
      'consumerSentiment': 'consumerConfidence',  // Consumer Sentiment → Consumer Confidence
      'housingStarts': 'buildingPermits'    // Housing Starts → Building Permits
    }
    return keyMap[chartDataKey] || chartDataKey
  }
  return chartDataKey
}

/**
 * Get chart title based on region
 */
function getChartTitle(config: ChartConfig): string {
  if (selectedRegion.value === 'EU') {
    const titleMap: Record<string, string> = {
      'Federal Funds Rate': 'ECB Interest Rate',
      'Consumer Sentiment': 'Consumer Confidence',
      'Housing Starts': 'Building Permits',
      'Retail Sales': 'Retail Sales (Volume Index)'
    }
    return titleMap[config.title] || config.title
  }
  return config.title
}

/**
 * Get chart option for a specific configuration
 */
function getChartOption(config: ChartConfig) {
  return computed(() => {
    if (!macroData.value) {
      return createChartOptions({
        data: null,
        title: getChartTitle(config),
        color: config.color,
        yAxisLabel: config.yAxisLabel,
        sliderConfig: DEFAULT_SLIDER_CONFIG,
        valueFormatter: config.valueFormatter,
        tooltipFormatter: config.tooltipFormatter,
        showAverage: false
      })
    }

    const dataKey = getDataKeyForRegion(config.dataKey)
    const rawData = (macroData.value as Record<string, EconomicIndicator[] | undefined>)[dataKey]
    const chartData = convertToChartData(rawData)

    return createChartOptions({
      data: chartData.length > 0 ? chartData : null,
      title: getChartTitle(config),
      color: config.color,
      yAxisLabel: config.yAxisLabel,
      sliderConfig: DEFAULT_SLIDER_CONFIG,
      valueFormatter: config.valueFormatter,
      tooltipFormatter: config.tooltipFormatter,
      showAverage: false // DISABLED: SMA200 feature (set to true to enable for inflation: config.id === 'inflation')
    })
  })
}

/**
 * Index Cards Data (S&P 500, Dow Jones, Russell 2000, Hang Seng, DAX)
 * Shows the same global market indices for both US and EU regions
 */
/**
 * Load US index data once (independent of region selection)
 */
async function loadIndexData() {
  try {
    indexLoading.value = true
    indexError.value = null
    const indexStats = await fetchIndexStats()
    
    if (indexStats && indexStats.length > 0) {
      const indexNames: Record<string, string> = {
        '^GSPC': 'S&P 500',
        '^DJI': 'Dow Jones',
        '^RUT': 'Russell 2000',
        '^HSI': 'Hang Seng',
        '^GDAXI': 'DAX'
      }
      
      indexData.value = indexStats
        .filter((stat: IndexStats) => stat && stat.symbol && typeof stat['1D'] === 'number')
        .map((stat: IndexStats) => ({
          name: indexNames[stat.symbol] || stat.symbol,
          change: stat['1D'] || 0
        }))
    }
  } catch (err: unknown) {
    indexError.value = err instanceof Error ? err.message : 'Failed to load market indices'
  } finally {
    indexLoading.value = false
  }
}

/**
 * Handle region change
 */
function handleRegionChange(newRegion: Region) {
  selectedRegion.value = newRegion
  loadData()
}

/**
 * Re-setup chart synchronization after data loads
 */
const setupSyncForAllCharts = async () => {
  // Wait for charts to update with new data
  await nextTick()
  
  setTimeout(() => {
    charts.forEach((chart, index) => {
      // Skip if chart ref is not available yet
      if (!chart.chartRef.value) {
        return
      }
      
      // Remove old listeners by getting fresh instance
      const instance = (chart.chartRef.value as { chart?: { off: (event: string) => void } }).chart
      if (instance) {
        // Remove all previous datazoom listeners to avoid duplicates
        instance.off('datazoom')
      }
      
      // Setup new sync
      setupChartSync(charts, index)
    })
  }, 500)
}

/**
 * Load macro economic data with caching
 */
const loadData = async () => {
  try {
    macroLoading.value = true
    error.value = null
    
    // Check cache first
    const cached = getCachedData(selectedRegion.value)
    if (cached) {
      macroData.value = cached
      macroLoading.value = false
      // Re-setup sync after loading cached data
      setupSyncForAllCharts()
      return
    }
    
    // Fetch fresh data
    const freshData = await fetchAllMacroData(selectedRegion.value)
    macroData.value = freshData
    
    // Store in cache
    setCachedData(freshData, selectedRegion.value)
    
    // Re-setup sync after loading fresh data
    setupSyncForAllCharts()
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to load macro data'
  } finally {
    macroLoading.value = false
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
  // Load US index data once (independent of region)
  loadIndexData()
  
  // Load region-specific macro data
  await loadData()
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

/* ============================================
   INFO MESSAGE
   ============================================ */
.info-message {
  background: rgba(0, 89, 76, 0.1);
  border: 1px solid rgba(0, 89, 76, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.info-message p {
  margin: 0;
  color: #00B59A;
  font-size: 14px;
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
