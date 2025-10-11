
<template>
  <div style="position:relative; min-height:240px;">
    <div v-if="loading && series.length === 0" class="spinner" aria-live="polite" aria-busy="true" tabindex="0">Loading…</div>
    <BaseChart
      v-else
      :title="title"
      :series="series"
      :compactSeries="compactSeries"
      kind="bar"
      yFormat="currency"
      :loading="loading"
      :stacked="true"
      :selectedSegments="selectedSegments"
      :viewModeOptions="viewModeOptions"
      @update:selectedSegments="selectedSegments = $event"
      aria-label="EBITDA chart"
      @modal-closed="resetView"
    />
    <p v-if="error" class="msg error" role="alert">{{ error }}</p>
    <p v-else-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<script setup>
import { toRef } from 'vue';
import { useEbitdaSeries } from '../composables/useEbitdaSeries';
import BaseChart from './BaseChart.vue';

const props = defineProps({ ticker: { type: String, required: true } });
const { 
  series, 
  compactSeries, 
  title, 
  message, 
  loading, 
  error, 
  selectedSegments, 
  viewModeOptions,
  segmentData
} = useEbitdaSeries(toRef(props, 'ticker'));

const resetView = () => {
  // Reset to showing all components
  selectedSegments.value = ['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization'];
};
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
