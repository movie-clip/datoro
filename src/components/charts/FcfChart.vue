
<template>
  <BaseChart
    :key="`fcf-${ticker}-${timeframe}`"
    v-model:view-mode="viewMode"
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    kind="bar"
    :y-format="yFormat"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="Free Cash Flow chart"
    :view-mode-options="viewModeOptions"
    :show-growth-labels="true"
    :ticker="ticker"
    :data-type="dataType"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
    @modal-closed="resetViewMode"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFcfSeries } from '../../composables/useFcfSeries'
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
const { timeframe } = storeToRefs(tickerStore)
const { viewMode, yFormat, series, compactSeries, title, message, loading, error, ticker, dataType } = useFcfSeries()

const viewModeOptions = [
  { label: 'FCF', value: 'fcf' },
  { label: 'FCF Per Share', value: 'fcfPerShare' },
  { label: 'FCF & SBC', value: 'fcfAndSbc' }
]

const resetViewMode = (): void => {
  viewMode.value = 'fcfAndSbc' // Reset to showing both FCF and SBC
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
