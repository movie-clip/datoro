
<template>
  <BaseChart
    v-model:selected-segments="selectedSegments"
    :title="title"
    :series="series"
    kind="bar"
    y-format="currency"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    :empty-data-message="emptyDataMessage ?? undefined"
    :stacked="true"
    :view-mode-options="segmentOptions"
    :show-growth-labels="true"
    aria-label="Capital returned to shareholders chart"
    :force-expanded="forceExpanded"
  />
</template>

<script setup lang="ts">
import { useCapitalReturnedSeries } from '../../composables/useCapitalReturnedSeries'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const { series, title, message, loading, error, emptyDataMessage, selectedSegments } = useCapitalReturnedSeries()

const segmentOptions = [
  { value: 'dividends', label: 'Dividends' },
  { value: 'buybacks', label: 'Buybacks' }
]
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
