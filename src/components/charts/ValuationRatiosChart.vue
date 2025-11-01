<template>
  <BaseChart
    :key="`valuation-ratios-${ticker}-${timeframe}`"
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    kind="line"
    :dual-axis="true"
    y-format="ratio"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="P/E and P/S Ratios chart"
    :show-legend="false"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useValuationRatiosSeries } from '../../composables/useValuationRatiosSeries'
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
const { series, compactSeries, title, message, loading, error, ticker } = useValuationRatiosSeries()
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
