<template>
  <div class="chart-wrapper">
    <!-- Expand button -->
    <button
      v-if="!showModal && !forceExpanded"
      class="expand-hint"
      title="Click to expand"
      @click="showModal = true"
    >
      ⛶
    </button>

    <!-- Compact view -->
    <VChart
      v-if="!showModal && !forceExpanded && (!loading || chartData.length > 0)"
      class="ebitda-chart compact"
      :option="compactChartOption"
      autoresize
      @click="showModal = true"
    />

    <!-- Loading state -->
    <div v-if="loading && chartData.length === 0" class="chart-loading">
      Loading...
    </div>

    <!-- Error state -->
    <div v-if="error && !loading" class="chart-error">
      {{ error }}
    </div>

    <!-- Modal view using ChartModal component -->
    <ChartModal
      :is-open="showModal || !!forceExpanded"
      :title="title"
      @close="showModal = false"
    >
      <VChart
        class="ebitda-chart modal"
        :option="modalChartOption"
        autoresize
      />
    </ChartModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { 
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import ChartModal from '../common/ChartModal.vue'
import { useTickerStore } from '../../stores/tickerStore'
import { getEbitdaSeriesFromBatch } from '../../services/financials/batchChartService'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

interface Props {
  forceExpanded?: boolean
}

const props = defineProps<Props>()

const showModal = ref(false)

const tickerStore = useTickerStore()
const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)

// Extract raw EBITDA data
const rawData = computed(() => getEbitdaSeriesFromBatch(batchData.value, timeframe.value))

const error = computed<string | null>(() => {
  if (batchError.value) return batchError.value
  if (loading.value) return null
  const ticker = (currentTicker.value || '').toUpperCase()
  if (ticker && rawData.value.length === 0) {
    return `No EBITDA data for '${ticker}'`
  }
  return null
})

// Helper to determine quality based on margin
const getQuality = (margin: number): { color: string; label: string } => {
  if (margin >= 25) return { color: '#10b981', label: 'Excellent' }
  if (margin >= 15) return { color: '#3b82f6', label: 'Good' }
  if (margin >= 5) return { color: '#f59e0b', label: 'Fair' }
  if (margin >= 0) return { color: '#94a3b8', label: 'Weak' }
  return { color: '#ef4444', label: 'Poor' }
}

// Prepare chart data
const chartData = computed(() => {
  if (!rawData.value.length) return []
  
  return rawData.value.map(d => {
    const margin = d.revenue > 0 ? (d.ebitda / d.revenue) * 100 : 0
    const quality = getQuality(margin)
    
    return {
      date: d.date,
      ebitda: d.ebitda,
      margin,
      color: quality.color,
      label: quality.label,
      fiscalQuarter: (d as any).fiscalQuarter
    }
  })
})

const title = computed(() => 'EBITDA & Margin')

