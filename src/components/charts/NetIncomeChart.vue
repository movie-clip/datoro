<template>
  <BaseChart
    :key="`netincome-${ticker}-${period}`"
    v-model:period="period"
    :title="title"
    :series="colorCodedSeries"
    :compact-series="colorCodedSeries"
    kind="bar"
    y-format="currency"
    :bar-max-width="50"
    :smooth="0"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    aria-label="Net Income chart"
    :period-options="viewModeOptions"
    :show-growth-labels="true"
    :dual-axis="true"
    right-axis-type="percentage"
    :align-zero="true"
    :ticker="ticker"
    :data-type="dataType"
    :force-expanded="forceExpanded"
    :timeframe="period"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNetIncomeSeries } from '../../composables/useNetIncomeSeries'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const { netIncomeWithMargin, title, message, loading, error, period, viewModeOptions, ticker, dataType } = useNetIncomeSeries()

// Helper to determine quality color based on net margin
const getQualityColor = (margin: number): string => {
  if (margin >= 20) return '#10b981' // Excellent - green (20%+ is very strong for net margin)
  if (margin >= 10) return '#3b82f6' // Good - blue
  if (margin >= 5) return '#f59e0b'  // Fair - orange
  if (margin >= 0) return '#94a3b8'  // Weak - gray
  return '#ef4444' // Poor - red (negative net income)
}

// Add color coding to the series based on net margin
const colorCodedSeries = computed(() => {
  if (!Array.isArray(netIncomeWithMargin.value) || netIncomeWithMargin.value.length === 0) return []
  
  // Find the margin series to get margin values
  const marginSeries = netIncomeWithMargin.value.find(s => s.name === 'Net Margin %')
  const netIncomeSeries = netIncomeWithMargin.value.find(s => s.name === 'Net Income')
  
  if (!marginSeries || !netIncomeSeries) return netIncomeWithMargin.value
  
  // Return color-coded dual-axis series
  return [
    {
      name: 'Net Income',
      data: netIncomeSeries.data,
      type: 'bar',
      yAxisIndex: 0,
      itemStyle: {
        // Color each bar based on corresponding margin value
        color: (params: { dataIndex: number }) => {
          const idx = params.dataIndex
          const marginPoint = marginSeries.data[idx]
          const marginPercent = marginPoint ? marginPoint[1] : 0
          return getQualityColor(marginPercent)
        }
      }
    },
    {
      name: 'Net Margin %',
      data: marginSeries.data,
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      showSymbol: false, // Hide the dots on the line
      lineStyle: { 
        width: 3,
        color: '#94a3b8' // Grey line
      },
      itemStyle: {
        color: '#94a3b8' // Grey color for any visible points
      }
    }
  ]
})
</script>

<style scoped>
.msg { margin: 6px 0 0; opacity: 0.85; }
.msg.error { color: #ff6b6b; font-weight: bold; }
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 1.2em;
  color: #888;
}
</style>
