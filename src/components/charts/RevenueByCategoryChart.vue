<template>
  <BaseChart
    :key="`revenue-category-${ticker}-${timeframe}`"
    v-model:view-mode="viewMode"
    :title="title"
    :series="series"
    kind="bar"
    y-format="short"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="Revenue by Category chart"
    :view-mode-options="viewModeOptions"
    :stacked="viewMode !== 'total'"
    :show-growth-labels="viewMode === 'total'"
    :ticker="ticker"
    :data-type="dataType"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
    @modal-closed="resetViewMode"
  />
</template>

<script setup lang="ts">
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

// Use composable for all data
const { viewMode, viewModeOptions, series, title, message, loading, error, ticker, dataType } = useRevenueCategorySeries()

const resetViewMode = (): void => {
  viewMode.value = 'total'
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
