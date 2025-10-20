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
    :force-expanded="forceExpanded"
  />
</template>

<script setup>
import BaseChart from '../common/BaseChart.vue'
import { useInsiderTradingSeries } from '../../composables/useInsiderTradingSeries.js'

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop - using Pinia store
const { series, title, loading, error, message } = useInsiderTradingSeries()
</script>
