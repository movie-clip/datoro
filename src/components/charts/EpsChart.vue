
<template>
  <BaseChart
    :title="title"
    :series="series"
    kind="bar"
    y-format="int"
    :loading="loading"
    :error="error"
    :message="message"
    aria-label="EPS chart"
    :show-growth-labels="true"
    :force-expanded="forceExpanded"
  />
</template>

<script setup>
import { useEpsSeries } from '../../composables/useEpsSeries';
import BaseChart from '../common/BaseChart.vue';

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop - using Pinia store
const { series, title, message, loading, error } = useEpsSeries();
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
