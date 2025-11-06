<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @mousedown="handleOverlayMouseDown"
        @mouseup="handleOverlayMouseUp"
        @keydown.esc="handleClose"
        tabindex="0"
        ref="overlayRef"
      >
        <div class="modal-container" @mousedown.stop>
          <div class="modal-header">
            <div class="header-content">
              <h2>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                  class="header-icon"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Macro Economic Dashboard
              </h2>
              
              <div class="index-cards">
                <select v-model="selectedRegion" class="region-selector" @change="handleRegionChange">
                  <option value="US">US</option>
                  <option value="EU">EU</option>
                </select>
                
                <div v-if="indexData.length === 0" class="index-card">
                  <div class="index-name">Loading...</div>
                  <div class="index-change">--</div>
                </div>
                <div v-for="(index, i) in indexData" :key="`index-${index.name}-${i}`" class="index-card">
                  <div class="index-name">{{ index.name }}</div>
                  <div class="index-change" :class="{ positive: index.change >= 0, negative: index.change < 0 }">
                    {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
                  </div>
                </div>
              </div>
            </div>
            <button class="close-button" @click="handleClose" aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div v-if="loading" class="loading-state">
              <div class="spinner"></div>
              <p>Loading macro data...</p>
            </div>

            <div v-else-if="error" class="error-state">
              <p>{{ error }}</p>
              <button @click="retry" class="retry-btn">Retry</button>
            </div>

            <div v-else class="macro-grid">
              <!-- Unemployment Rate -->
              <div class="macro-card">
                <h3>Unemployment Rate</h3>
                <div class="chart-container">
                  <v-chart :option="unemploymentChartOption" autoresize />
                </div>
              </div>

              <!-- Retail Sales -->
              <div class="macro-card">
                <h3>Retail Sales{{ selectedRegion === 'EU' ? ' (Volume Index)' : '' }}</h3>
                <div class="chart-container">
                  <v-chart :option="retailSalesChartOption" autoresize />
                </div>
              </div>

              <!-- Consumer Sentiment / Confidence -->
              <div class="macro-card">
                <h3>{{ selectedRegion === 'EU' ? 'Consumer Confidence' : 'Consumer Sentiment' }}</h3>
                <div class="chart-container">
                  <v-chart :option="consumerSentimentChartOption" autoresize />
                </div>
              </div>

              <!-- Inflation -->
              <div class="macro-card">
                <h3>{{ selectedRegion === 'EU' ? 'Inflation (HICP)' : 'Inflation' }}</h3>
                <div class="chart-container">
                  <v-chart :option="inflationChartOption" autoresize />
                </div>
              </div>

              <!-- Interest Rate (Fed Funds / ECB) -->
              <div class="macro-card">
                <h3>{{ selectedRegion === 'EU' ? 'ECB Interest Rate' : 'Federal Funds Rate' }}</h3>
                <div class="chart-container">
                  <v-chart :option="fedFundsChartOption" autoresize />
                </div>
              </div>

              <!-- Market Risk Premium (Global) - Only for US -->
              <div v-if="selectedRegion === 'US'" class="macro-card">
                <h3>Market Risk Premium (Global)</h3>
                <div class="chart-container">
                  <v-chart :option="riskPremiumChartOption" autoresize />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import { fetchAllMacroData, type MacroData, type EUMacroData, type Region } from '../../services/macro/macroDataService'
import type { EChartsOption } from 'echarts'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const emit = defineEmits<Emits>()

const overlayRef = ref<HTMLDivElement | null>(null)
const macroData = ref<MacroData | EUMacroData | null>(null)
const indexData = ref<Array<{ name: string; change: number }>>([]) // Separate state for indices
const loading = ref(true)
const error = ref<string | null>(null)
const selectedRegion = ref<Region>('US')

// Load index data once on mount - completely independent from region selection
async function loadIndexData() {
  try {
    console.log('[MacroModal] Loading index data (ONCE)...')
    const usData = await fetchAllMacroData('US') as MacroData
    if (usData && 'indexStats' in usData && usData.indexStats) {
      const indexNames: Record<string, string> = {
        '^GSPC': 'S&P 500',
        '^DJI': 'Dow Jones',
        '^RUT': 'Russell 2000'
      }
      
      indexData.value = usData.indexStats
        .filter(stat => stat.symbol && typeof stat['1D'] === 'number')
        .map(stat => ({
          name: indexNames[stat.symbol] || stat.symbol,
          change: stat['1D']
        }))
      
      console.log('[MacroModal] Index data loaded:', indexData.value)
    }
  } catch (err) {
    console.error('[Macro] Failed to load index data:', err)
    // Keep indexData as empty array on error
  }
}

// Load macro data based on selected region
async function loadMacroData() {
  try {
    console.log('[MacroModal] Loading macro data for region:', selectedRegion.value)
    loading.value = true
    error.value = null
    macroData.value = await fetchAllMacroData(selectedRegion.value)
    console.log('[MacroModal] Macro data loaded for:', selectedRegion.value)
  } catch (err: any) {
    console.error('[Macro] Failed to load macro data:', err)
    error.value = err.message || 'Failed to load macro data'
  } finally {
    loading.value = false
  }
}

// Handle region change
function handleRegionChange() {
  loadMacroData()
}

function retry() {
  loadMacroData()
}

// Modal handling
let isMouseDownOnOverlay = false

function handleOverlayMouseDown(event: MouseEvent) {
  // Only set flag if mousedown happens directly on overlay (not on children)
  isMouseDownOnOverlay = event.target === overlayRef.value
}

function handleOverlayMouseUp(event: MouseEvent) {
  // Only close if BOTH mousedown AND mouseup happened on overlay
  // This prevents closing when user drags from chart to outside
  if (event.target === overlayRef.value && isMouseDownOnOverlay) {
    handleClose()
  }
  // Always reset flag after mouseup
  isMouseDownOnOverlay = false
}

function handleOverlayClick(event: MouseEvent) {
  // Deprecated - keeping for backwards compatibility
  // The mouseup handler is now doing the work
}

function handleClose() {
  emit('update:modelValue', false)
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    handleClose()
  }
}

