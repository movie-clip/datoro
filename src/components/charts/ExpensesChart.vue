<template>
  <BaseChart
    :key="`expenses-${tickerStore.currentTicker}`"
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    :loading="loading"
    :error="error"
    :message="message"
    kind="bar"
    y-format="currency"
    :bar-max-width="40"
    :stacked="true"
    :selected-segments="selectedSegments"
    :view-mode-options="viewModeOptions"
    :show-growth-labels="true"
    :invert-growth="true"
    :force-expanded="forceExpanded"
    @update:selected-segments="selectedSegments = $event"
    @modal-closed="resetSelection"
  />
</template>

<script setup>
import BaseChart from '../common/BaseChart.vue'
import { useExpensesSeries } from '../../composables/useExpensesSeries.js'
import { useTickerStore } from '../../stores/tickerStore'

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop - using Pinia store
const tickerStore = useTickerStore()
const { 
  selectedSegments, 
  series, 
  compactSeries,
  viewModeOptions,
  title, 
  loading, 
  error, 
  message,
  resetSelection
} = useExpensesSeries()
</script>
