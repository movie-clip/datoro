<template>
  <BaseChart
    :key="`dividend-yield-${ticker}-${timeframe}`"
    :title="title"
    :series="series"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    :empty-data-message="emptyDataMessage ?? undefined"
    kind="bar"
    y-format="percent"
    :bar-max-width="40"
    :show-growth-labels="true"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import BaseChart from '../common/BaseChart.vue'
import { useDividendYieldSeries } from '../../composables/useDividendYieldSeries'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// Get timeframe and ticker from store for the key
const tickerStore = useTickerStore()
const { timeframe, currentTicker: ticker } = storeToRefs(tickerStore)

// No ticker prop - using Pinia store
const { _series, _title, _loading, _error, _message, _emptyDataMessage } = useDividendYieldSeries()
</script>