// Chart options (same as MacroView.vue)
const unemploymentChartOption = computed((): EChartsOption => {
  const data = getUnemploymentData()
  if (data.length === 0) return {}
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const point = params[0]
        return `${point.name}<br/>${point.seriesName}: ${point.value}%`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(0, 7)),
      axisLabel: { color: '#999', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#999', formatter: '{value}%' }
    },
    series: [{
      name: 'Unemployment Rate',
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      lineStyle: { color: '#FF6B6B', width: 2 },
      itemStyle: { color: '#FF6B6B' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0)' }
          ]
        }
      }
    }]
  }
})

const retailSalesChartOption = computed((): EChartsOption => {
  const data = getRetailSalesData()
  if (data.length === 0) return {}
  
  const isEU = selectedRegion.value === 'EU'
  const formatter = isEU ? 'Index: {value}' : '${value}B'
  const tooltipFormatter = (params: any) => {
    const point = params[0]
    return isEU 
      ? `${point.name}<br/>${point.seriesName}: ${point.value} (Index 2021=100)`
      : `${point.name}<br/>${point.seriesName}: $${point.value}B`
  }
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      formatter: tooltipFormatter
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(0, 7)),
      axisLabel: { color: '#999', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#999', formatter }
    },
    series: [{
      name: 'Retail Sales',
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#00B59A' },
            { offset: 1, color: '#00594C' }
          ]
        }
      }
    }]
  }
})

// Helper functions to get data based on region
function getConsumerSentimentData() {
  if (!macroData.value) return []
  if (selectedRegion.value === 'EU') {
    return 'consumerConfidence' in macroData.value ? macroData.value.consumerConfidence : []
  }
  return 'consumerSentiment' in macroData.value ? macroData.value.consumerSentiment : []
}

