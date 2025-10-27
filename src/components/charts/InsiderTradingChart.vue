<template>
  <BaseChart
    :title="title"
    :series="series"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    kind="mixed"
    :dual-axis="true"
    :bar-max-width="40"
    :force-expanded="forceExpanded"
  />
</template>

<script setup lang="ts">
import BaseChart from '../common/BaseChart.vue'
import { useInsiderTradingSeries } from '../../composables/useInsiderTradingSeries'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const { series, title, loading, error, message } = useInsiderTradingSeries()
</script>
