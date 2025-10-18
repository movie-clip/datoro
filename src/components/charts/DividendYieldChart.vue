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
    :show-growth-labels="true"
  />
</template>

<script setup>
import BaseChart from '../common/BaseChart.vue'
import { useDividendYieldSeries } from '../../composables/useDividendYieldSeries.js'

// No ticker prop - using Pinia store
const { series, title, loading, error, message } = useDividendYieldSeries()
</script>
