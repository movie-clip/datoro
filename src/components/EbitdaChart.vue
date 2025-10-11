
<template>
  <div style="position:relative; min-height:240px;">
    <div v-if="loading && series.length === 0" class="spinner" aria-live="polite" aria-busy="true" tabindex="0">Loading…</div>
    <BaseChart
      v-else
      :title="title"
      :series="series"
      kind="bar"
      yFormat="currency"
      :loading="loading"
      v-model:viewMode="viewMode"
      :viewModeOptions="[
        { value: 'annual', label: 'Annual' },
        { value: 'quarterly', label: 'Quarterly' }
      ]"
      aria-label="EBITDA chart"
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
const { series, title, message, loading, error, viewMode } = useEbitdaSeries(toRef(props, 'ticker'));
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
