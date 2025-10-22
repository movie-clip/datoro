
<template>
  <BaseChart
    v-model:view-mode="tfKey"
    :title="title"
    :series="series"
    kind="line"
    y-format="price"
    :view-mode-options="timeframeOptions"
    :loading="loading"
    :error="error"
    :message="message"
    aria-label="Price chart"
    :force-expanded="forceExpanded"
    :show-growth-labels="true"
    :custom-growth-data="growthData"
  />
</template>

<script setup>
import { computed } from 'vue';
import { TF_ORDER } from '../../models/timeframe';
import { usePriceSeries } from '../../composables/usePriceSeries';
import BaseChart from '../common/BaseChart.vue';

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop needed - using Pinia store
const { tfKey, series, title, message, loading, error, retry, growthData } = usePriceSeries();

const timeframeOptions = computed(() => 
  TF_ORDER.map(key => ({ label: key, value: key }))
);
</script>

<style scoped>
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 1.2em;
  color: #888;
}
</style>
