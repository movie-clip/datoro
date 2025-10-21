<template>
  <BaseChart
    :title="title"
    :series="series"
    :loading="loading"
    :error="error"
    :message="message"
    :empty-data-message="emptyDataMessage"
    kind="bar"
    y-format="percent"
    :bar-max-width="40"
    :show-growth-labels="true"
    :force-expanded="forceExpanded"
  />
</template>

<script setup>
import BaseChart from '../common/BaseChart.vue'
import { useDividendYieldSeries } from '../../composables/useDividendYieldSeries.js'

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop - using Pinia store
const { series, title, loading, error, message, emptyDataMessage } = useDividendYieldSeries()
</script>
