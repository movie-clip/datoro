<template>
  <div class="macro-dashboard">
    <div class="macro-header">
      <div class="header-content">
        <h2>Macro Economic Dashboard</h2>
        
        <div class="index-cards">
          <div v-if="indexData.length === 0" class="index-card">
            <div class="index-name">Loading...</div>
            <div class="index-change">--</div>
          </div>
          <div v-for="(index, i) in indexData" :key="i" class="index-card">
            <div class="index-name">{{ index.name }}</div>
            <div class="index-change" :class="{ positive: index.change >= 0, negative: index.change < 0 }">
              {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
            </div>
          </div>
        </div>
      </div>
      
      <button 
        class="sync-toggle-btn"
        :class="{ active: syncCharts }"
        @click="syncCharts = !syncCharts"
        :title="syncCharts ? 'Click to unsync chart time windows' : 'Click to sync chart time windows'"
      >
        {{ syncCharts ? 'Synced' : 'Sync' }}
      </button>
    </div>

    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <div class="macro-grid">
      <!-- Unemployment Rate -->
      <div class="macro-card">
        <h2>Unemployment Rate</h2>
        <button
          v-if="unemploymentZoomed"
          class="reset-zoom-btn"
          @click="resetUnemploymentZoom"
          title="Reset zoom"
        >
          ↺
        </button>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart 
            v-else
            ref="unemploymentChartRef"
            :option="unemploymentChartOption" 
            autoresize
          />
        </div>
      </div>

      <!-- Federal Funds Rate -->
      <div class="macro-card">
        <h2>Federal Funds Rate</h2>
        <button
          v-if="fedFundsZoomed"
          class="reset-zoom-btn"
          @click="resetFedFundsZoom"
          title="Reset zoom"
        >
          ↺
        </button>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart 
            v-else
            ref="fedFundsChartRef"
            :option="fedFundsChartOption" 
            autoresize
          />
        </div>
      </div>

      <!-- Consumer Sentiment -->
      <div class="macro-card">
        <h2>Consumer Sentiment</h2>
        <button
          v-if="consumerSentimentZoomed"
          class="reset-zoom-btn"
          @click="resetConsumerSentimentZoom"
          title="Reset zoom"
        >
          ↺
        </button>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart 
            v-else
            ref="consumerSentimentChartRef"
            :option="consumerSentimentChartOption" 
            autoresize
          />
        </div>
      </div>

      <!-- Inflation -->
      <div class="macro-card">
        <h2>Inflation</h2>
        <button
          v-if="inflationZoomed"
          class="reset-zoom-btn"
          @click="resetInflationZoom"
          title="Reset zoom"
        >
          ↺
        </button>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart 
            v-else
            ref="inflationChartRef"
            :option="inflationChartOption" 
            autoresize
          />
        </div>
      </div>

      <!-- Retail Sales -->
      <div class="macro-card">
        <h2>Retail Sales</h2>
        <button
          v-if="retailSalesZoomed"
          class="reset-zoom-btn"
          @click="resetRetailSalesZoom"
          title="Reset zoom"
        >
          ↺
        </button>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart 
            v-else
            ref="retailSalesChartRef"
            :option="retailSalesChartOption" 
            autoresize
          />
        </div>
      </div>

      <!-- Market Risk Premium (Global) -->
      <div class="macro-card">
        <h2>Market Risk Premium (Global)</h2>
        <div class="chart-container">
          <SkeletonLoader v-if="loading" variant="chart" height="250px" />
          <v-chart v-else :option="riskPremiumChartOption" autoresize />
        </div>
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
import VChart from 'vue-echarts'
import { fetchAllMacroData, type MacroData } from '../services/macro/macroDataService'
import { COLORS } from '../config/colors'
import SkeletonLoader from './common/SkeletonLoader.vue'

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

// Slider styling constants
const SLIDER_STYLES = {
  height: 30,
  bottom: 10,
  borderColor: 'rgba(255, 255, 255, 0.03)',
  fillerColor: 'rgba(255, 255, 255, 0.03)',
  handleColor: 'rgba(255, 255, 255, 0.1)',
  textColor: '#999',
  dataBackgroundLine: '#444',
  dataBackgroundArea: 'rgba(0, 181, 154, 0.1)',
  moveHandleSize: 5  // Hides the move icon on the draggable area
}

const loading = ref(true)
const error = ref<string | null>(null)
const macroData = ref<MacroData | null>(null)

// Sync state
const syncCharts = ref(false)
const syncedTimeRange = ref({ start: 0, end: 100 })
const isSyncing = ref(false) // Flag to prevent infinite sync loops

// Zoom state tracking for each chart
const unemploymentZoomed = ref(false)
const retailSalesZoomed = ref(false)
const consumerSentimentZoomed = ref(false)
const inflationZoomed = ref(false)
const fedFundsZoomed = ref(false)

// Chart instances refs for programmatic reset
const unemploymentChartRef = ref<InstanceType<typeof VChart> | null>(null)
const retailSalesChartRef = ref<InstanceType<typeof VChart> | null>(null)
const consumerSentimentChartRef = ref<InstanceType<typeof VChart> | null>(null)
const inflationChartRef = ref<InstanceType<typeof VChart> | null>(null)
const fedFundsChartRef = ref<InstanceType<typeof VChart> | null>(null)

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

const retry = () => {
  loadData()
}

// Reset zoom functions
const resetUnemploymentZoom = () => {
  if (unemploymentChartRef.value) {
    const chart = unemploymentChartRef.value
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    unemploymentZoomed.value = false
  }
}

const resetRetailSalesZoom = () => {
  if (retailSalesChartRef.value) {
    const chart = retailSalesChartRef.value
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    retailSalesZoomed.value = false
  }
}

const resetConsumerSentimentZoom = () => {
  if (consumerSentimentChartRef.value) {
    const chart = consumerSentimentChartRef.value
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    consumerSentimentZoomed.value = false
  }
}

const resetInflationZoom = () => {
  if (inflationChartRef.value) {
    const chart = inflationChartRef.value
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    inflationZoomed.value = false
  }
}

const resetFedFundsZoom = () => {
  if (fedFundsChartRef.value) {
    const chart = fedFundsChartRef.value
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    fedFundsZoomed.value = false
  }
}

onMounted(async () => {
  await loadData()
  
  // Wait for next tick to ensure charts are rendered
  await nextTick()
  
  // Set up dataZoom event listeners for all charts
  const chartRefs = [
    { ref: unemploymentChartRef, zoomRef: unemploymentZoomed },
    { ref: retailSalesChartRef, zoomRef: retailSalesZoomed },
    { ref: consumerSentimentChartRef, zoomRef: consumerSentimentZoomed },
    { ref: inflationChartRef, zoomRef: inflationZoomed },
    { ref: fedFundsChartRef, zoomRef: fedFundsZoomed }
  ]
  
  chartRefs.forEach(({ ref: chartRef, zoomRef }, idx) => {
    if (chartRef.value) {
      const chartInstance = (chartRef.value as any).chart
      if (chartInstance) {
        chartInstance.on('dataZoom', (params: any) => {
          // Skip if we're currently syncing (prevent infinite loop)
          if (isSyncing.value) return
          
          // Update zoom state
          const option = chartInstance.getOption()
          if (option.dataZoom && option.dataZoom[0]) {
            const { start, end } = option.dataZoom[0]
            zoomRef.value = start !== 0 || end !== 100
            
            // If sync is enabled, update all other charts
            if (syncCharts.value) {
              isSyncing.value = true
              syncedTimeRange.value = { start, end }
              
              chartRefs.forEach(({ ref: otherRef, zoomRef: otherZoomRef }, otherIdx) => {
                if (otherIdx !== idx && otherRef.value) {
                  const otherInstance = (otherRef.value as any).chart
                  if (otherInstance) {
                    otherInstance.dispatchAction({
                      type: 'dataZoom',
                      dataZoomIndex: 0,
                      start,
                      end
                    })
                    // Update other chart's zoom state too
                    otherZoomRef.value = start !== 0 || end !== 100
                  }
                }
              })
              
              // Reset sync flag after a short delay
              setTimeout(() => {
                isSyncing.value = false
              }, 50)
            }
          }
        })
      }
    }
  })
})

// Index Cards Data (S&P 500, Dow Jones, Russell 2000)
const indexData = computed(() => {
  if (!macroData.value?.indexStats || macroData.value.indexStats.length === 0) {
    return []
  }
  
  const indexNames: Record<string, string> = {
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow Jones',
    '^RUT': 'Russell 2000'
  }
  
  // Filter out invalid data and map to display format
  return macroData.value.indexStats
    .filter(stat => stat && stat.symbol && typeof stat['1D'] === 'number')
    .map(stat => ({
      name: indexNames[stat.symbol] || stat.symbol,
      change: stat['1D'] || 0
    }))
})

// Unemployment Rate Chart
const unemploymentChartOption = computed(() => {
  if (!macroData.value?.unemploymentRate) return {}
  
  const data = macroData.value.unemploymentRate
    .slice().reverse() // Oldest to newest
    .map(item => [item.date, item.value])
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      formatter: (params: any) => {
        const point = params[0]
        return `Unemployment: <b>${point.value[1].toFixed(1)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '60px'
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: SLIDER_STYLES.height,
        bottom: SLIDER_STYLES.bottom,
        borderColor: SLIDER_STYLES.borderColor,
        fillerColor: SLIDER_STYLES.fillerColor,
        moveHandleSize: SLIDER_STYLES.moveHandleSize,
        handleStyle: {
          color: SLIDER_STYLES.handleColor,
          borderColor: SLIDER_STYLES.handleColor
        },
        textStyle: {
          color: SLIDER_STYLES.textColor
        },
        dataBackground: {
          lineStyle: { color: SLIDER_STYLES.dataBackgroundLine },
          areaStyle: { color: SLIDER_STYLES.dataBackgroundArea }
        }
      }
    ],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      name: 'Unemployment Rate',
      type: 'line',
      data: data,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: '#FF6B6B' },
      itemStyle: { color: '#FF6B6B' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0.05)' }
          ]
        }
      }
    }]
  }
})

// Consumer Sentiment Chart
const consumerSentimentChartOption = computed(() => {
  if (!macroData.value?.consumerSentiment) return {}
  
  const data = macroData.value.consumerSentiment
    .slice().reverse()
    .map(item => [item.date, item.value])
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      formatter: (params: any) => {
        const point = params[0]
        return `Consumer Sentiment: <b>${point.value[1].toFixed(1)}</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '60px'
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: SLIDER_STYLES.height,
        bottom: SLIDER_STYLES.bottom,
        borderColor: SLIDER_STYLES.borderColor,
        fillerColor: SLIDER_STYLES.fillerColor,
        moveHandleSize: SLIDER_STYLES.moveHandleSize,
        handleStyle: {
          color: SLIDER_STYLES.handleColor,
          borderColor: SLIDER_STYLES.handleColor
        },
        textStyle: {
          color: SLIDER_STYLES.textColor
        },
        dataBackground: {
          lineStyle: { color: SLIDER_STYLES.dataBackgroundLine },
          areaStyle: { color: SLIDER_STYLES.dataBackgroundArea }
        }
      }
    ],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      name: 'Consumer Sentiment',
      type: 'line',
      data: data,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: '#00A88E' },
      itemStyle: { color: '#00A88E' }
    }]
  }
})

