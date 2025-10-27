<template>
  <BaseChart
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
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

<script setup lang="ts">
import BaseChart from '../common/BaseChart.vue'
import { useExpensesSeries } from '../../composables/useExpensesSeries'
import { useTickerStore } from '../../stores/tickerStore'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
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
