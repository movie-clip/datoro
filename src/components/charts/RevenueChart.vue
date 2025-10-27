
<template>
  <BaseChart
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    kind="bar"
    y-format="short"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="Revenue chart"
    :selected-segments="selectedSegments"
    :view-mode-options="viewModeOptions"
    :stacked="selectedSegments.length > 1 && !selectedSegments.includes('total')"
    :show-growth-labels="true"
    :ticker="ticker"
    :data-type="dataType"
    :force-expanded="forceExpanded"
    @update:selected-segments="selectedSegments = $event"
    @modal-closed="resetSelection"
  />
</template>

<script setup lang="ts">
import { useRevenueSeries } from '../../composables/useRevenueSeries'
import { useTickerStore } from '../../stores/tickerStore'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const tickerStore = useTickerStore()
const { selectedSegments, viewModeOptions, series, compactSeries, title, message, loading, error, ticker, dataType } = useRevenueSeries()

const resetSelection = (): void => {
  selectedSegments.value = ['total']
}
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
