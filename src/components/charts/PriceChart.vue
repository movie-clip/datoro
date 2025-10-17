
<template>
  <div style="position:relative; min-height:240px;">
    <div
      v-if="loading && series.length === 0"
      class="spinner"
      aria-live="polite"
      aria-busy="true"
      tabindex="0"
    >
      Loading…
    </div>
    <BaseChart
      v-else
      v-model:view-mode="tfKey"
      :title="title"
      :series="series"
      kind="line"
      y-format="int"
      :view-mode-options="timeframeOptions"
      :loading="loading"
      aria-label="Price chart"
    />
    <div
      v-if="error"
      class="error-container"
      role="alert"
    >
      <p class="msg error">
        {{ error }}
      </p>
      <button
        class="retry-btn"
        :disabled="loading"
        @click="retry"
      >
        {{ loading ? 'Retrying...' : '↻ Retry' }}
      </button>
    </div>
    <p
      v-else-if="message"
      class="msg"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { TF_ORDER } from '../../models/timeframe';
import { usePriceSeries } from '../../composables/usePriceSeries';
import BaseChart from '../common/BaseChart.vue';

// No ticker prop needed - using Pinia store
const { tfKey, series, title, message, loading, error, retry } = usePriceSeries();

const timeframeOptions = computed(() => 
  TF_ORDER.map(key => ({ label: key, value: key }))
);
</script>

<style scoped>
.msg { margin: 6px 0 0; opacity: 0.85; }
.msg.error { color: #ff6b6b; font-weight: bold; }

.error-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.retry-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.retry-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff8787;
}

.retry-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 1.2em;
  color: #888;
}
</style>
