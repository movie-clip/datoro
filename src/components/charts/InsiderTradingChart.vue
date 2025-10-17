<template>
  <BaseChart
    :title="title"
    :series="series"
    :loading="loading"
    :error="error"
    :message="message"
    kind="mixed"
    :dual-axis="true"
    :bar-max-width="40"
  />
</template>

<script setup>
import BaseChart from '../common/BaseChart.vue'
import { useInsiderTradingSeries } from '../../composables/useInsiderTradingSeries.js'

// No ticker prop - using Pinia store
const { series, title, loading, error, message } = useInsiderTradingSeries()
</script>
