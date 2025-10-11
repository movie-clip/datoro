
<template>
  <div style="display:grid; grid-template-rows:auto 1fr auto; gap:10px;">
    <TimeframeButtons v-model="tfKey" :order="tfOrder" aria-label="Select timeframe" />
    <div style="position:relative; min-height:240px;">
      <div v-if="loading" class="spinner" aria-live="polite" aria-busy="true" tabindex="0">Loading…</div>
      <BaseChart
        v-else
        :title="title"
        :series="series"
        kind="line"
        yFormat="int"
        aria-label="Price chart"
      />
      <p v-if="error" class="msg error" role="alert">{{ error }}</p>
      <p v-else-if="message" class="msg">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { toRef } from 'vue';
import { TF_ORDER } from '../models/timeframe';
import { usePriceSeries } from '../composables/usePriceSeries';
import TimeframeButtons from './TimeframeButtons.vue';
import BaseChart from './BaseChart.vue';

const props = defineProps({ ticker: { type: String, required: true } });
const { tfKey, series, title, message, loading, error } = usePriceSeries(toRef(props, 'ticker'));
const tfOrder = TF_ORDER;
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