// Helper to create chart option
const createChartOption = (isModal: boolean) => {
  if (!chartData.value.length) return {}
  
  // Reverse the data so latest date is on the right
  const reversedData = [...chartData.value].reverse()
  
  const dates = reversedData.map(d => {
    const dateObj = new Date(d.date)
    const year = dateObj.getFullYear()
    return d.fiscalQuarter ? `${d.fiscalQuarter}\n${year}` : String(year)
  })
  
  const ebitdaValues = reversedData.map(d => d.ebitda)
  const marginValues = reversedData.map(d => d.margin)
  const colors = reversedData.map(d => d.color)
  
  return {
    backgroundColor: 'transparent',
    // Only show title in compact view (modal has HTML title)
    title: !isModal ? {
      text: title.value,
      left: 'center',
      top: 10,
      textStyle: { color: '#fff', fontSize: 14 }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { 
        type: 'shadow',
        label: { show: false } // Hide the labels on both Y axes when hovering
      },
      backgroundColor: 'rgba(21, 21, 24, 0.95)',
      borderColor: '#2A2A2E',
      borderWidth: 1,
      textStyle: {
        color: '#E5E5E5',
        fontSize: 13
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const index = params[0].dataIndex
        const d = reversedData[index]
        if (!d) return ''
        
        const formatValue = (val: number) => {
          const absVal = Math.abs(val)
          if (absVal >= 1e9) return `$${(val / 1e9).toFixed(2)}B`
          if (absVal >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
          if (absVal >= 1e3) return `$${(val / 1e3).toFixed(1)}K`
          return `$${val.toFixed(0)}`
        }
        
        const dateObj = new Date(d.date)
        const year = dateObj.getFullYear()
        const dateLabel = d.fiscalQuarter ? `${d.fiscalQuarter} ${year}` : year
        
        const explanation = d.label === 'Excellent' ? 'Strong profitability' : 
                           d.label === 'Good' ? 'Healthy margins' : 
                           d.label === 'Fair' ? 'Moderate margins' : 
                           d.label === 'Weak' ? 'Low profitability' : 
                           'Unprofitable'
        
        let html = `<div style="font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #E5E5E5;">${dateLabel}</div>`
        
        html += `<div style="color: #E5E5E5;">EBITDA: ${formatValue(d.ebitda)}</div>`
        html += `<div style="color: #E5E5E5;">Margin: ${d.margin.toFixed(1)}%</div>`
        
        html += `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #444;">`
        html += `<div style="display: flex; align-items: center; gap: 6px;">`
        html += `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${d.color}; display: inline-block;"></span>`
        html += `<span style="font-weight: 600; color: ${d.color};">${d.label}</span>`
        html += `<span style="font-size: 11px; color: #999;">(${explanation})</span>`
        html += `</div></div>`
        
        return html
      }
    },
    // Only show legend in modal view
    legend: isModal ? {
      data: ['EBITDA', 'Margin'],
      top: 40,
      textStyle: { color: '#ddd' }
    } : { show: false },
    grid: {
      left: 60,
      right: 60,
      top: isModal ? 90 : 45,
      bottom: 60
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#888', fontSize: 11 },
      axisLine: { lineStyle: { color: '#444' } }
    },
    yAxis: [
      {
        type: 'value',
        nameTextStyle: { color: '#ddd' },
        axisLabel: {
          color: '#888',
          formatter: (val: number) => {
            const absVal = Math.abs(val)
            if (absVal >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
            if (absVal >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
            return `$${val}`
          }
        },
        splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
      },
      {
        type: 'value',
        nameTextStyle: { color: '#ddd' },
        axisLabel: {
          color: '#888',
          formatter: '{value}%'
        },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'EBITDA',
        type: 'bar',
        data: ebitdaValues,
        itemStyle: {
          color: (params: any) => colors[params.dataIndex],
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 50
      },
      {
        name: 'Margin',
        type: 'line',
        yAxisIndex: 1,
        data: marginValues,
        smooth: true,
        lineStyle: { width: 3 },
        itemStyle: {
          color: (params: any) => colors[params.dataIndex],
          borderWidth: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        }
      }
    ]
  }
}

// Compact chart option (no legend)
const compactChartOption = computed(() => createChartOption(false))

// Modal chart option (with legend)
const modalChartOption = computed(() => createChartOption(true))
</script>

<style scoped>
.chart-wrapper {
  position: relative;
}

.expand-hint {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 30px;
  height: 30px;
  background: rgba(15, 15, 16, 0.6);
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: rgba(229, 229, 229, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  z-index: 10;
  padding: 0;
}

.expand-hint:hover {
  background: rgba(15, 15, 16, 0.9);
  border-color: #00594C;
  color: #E5E5E5;
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.4);
}

.ebitda-chart.compact {
  width: 100%;
  height: 340px;
  cursor: pointer;
}

.ebitda-chart.modal {
  width: 100%;
  height: 63vh;
  min-height: 475px;
}

.chart-loading,
.chart-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 340px;
  color: #888;
  font-size: 14px;
}

.chart-error {
  color: #ef4444;
}
</style>