// Retail Sales Chart
const retailSalesChartOption = computed(() => {
  if (!macroData.value?.retailSales) return {}
  
  const data = macroData.value.retailSales
    .slice().reverse()
    .map(item => [item.date, item.value])
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      formatter: (params: any) => {
        const point = params[0]
        return `Retail Sales: <b>${point.value[1].toFixed(2)}</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '60px'
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: SLIDER_STYLES.height,
        bottom: SLIDER_STYLES.bottom,
        borderColor: SLIDER_STYLES.borderColor,
        fillerColor: SLIDER_STYLES.fillerColor,
        moveHandleSize: SLIDER_STYLES.moveHandleSize,
        handleStyle: {
          color: SLIDER_STYLES.handleColor,
          borderColor: SLIDER_STYLES.handleColor
        },
        textStyle: {
          color: SLIDER_STYLES.textColor
        },
        dataBackground: {
          lineStyle: { color: SLIDER_STYLES.dataBackgroundLine },
          areaStyle: { color: SLIDER_STYLES.dataBackgroundArea }
        }
      }
    ],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      name: 'Retail Sales',
      type: 'line',
      data: data,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: '#4E9FDC' },
      itemStyle: { color: '#4E9FDC' }
    }]
  }
})

// Inflation Chart
const inflationChartOption = computed(() => {
  if (!macroData.value?.inflation) return {}
  
  const inflationData = macroData.value.inflation
    .slice().reverse()
    .map(item => [item.date, item.value])
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      formatter: (params: any) => {
        const point = params[0]
        return `Inflation: <b>${point.value[1].toFixed(2)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '60px'
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: SLIDER_STYLES.height,
        bottom: SLIDER_STYLES.bottom,
        borderColor: SLIDER_STYLES.borderColor,
        fillerColor: SLIDER_STYLES.fillerColor,
        moveHandleSize: SLIDER_STYLES.moveHandleSize,
        handleStyle: {
          color: SLIDER_STYLES.handleColor,
          borderColor: SLIDER_STYLES.handleColor
        },
        textStyle: {
          color: SLIDER_STYLES.textColor
        },
        dataBackground: {
          lineStyle: { color: SLIDER_STYLES.dataBackgroundLine },
          areaStyle: { color: SLIDER_STYLES.dataBackgroundArea }
        }
      }
    ],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      name: 'Inflation',
      type: 'bar',
      data: inflationData,
      itemStyle: { 
        color: '#FFD93D',
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '60%'
    }]
  }
})

