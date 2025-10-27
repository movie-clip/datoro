
<template>
  <BaseChart
    :title="title"
    :series="series"
    kind="bar"
    y-format="int"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="EPS chart"
    :show-growth-labels="true"
    :force-expanded="forceExpanded"
  />
</template>

<script setup lang="ts">
import { useEpsSeries } from '../../composables/useEpsSeries'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const { series, title, message, loading, error } = useEpsSeries()
</script>

<style scoped>
.msg { margin: 6px 0 0; opacity: 0.85; }
.msg.error { color: #ff6b6b; font-weight: bold; }
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 1.2em;
  color: #888;
}
</style>
