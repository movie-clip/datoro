
<template>
  <BaseChart
    :key="`cashdebt-${timeframe}`"
    :title="title"
    :series="series"
    kind="bar"
    y-format="short"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    aria-label="Cash and Debt chart"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCashDebtSeries } from '../../composables/useCashDebtSeries'
import { useTickerStore } from '../../stores/tickerStore'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// Get timeframe from store for chart key
const tickerStore = useTickerStore()
const { timeframe } = storeToRefs(tickerStore)

// No ticker prop - using Pinia store
const { _series, _title, _message, _loading, _error } = useCashDebtSeries()
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
