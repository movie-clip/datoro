<template>
  <div class="revenue-chart-container">
    <!-- Total Revenue: Dual-axis chart with margin line -->
    <BaseChart
      v-if="viewMode === 'total' || hasEverSwitched"
      v-show="viewMode === 'total'"
      :key="`revenue-total-${ticker}-${timeframe}`"
      v-model:view-mode="viewMode"
      :title="title"
      :series="displaySeries"
      :compact-series="compactDisplaySeries"
      kind="bar"
      y-format="short"
      :bar-max-width="50"
      :smooth="0"
      :loading="loading"
      :error="error ?? undefined"
      :message="message"
      aria-label="Revenue chart with gross margin"
      :view-mode-options="viewModeOptions"
      :stacked="false"
      :show-growth-labels="true"
      :dual-axis="true"
      right-axis-type="percentage"
      :align-zero="true"
      :ticker="ticker"
      :data-type="dataType"
      :force-expanded="forceExpanded"
      :timeframe="timeframe"
      @modal-closed="resetViewMode"
    />
    
    <!-- Product/Geographic Categories: Single-axis stacked bars -->
    <BaseChart
      v-if="viewMode !== 'total' || hasEverSwitched"
      v-show="viewMode !== 'total'"
      :key="`revenue-stacked-${ticker}-${timeframe}`"
      v-model:view-mode="viewMode"
      :title="title"
      :series="displaySeries"
      :compact-series="compactDisplaySeries"
      kind="bar"
      y-format="short"
      :bar-max-width="50"
      :smooth="0"
      :loading="loading"
      :error="error ?? undefined"
      :message="message"
      aria-label="Revenue by Category chart"
      :view-mode-options="viewModeOptions"
      :stacked="true"
      :show-growth-labels="true"
      :dual-axis="false"
      :ticker="ticker"
      :data-type="dataType"
      :force-expanded="forceExpanded"
      :timeframe="timeframe"
      @modal-closed="resetViewMode"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRevenueCategorySeries } from '../../composables/useRevenueCategorySeries'
import { useTickerStore } from '../../stores/tickerStore'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// Get timeframe from store for the key
const tickerStore = useTickerStore()
const { timeframe } = storeToRefs(tickerStore)

// Track if user has ever switched from total view
const hasEverSwitched = ref(false)

// Use composable for all data
const { 
  viewMode, 
  viewModeOptions, 
  series, 
  compactSeries, 
  revenueWithMargin,
  grossMarginData,
  title, 
  message, 
  loading, 
  error, 
  ticker, 
  dataType 
} = useRevenueCategorySeries()

// Watch for view mode changes to track if user has switched
watch(viewMode, (newMode) => {
  if (newMode !== 'total') {
    hasEverSwitched.value = true
  }
})

// Helper to determine quality color based on gross margin
const getQualityColor = (margin: number): string => {
  if (margin >= 50) return '#10b981' // Excellent - green (50%+ gross margin is excellent)
  if (margin >= 35) return '#3b82f6' // Good - blue
  if (margin >= 20) return '#f59e0b'  // Fair - orange
  if (margin >= 0) return '#94a3b8'  // Weak - gray
  return '#ef4444' // Poor - red (negative gross margin)
}

// Display series with color coding for total view
const displaySeries = computed(() => {
  // For non-total views (stacked categories), return regular series
  // These don't have yAxisIndex and work with single Y-axis
  if (viewMode.value !== 'total') {
    // Ensure series are clean - no yAxisIndex properties
    return series.value.map(s => {
      if (typeof s === 'object' && s !== null && !Array.isArray(s)) {
        const { yAxisIndex, ...cleanSeries } = s as any
        return cleanSeries
      }
      return s
    })
  }

  // For total view, add color coding based on gross margin
  if (!Array.isArray(revenueWithMargin.value) || revenueWithMargin.value.length === 0) {
    return series.value
  }

  const revenueSeries = revenueWithMargin.value.find(s => s.name === 'Revenue')
  const marginSeries = revenueWithMargin.value.find(s => s.name === 'Gross Margin %')

  if (!revenueSeries || !marginSeries) return series.value

  // Return color-coded dual-axis series (only in total mode)
  return [
    {
      name: 'Revenue',
      data: revenueSeries.data,
      type: 'bar',
      yAxisIndex: 0,
      itemStyle: {
        // Color each bar based on corresponding gross margin value
        color: (params: any) => {
          const idx = params.dataIndex
          const marginPoint = (marginSeries.data as any)[idx]
          const marginPercent = marginPoint ? marginPoint[1] : 0
          return getQualityColor(marginPercent)
        }
      }
    },
    {
      name: 'Gross Margin %',
      data: marginSeries.data,
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      showSymbol: false,
      lineStyle: { 
        width: 3,
        color: '#3b82f6' // Blue line (matches EBITDA)
      },
      itemStyle: {
        color: '#3b82f6'
      }
    }
  ]
})

// Compact display series
const compactDisplaySeries = computed(() => {
  if (viewMode.value !== 'total') {
    // Ensure compact series are clean - no yAxisIndex properties
    return compactSeries.value.map(s => {
      if (typeof s === 'object' && s !== null && !Array.isArray(s)) {
        const { yAxisIndex, ...cleanSeries } = s as any
        return cleanSeries
      }
      return s
    })
  }
  // Use the same color-coded series for compact view
  return displaySeries.value
})

const resetViewMode = (): void => {
  viewMode.value = 'total'
}
</script>

<style scoped>
.revenue-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
