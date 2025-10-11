
<template>
  <div style="position:relative; min-height:240px;">
    <div v-if="loading && series.length === 0" class="spinner" aria-live="polite" aria-busy="true" tabindex="0">Loading…</div>
    <BaseChart
      v-else
      :title="title"
      :series="series"
      kind="line"
      yFormat="int"
      v-model:viewMode="tfKey"
      :viewModeOptions="timeframeOptions"
      :loading="loading"
      aria-label="Price chart"
    />
    <p v-if="error" class="msg error" role="alert">{{ error }}</p>
    <p v-else-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<script setup>
import { toRef, computed } from 'vue';
import { TF_ORDER } from '../models/timeframe';
import { usePriceSeries } from '../composables/usePriceSeries';
import BaseChart from './BaseChart.vue';

const props = defineProps({ ticker: { type: String, required: true } });
const { tfKey, series, title, message, loading, error } = usePriceSeries(toRef(props, 'ticker'));

const timeframeOptions = computed(() => 
  TF_ORDER.map(key => ({ label: key, value: key }))
);
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
