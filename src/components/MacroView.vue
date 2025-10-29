<template>
  <div class="macro-dashboard">
    <div class="macro-header">
      <h1>Macro Economic Dashboard</h1>
      <p class="subtitle">Key economic indicators and market trends</p>
    </div>

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
        <h2>Unemployment Rate</h2>
        <div class="chart-container">
          <v-chart :option="unemploymentChartOption" autoresize />
        </div>
      </div>

      <!-- Retail Sales -->
      <div class="macro-card">
        <h2>Retail Sales</h2>
        <div class="chart-container">
          <v-chart :option="retailSalesChartOption" autoresize />
        </div>
      </div>

      <!-- Consumer Sentiment -->
      <div class="macro-card">
        <h2>Consumer Sentiment</h2>
        <div class="chart-container">
          <v-chart :option="consumerSentimentChartOption" autoresize />
        </div>
      </div>

      <!-- Inflation -->
      <div class="macro-card">
        <h2>Inflation</h2>
        <div class="chart-container">
          <v-chart :option="inflationChartOption" autoresize />
        </div>
      </div>

      <!-- Federal Funds Rate -->
      <div class="macro-card">
        <h2>Federal Funds Rate</h2>
        <div class="chart-container">
          <v-chart :option="fedFundsChartOption" autoresize />
        </div>
      </div>

      <!-- S&P 500 -->
      <div class="macro-card">
        <h2>S&P 500 Return Yield</h2>
        <div class="chart-container">
          <v-chart :option="spxChartOption" autoresize />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { fetchAllMacroData, type MacroData } from '../services/macro/macroDataService'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const loading = ref(true)
const error = ref<string | null>(null)
const macroData = ref<MacroData | null>(null)

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

onMounted(() => {
  loadData()
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
        return `<b>${point.axisValue}</b><br/>
                Unemployment: <b>${point.value[1].toFixed(1)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '40px'
    },
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
        return `<b>${point.axisValue}</b><br/>
                Consumer Sentiment: <b>${point.value[1].toFixed(1)}</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '40px'
    },
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
        return `<b>${point.axisValue}</b><br/>
                Retail Sales: <b>${point.value[1].toFixed(2)}</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '40px'
    },
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
        return `<b>${point.axisValue}</b><br/>
                Inflation: <b>${point.value[1].toFixed(2)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '40px'
    },
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
      type: 'line',
      data: inflationData,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: '#FFD93D' },
      itemStyle: { color: '#FFD93D' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 217, 61, 0.3)' },
            { offset: 1, color: 'rgba(255, 217, 61, 0.05)' }
          ]
        }
      }
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
        return `<b>${point.axisValue}</b><br/>
                Fed Funds Rate: <b>${point.value[1].toFixed(2)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '40px'
    },
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
      type: 'line',
      data: data,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: '#00B59A' },
      itemStyle: { color: '#00B59A' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 181, 154, 0.3)' },
            { offset: 1, color: 'rgba(0, 181, 154, 0.05)' }
          ]
        }
      }
    }]
  }
})

// S&P 500 Chart - Annualized Return Yield
const spxChartOption = computed(() => {
  if (!macroData.value?.spx || macroData.value.spx.length === 0) return {}
  
  // Calculate annualized return yield
  const sortedData = macroData.value.spx.slice().reverse() // Oldest to newest
  const firstPoint = sortedData[0]
  if (!firstPoint) return {}
  
  const basePrice = firstPoint.close
  const baseDate = new Date(firstPoint.date).getTime()
  
  const returnData = sortedData.map(item => {
    const currentDate = new Date(item.date).getTime()
    const yearsDiff = (currentDate - baseDate) / (1000 * 60 * 60 * 24 * 365.25)
    
    // Annualized return: ((Final/Initial)^(1/years) - 1) * 100
    const annualizedReturn = yearsDiff > 0 
      ? (Math.pow(item.close / basePrice, 1 / yearsDiff) - 1) * 100
      : 0
    
    return [item.date, annualizedReturn]
  })
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' },
      formatter: (params: any) => {
        const point = params[0]
        const returnPct = point.value[1]
        const color = returnPct >= 0 ? '#00B59A' : '#FF6B6B'
        return `<b>${point.axisValue}</b><br/>
                Annualized Return Yield: <b style="color: ${color}">${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%</b>`
      }
    },
    grid: {
      left: '60px',
      right: '20px',
      top: '20px',
      bottom: '40px'
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { 
        color: '#999',
        formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      name: 'S&P 500 Return Yield',
      type: 'line',
      data: returnData,
      smooth: false,
      showSymbol: false,
      lineStyle: { width: 2, color: '#6C5CE7' },
      itemStyle: { color: '#6C5CE7' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(108, 92, 231, 0.3)' },
            { offset: 1, color: 'rgba(108, 92, 231, 0.05)' }
          ]
        }
      }
    }]
  }
})
</script>

<style scoped>
.macro-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.macro-header {
  margin-bottom: 32px;
  text-align: center;
}

.macro-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #F9FAFB;
  margin: 0 0 8px 0;
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
}

@media (max-width: 1024px) {
  .macro-grid {
    grid-template-columns: 1fr;
  }
}

.macro-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  min-height: 300px;
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
}

.coming-soon {
  color: #757575;
  font-style: italic;
}
</style>
