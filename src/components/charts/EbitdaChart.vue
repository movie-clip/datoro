<template>
  <BaseChart
    :key="`ebitda-${ticker}-${timeframe}`"
    :title="'EBITDA & Margin'"
    :series="ebitdaSeries"
    :compact-series="ebitdaSeries"
    kind="bar"
    y-format="currency"
    :bar-max-width="50"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    aria-label="EBITDA chart"
    :dual-axis="true"
    right-axis-type="percentage"
    :align-zero="true"
    :ticker="ticker"
    data-type="ebitda"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { useEbitdaSeries } from '../../composables/useEbitdaSeries'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

const tickerStore = useTickerStore()
const { timeframe } = storeToRefs(tickerStore)

const { 
  compactSeries: rawSeries,
  marginData, 
  title, 
  message, 
  loading, 
  error
} = useEbitdaSeries()

// Get ticker from store
const ticker = computed(() => tickerStore.currentTicker || '')

// Helper to determine quality color based on margin
const getQualityColor = (margin: number): string => {
  if (margin >= 25) return '#10b981' // Excellent - green
  if (margin >= 15) return '#3b82f6' // Good - blue
  if (margin >= 5) return '#f59e0b'  // Fair - orange
  if (margin >= 0) return '#94a3b8'  // Weak - gray
  return '#ef4444' // Poor - red
}

// Dual-axis series with color-coded quality indicators
const ebitdaSeries = computed(() => {
  if (!Array.isArray(rawSeries.value) || rawSeries.value.length === 0) return []
  
  // Return as dual-axis series: EBITDA bars + Margin line
  return [
    {
      name: 'EBITDA',
      data: rawSeries.value,
      type: 'bar',
      yAxisIndex: 0,
      itemStyle: {
        // Color each bar based on corresponding margin value
        color: (params: any) => {
          const idx = params.dataIndex
          const marginPoint = marginData.value[idx]
          const marginPercent = marginPoint ? marginPoint[1] : 0
          return getQualityColor(marginPercent)
        }
      }
    },
    {
      name: 'Margin %',
      data: marginData.value,
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
