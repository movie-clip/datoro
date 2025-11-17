<template>
  <!-- Render different chart components based on view mode -->
  <component
    :is="currentChartComponent"
    :force-expanded="forceExpanded"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRevenueCategorySeries } from '../../composables/useRevenueCategorySeries'
import RevenueWithMarginChart from './RevenueWithMarginChart.vue'
import RevenueStackedChart from './RevenueStackedChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// Get view mode from composable
const { viewMode } = useRevenueCategorySeries()

// Choose which chart component to render based on view mode
const currentChartComponent = computed(() => {
  // Total revenue mode uses dual-axis chart with margin line
  if (viewMode.value === 'total') {
    return RevenueWithMarginChart
  }
  // Product/Geographic modes use stacked bar chart
  return RevenueStackedChart
})
</script>