// Federal Funds Rate Chart
const fedFundsChartOption = computed(() => {
  if (!macroData.value?.federalFunds) return {}
  
  const data = macroData.value.federalFunds
    .slice().reverse()
    .map(item => [item.date, item.value])
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      formatter: (params: any) => {
        const point = params[0]
        return `Fed Funds Rate: <b>${point.value[1].toFixed(2)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '60px'
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: SLIDER_STYLES.height,
        bottom: SLIDER_STYLES.bottom,
        borderColor: SLIDER_STYLES.borderColor,
        fillerColor: SLIDER_STYLES.fillerColor,
        moveHandleSize: SLIDER_STYLES.moveHandleSize,
        handleStyle: {
          color: SLIDER_STYLES.handleColor,
          borderColor: SLIDER_STYLES.handleColor
        },
        textStyle: {
          color: SLIDER_STYLES.textColor
        },
        dataBackground: {
          lineStyle: { color: SLIDER_STYLES.dataBackgroundLine },
          areaStyle: { color: SLIDER_STYLES.dataBackgroundArea }
        }
      }
    ],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      name: 'Federal Funds Rate',
      type: 'bar',
      data: data,
      itemStyle: { 
        color: '#00B59A',
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '60%'
    }]
  }
})

// Market Risk Premium Chart (Global comparison)
const riskPremiumChartOption = computed(() => {
  if (!macroData.value?.riskPremium || macroData.value.riskPremium.length === 0) return {}
  
  // Select only USA, Germany, and China
  const usa = macroData.value.riskPremium.find(c => c.country === 'United States')
  const germany = macroData.value.riskPremium.find(c => c.country === 'Germany')
  const china = macroData.value.riskPremium.find(c => c.country === 'China')
  
  // Combine and filter out null/undefined values
  const countries = [usa, germany, china].filter((c): c is NonNullable<typeof usa> => c != null)
  
  // Early return if no valid data
  if (countries.length === 0) return {}
  
  // Extract data arrays in single pass
  const countryNames = countries.map(c => c.country)
  const countryRisks = countries.map(c => c.countryRiskPremium)
  const totalRisks = countries.map(c => c.totalEquityRiskPremium)
  
  // Helper function to get color based on risk value
  const getRiskColor = (riskValue: number): string => {
    if (riskValue >= 20) return COLORS.chart.red // Crisis (20%+)
    if (riskValue >= 12) return COLORS.chart.orange // Poor (12-20%)
    if (riskValue >= 8) return '#F59E0B' // Moderate (8-12%)
    if (riskValue >= 6) return '#FBBF24' // Good (6-8%)
    return COLORS.chart.green // Excellent (4-6%)
  }
  
  // Calculate average total risk to determine legend color
  const avgTotalRisk = totalRisks.reduce((sum, val) => sum + val, 0) / totalRisks.length
  const legendColor = getRiskColor(avgTotalRisk)
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const country = params[0].name
        const countryRisk = params[0].value
        const totalRisk = params[1]?.value || 0
        return `<b>${country}</b><br/>Country Risk: <b>${countryRisk.toFixed(2)}%</b><br/>Total Equity Risk: <b>${totalRisk.toFixed(2)}%</b>`
      }
    },
    legend: {
      data: [
        {
          name: 'Country Risk Premium',
          itemStyle: { color: legendColor }
        },
        {
          name: 'Total Equity Risk Premium',
          itemStyle: { color: COLORS.chart.blue }
        }
      ],
      textStyle: { color: '#999' },
      top: 0
    },
    grid: {
      left: '20px',
      right: '40px',
      top: '40px',
      bottom: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { 
        color: '#999',
        formatter: (value: number) => `${value.toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: countryNames,
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { 
        color: '#999',
        fontSize: 11
      },
      splitLine: { show: false }
    },
    series: [
      {
        name: 'Country Risk Premium',
        type: 'bar',
        stack: 'total',
        data: countryRisks.map((value, index) => {
          const totalRisk = totalRisks[index] || 0
          return {
            value,
            itemStyle: {
              color: getRiskColor(totalRisk),
              borderRadius: [4, 0, 0, 4]
            }
          }
        }),
        barWidth: '60%',
        label: {
          show: false
        }
      },
      {
        name: 'Total Equity Risk Premium',
        type: 'bar',
        data: totalRisks.map(value => {
          return {
            value,
            itemStyle: {
              color: COLORS.chart.blue,
              borderRadius: [0, 4, 4, 0]
            }
          }
        }),
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => `${params.value.toFixed(1)}%`,
          color: '#999',
          fontSize: 10
        }
      }
    ]
  }
})
</script>

