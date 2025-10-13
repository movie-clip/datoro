<template>
  <BaseChart
    :title="title"
    :series="series"
    :loading="loading"
    :error="error"
    :message="message"
    kind="bar"
    y-format="percent"
    :bar-max-width="40"
  />
</template>

<script setup>
import { toRef } from 'vue'
import BaseChart from './BaseChart.vue'
import { useDividendYieldSeries } from '../composables/useDividendYieldSeries.js'

const props = defineProps({
  ticker: { type: String, required: true }
})

const tickerRef = toRef(props, 'ticker')
const { series, title, loading, error, message } = useDividendYieldSeries(tickerRef)
</script>
