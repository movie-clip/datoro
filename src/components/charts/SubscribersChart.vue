<template>
  <BaseChart
    :key="`subscribers-${ticker}-${period}`"
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    kind="bar"
    y-format="short"
    :bar-max-width="50"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="Subscribers chart"
    :show-growth-labels="true"
    :ticker="ticker"
    :data-type="dataType"
    :force-expanded="forceExpanded"
    :timeframe="period"
  />
</template>

<script setup lang="ts">
import { useSubscriberSeries } from '../../composables/useSubscriberSeries'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// Get subscriber data from composable
const { 
  period, 
  series, 
  compactSeries, 
  title, 
  message, 
  loading, 
  error, 
  ticker, 
  dataType 
} = useSubscriberSeries()
</script>
