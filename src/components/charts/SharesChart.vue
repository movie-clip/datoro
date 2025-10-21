
<template>
  <BaseChart
    :title="title"
    :series="series"
    kind="bar"
    y-format="short"
    :loading="loading"
    :error="error"
    :message="message"
    :show-growth-labels="true"
    :invert-growth="true"
    aria-label="Shares Outstanding chart"
    :force-expanded="forceExpanded"
  />
</template>

<script setup>
import { ref } from 'vue';
import { useSharesSeries } from '../../composables/useSharesSeries';
import BaseChart from '../common/BaseChart.vue';

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop - using Pinia store
const period = ref('annual');
const { series, title, message, loading, error } = useSharesSeries(period);
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
