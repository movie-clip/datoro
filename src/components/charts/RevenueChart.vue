
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
      :key="`revenue-${tickerStore.currentTicker}`"
      :title="title"
      :series="series"
      :compact-series="compactSeries"
      kind="bar"
      y-format="short"
      :loading="loading"
      aria-label="Revenue chart"
      :selected-segments="selectedSegments"
      :view-mode-options="viewModeOptions"
      :stacked="selectedSegments.length > 1 && !selectedSegments.includes('total')"
      :show-growth-labels="true"
      @update:selected-segments="selectedSegments = $event"
      @modal-closed="resetSelection"
    />
    <p
      v-if="error"
      class="msg error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="message"
      class="msg"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { useRevenueSeries } from '../../composables/useRevenueSeries';
import { useTickerStore } from '../../stores/tickerStore';
import BaseChart from '../common/BaseChart.vue';

// No ticker prop - using Pinia store
const tickerStore = useTickerStore();
const { selectedSegments, viewModeOptions, series, compactSeries, title, message, loading, error } = useRevenueSeries();

const resetSelection = () => {
  selectedSegments.value = ['total'];
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
