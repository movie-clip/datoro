<template>
  <BaseChart
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
  />
</template>

<script setup lang="ts">
import BaseChart from '../common/BaseChart.vue'
import { useDividendYieldSeries } from '../../composables/useDividendYieldSeries'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const { series, title, loading, error, message, emptyDataMessage } = useDividendYieldSeries()
</script>
