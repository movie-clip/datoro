<template>
  <BaseChart
    :key="`expenses-${ticker}`"
    :title="title"
    :series="series"
    :compactSeries="compactSeries"
    :loading="loading"
    :error="error"
    :message="message"
    kind="bar"
    yFormat="currency"
    :barMaxWidth="40"
    :selectedSegments="selectedSegments"
    @update:selectedSegments="selectedSegments = $event"
    :viewModeOptions="viewModeOptions"
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
