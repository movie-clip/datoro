
<template>
  <BaseChart
    :key="`shares-${timeframe}`"
    :title="title"
    :series="series"
    kind="bar"
    y-format="short"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    :show-growth-labels="true"
    :invert-growth="true"
    aria-label="Shares Outstanding chart"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSharesSeries } from '../../composables/useSharesSeries'
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

// No ticker prop - using Pinia store - composable will use timeframe from store
const { series, title, message, loading, error } = useSharesSeries()
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
