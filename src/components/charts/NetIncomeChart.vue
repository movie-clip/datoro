<template>
  <BaseChart
    :key="`netincome-${ticker}-${period}`"
    v-model:period="period"
    :title="title"
    :series="series"
    kind="bar"
    y-format="currency"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    aria-label="Net Income chart"
    :period-options="viewModeOptions"
    :show-growth-labels="true"
    :ticker="ticker"
    :data-type="dataType"
    :force-expanded="forceExpanded"
    :timeframe="period"
  />
</template>

<script setup lang="ts">
import { useNetIncomeSeries } from '../../composables/useNetIncomeSeries'
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
const { series, title, message, loading, error, period, viewModeOptions, ticker, dataType } = useNetIncomeSeries()
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