<style scoped>
.macro-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: #0F0F10;
  min-height: 900px;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

.macro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
  gap: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.header-content h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.sync-toggle-btn {
  background: rgba(0, 181, 154, 0.15);
  border: 1px solid rgba(0, 181, 154, 0.4);
  border-radius: 6px;
  padding: 8px 16px;
  color: #00B59A;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-right: 60px;
}

.sync-toggle-btn:hover {
  background: rgba(0, 181, 154, 0.25);
  border-color: rgba(0, 181, 154, 0.6);
  transform: translateY(-1px);
}

.sync-toggle-btn.active {
  background: rgba(0, 181, 154, 0.3);
  border-color: #00B59A;
  color: #00E0B8;
  box-shadow: 0 0 12px rgba(0, 181, 154, 0.4);
}

.sync-toggle-btn:active {
  transform: scale(0.98);
}

.index-cards {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: nowrap;
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

.index-period {
  font-size: 9px;
  color: #666;
  text-transform: uppercase;
}

@media (max-width: 1200px) {
  .macro-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .index-cards {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .index-cards {
    flex-direction: column;
  }
  
  .index-card {
    width: 100%;
  }
}

.subtitle {
  font-size: 16px;
  color: #B0B0B0;
  margin: 0;
}

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

.macro-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  min-height: 500px;
  width: 100%;
  max-width: 100%;
}

@media (max-width: 1024px) {
  .macro-grid {
    grid-template-columns: 1fr;
  }
}

.macro-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 24px;
  min-height: 300px;
  transition: all 0.3s ease;
  position: relative;
  min-width: 0; /* Prevent grid overflow */
  overflow: hidden; /* Contain content */
}

.macro-card:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.3);
  transform: translateY(-2px);
}

.macro-card.full-width {
  grid-column: 1 / -1;
}

.macro-card h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #F9FAFB;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-container {
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Prevent charts from blocking page scroll */
.chart-container :deep(canvas) {
  pointer-events: auto;
}

.chart-container :deep(.echarts-container) {
  pointer-events: auto;
}

.reset-zoom-btn {
  position: absolute;
  top: 12px;
  right: 15px;
  width: 32px;
  height: 32px;
  background: rgba(120, 120, 120, 0.15);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 6px;
  color: #999;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  padding: 0;
  line-height: 1;
  pointer-events: auto;
}

.reset-zoom-btn:hover {
  background: rgba(120, 120, 120, 0.25);
  border-color: rgba(150, 150, 150, 0.5);
  color: #CCC;
  transform: scale(1.05);
}

.reset-zoom-btn:active {
  transform: scale(0.95);
}

.coming-soon {
  color: #757575;
  font-style: italic;
}
</style>
