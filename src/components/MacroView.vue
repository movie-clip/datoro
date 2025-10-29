<template>
  <div class="macro-dashboard">
    <!-- Header with Index Cards -->
    <MacroHeader :index-data="indexData" />

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

      <!-- Market Risk Premium (no sync) -->
      <div class="macro-card">
        <h2>{{ riskPremiumConfig.title }}</h2>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart 
            v-else
            :option="riskPremiumChartOption" 
            autoresize
          />
        </div>
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
import { MACRO_CHART_CONFIGS, RISK_PREMIUM_CONFIG } from '../config/macroChartConfigs'
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
const riskPremiumConfig = RISK_PREMIUM_CONFIG

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
 * Market Risk Premium chart option
 */
const riskPremiumChartOption = computed(() => {
  const riskData = macroData.value?.riskPremium
    ?.filter(item => item.country === 'United States')
    .map(item => ({
      date: new Date().toISOString(), // FMP doesn't provide date for risk premium
      value: item.totalEquityRiskPremium
    }))

  const chartData = convertToChartData(riskData)

  return createChartOptions({
    data: chartData.length > 0 ? chartData : null,
    title: riskPremiumConfig.title,
    color: riskPremiumConfig.color,
    yAxisLabel: riskPremiumConfig.yAxisLabel,
    sliderConfig: DEFAULT_SLIDER_CONFIG,
    valueFormatter: riskPremiumConfig.valueFormatter,
    tooltipFormatter: riskPremiumConfig.tooltipFormatter
  })
})

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
 * Load macro economic data
 */
const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    macroData.value = await fetchAllMacroData()
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
   MAIN CONTAINER
   ============================================ */
.macro-dashboard {
  padding: 0 12px;
  max-width: 100%;
  overflow-x: hidden;
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
  min-height: 900px;
  overflow: hidden;
  max-width: 100%;
}

/* ============================================
   CHART CARDS
   ============================================ */
.macro-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
  min-width: 0;
}

.macro-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.macro-card h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 15px 0;
  color: #FFF;
}

/* ============================================
   CHART CONTAINER
   ============================================ */
.chart-container {
  height: 280px;
  position: relative;
  pointer-events: none;
  overflow: hidden;
  max-width: 100%;
}

.chart-container :deep(canvas) {
  pointer-events: auto;
}

.chart-container :deep(.echarts-container) {
  pointer-events: auto;
}

/* ============================================
   RESPONSIVE LAYOUT
   ============================================ */
@media (max-width: 1024px) {
  .macro-grid {
    grid-template-columns: 1fr;
  }
}
</style>
