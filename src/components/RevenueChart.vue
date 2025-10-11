
<template>
  <div style="display:grid; grid-template-rows:auto 1fr auto; gap:10px;">
    <div class="seg" role="group" aria-label="Select period">
      <button :class="['segbtn', period === 'annual' ? 'active' : '']" @click="period = 'annual'" aria-pressed="annual" tabindex="0">Annual</button>
      <button :class="['segbtn', period === 'quarterly' ? 'active' : '']" @click="period = 'quarterly'" aria-pressed="quarterly" tabindex="0">Quarterly</button>
    </div>
    <div style="position:relative; min-height:240px;">
      <div v-if="loading" class="spinner" aria-live="polite" aria-busy="true" tabindex="0">Loading…</div>
      <BaseChart
        v-else
        :title="title"
        :series="series"
        kind="bar"
        yFormat="short"
        aria-label="Revenue chart"
      />
      <p v-if="error" class="msg error" role="alert">{{ error }}</p>
      <p v-else-if="message" class="msg">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { toRef } from 'vue';
import { useRevenueSeries } from '../composables/useRevenueSeries';
import BaseChart from './BaseChart.vue';

const props = defineProps({ ticker: { type: String, required: true } });
const { period, series, title, message, loading, error } = useRevenueSeries(toRef(props, 'ticker'));
</script>

<style scoped>
.seg { display: inline-flex; border: 1px solid #444; border-radius: 10px; overflow: hidden; }
.segbtn { padding: 8px 12px; background: #2a2a2a; color: #fff; border: 0; cursor: pointer; }
.segbtn.active { background: #3a3a3a; border-left: 1px solid #555; border-right: 1px solid #555; }
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
