<template>
  <BaseChart
    :title="title"
    :series="series"
    :loading="loading"
    :error="error"
    :message="message"
    kind="mixed"
    :dual-axis="true"
    :barMaxWidth="40"
  />
</template>

<script setup>
import { toRef } from 'vue'
import BaseChart from './BaseChart.vue'
import { useInsiderTradingSeries } from '../composables/useInsiderTradingSeries.js'

const props = defineProps({
  ticker: { type: String, required: true }
})

const tickerRef = toRef(props, 'ticker')
const { series, title, loading, error, message } = useInsiderTradingSeries(tickerRef)
</script>