function getInterestRateData() {
  if (!macroData.value) return []
  if (selectedRegion.value === 'EU') {
    return 'interestRate' in macroData.value ? macroData.value.interestRate : []
  }
  return 'federalFunds' in macroData.value ? macroData.value.federalFunds : []
}

function getRetailSalesData() {
  if (!macroData.value) return []
  return macroData.value.retailSales || []
}

function getUnemploymentData() {
  if (!macroData.value) return []
  return macroData.value.unemploymentRate || []
}

function getInflationData() {
  if (!macroData.value) return []
  return macroData.value.inflation || []
}

const consumerSentimentChartOption = computed((): EChartsOption => {
  const data = getConsumerSentimentData()
  if (data.length === 0) return {}
  
  const title = selectedRegion.value === 'EU' ? 'Consumer Confidence' : 'Consumer Sentiment'
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(0, 7)),
      axisLabel: { color: '#999', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#999' }
    },
    series: [{
      name: title,
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      lineStyle: { color: '#4ECDC4', width: 2 },
      itemStyle: { color: '#4ECDC4' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
            { offset: 1, color: 'rgba(78, 205, 196, 0)' }
          ]
        }
      }
    }]
  }
})

const inflationChartOption = computed((): EChartsOption => {
  const data = getInflationData()
  if (data.length === 0) return {}
  
  const title = selectedRegion.value === 'EU' ? 'Inflation (HICP)' : 'Inflation'
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const point = params[0]
        return `${point.name}<br/>${point.seriesName}: ${point.value}%`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(0, 7)),
      axisLabel: { color: '#999', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#999', formatter: '{value}%' }
    },
    series: [{
      name: title,
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      lineStyle: { color: '#FFD93D', width: 2 },
      itemStyle: { color: '#FFD93D' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 217, 61, 0.3)' },
            { offset: 1, color: 'rgba(255, 217, 61, 0)' }
          ]
        }
      }
    }]
  }
})

const fedFundsChartOption = computed((): EChartsOption => {
  const data = getInterestRateData()
  if (data.length === 0) return {}
  
  const title = selectedRegion.value === 'EU' ? 'ECB Interest Rate' : 'Federal Funds Rate'
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const point = params[0]
        return `${point.name}<br/>${point.seriesName}: ${point.value}%`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(0, 7)),
      axisLabel: { color: '#999', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#999', formatter: '{value}%' }
    },
    series: [{
      name: title,
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      lineStyle: { color: '#A78BFA', width: 2 },
      itemStyle: { color: '#A78BFA' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(167, 139, 250, 0.3)' },
            { offset: 1, color: 'rgba(167, 139, 250, 0)' }
          ]
        }
      }
    }]
  }
})

const riskPremiumChartOption = computed((): EChartsOption => {
  // Risk Premium data not currently available in MacroData interface
  // TODO: Add riskPremium to MacroData interface if needed
  return {}
  
  /* Commented out until riskPremium is added to MacroData
  if (!macroData.value?.riskPremium || macroData.value.riskPremium.length === 0) return {}
  
  // Filter for USA, China, and top EU countries
  const targetCountries = ['United States', 'China']
  const euCountries = ['Germany', 'France', 'United Kingdom', 'Italy', 'Spain', 'Netherlands', 'Poland', 'Belgium', 'Sweden', 'Austria']
  
  const filteredData = macroData.value.riskPremium
    .filter(d => targetCountries.includes(d.country) || euCountries.includes(d.country))
    .sort((a, b) => b.totalEquityRiskPremium - a.totalEquityRiskPremium)
    .slice(0, 12)
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const point = params[0]
        return `${point.name}<br/>Total Risk Premium: ${point.value.toFixed(2)}%`
      }
    },
    grid: { left: '25%', right: '4%', bottom: '3%', top: '3%' },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#999', formatter: '{value}%' }
    },
    yAxis: {
      type: 'category',
      data: filteredData.map(d => d.country),
      axisLabel: { color: '#fff' }
    },
    series: [{
      name: 'Total Equity Risk Premium',
      type: 'bar',
      data: filteredData.map(d => d.totalEquityRiskPremium),
      itemStyle: {
        color: (params: any) => {
          const colors = ['#00B59A', '#4ECDC4', '#A78BFA', '#FFD93D', '#FF6B6B']
          return colors[params.dataIndex % colors.length] || '#00B59A'
        }
      }
    }]
  }
  */
})

