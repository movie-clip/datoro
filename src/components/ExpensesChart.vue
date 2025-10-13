<template>
  <BaseChart
    :key="`expenses-${ticker}`"
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
    @update:selected-segments="selectedSegments = $event"
    @modal-closed="resetSelection"
  />
</template>

<script setup>
import { toRef } from 'vue'
import BaseChart from './BaseChart.vue'
import { useExpensesSeries } from '../composables/useExpensesSeries.js'

const props = defineProps({
  ticker: { type: String, required: true }
})

const tickerRef = toRef(props, 'ticker')
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
} = useExpensesSeries(tickerRef)
</script>