// Load data when modal opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    // Load index data once (won't reload if already loaded)
    if (indexData.value.length === 0) {
      loadIndexData()
    }
    // Load macro data for selected region
    loadMacroData()
    overlayRef.value?.focus()
  }
})

// Debug watcher - detect if indexData changes unexpectedly
watch(indexData, (newVal) => {
  console.log('[MacroModal] ⚠️ Index data changed:', newVal)
}, { deep: true })

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  if (props.modelValue) {
    // Load index data once
    if (indexData.value.length === 0) {
      loadIndexData()
    }
    // Load macro data for selected region
    loadMacroData()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
/* ============================================ */
/* MODAL OVERLAY & CONTAINER */
/* ============================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  overflow-y: auto;
}

.modal-container {
  background: linear-gradient(135deg, #0A0A0C 0%, #151518 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 1400px;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* ============================================ */
/* MODAL HEADER */
/* ============================================ */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.region-selector {
  padding: 12px 16px;
  background: linear-gradient(135deg, #00C087 0%, #00805A 100%);
  border: 2px solid #00C087;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 110px;
  text-align: center;
  height: fit-content;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.region-selector:hover {
  background: linear-gradient(135deg, rgba(0, 192, 135, 0.25) 0%, rgba(0, 192, 135, 0.15) 100%);
  border-color: rgba(0, 192, 135, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 192, 135, 0.2);
}

.region-selector:focus {
  outline: none;
  border-color: #00C087;
  box-shadow: 0 0 0 3px rgba(0, 192, 135, 0.3);
}

.region-selector option {
  background: #1A1A1D;
  color: #fff;
}

.header-icon {
  color: #00C087;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.index-cards {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.index-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 110px;
  transition: all 0.3s ease;
}

.index-card:hover {
  border-color: #00594C;
  box-shadow: 0 4px 16px rgba(0, 89, 76, 0.25);
  transform: translateY(-1px);
}

.index-name {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  font-weight: 500;
}

.index-change {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 2px;
}

.index-change.positive {
  color: #00B59A;
}

.index-change.negative {
  color: #FF6B6B;
}

/* ============================================ */
/* CLOSE BUTTON */
/* ============================================ */
.close-button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-left: 12px;
  flex-shrink: 0;
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.close-button:active {
  transform: scale(0.95);
}

/* ============================================ */
/* MODAL BODY */
/* ============================================ */
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* ============================================ */
/* LOADING & ERROR STATES */
/* ============================================ */
.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #fff;
}

.retry-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: rgba(0, 181, 154, 0.2);
  border: 1px solid #00B59A;
  border-radius: 8px;
  color: #00B59A;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(0, 181, 154, 0.3);
  transform: translateY(-2px);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 181, 154, 0.2);
  border-top-color: #00B59A;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================ */
/* MACRO GRID */
/* ============================================ */
.macro-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.macro-card {
  background: linear-gradient(135deg, #0F0F12 0%, #1A1A1E 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.macro-card:hover {
  border-color: rgba(0, 192, 135, 0.3);
  box-shadow: 0 8px 32px rgba(0, 192, 135, 0.1);
  transform: translateY(-2px);
}

.macro-card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #F9FAFB;
}

.chart-container {
  height: 280px;
}

/* ============================================ */
/* MODAL TRANSITIONS */
/* ============================================ */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

/* ============================================ */
/* RESPONSIVE */
/* ============================================ */
@media (max-width: 1024px) {
  .macro-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .index-cards {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .modal-header {
    padding: 12px 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .index-cards {
    flex-direction: column;
  }
  
  .index-card {
    width: 100%;
  }
}
</style>
