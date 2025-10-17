
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
      :key="`fcf-${tickerStore.currentTicker}`"
      v-model:view-mode="viewMode"
      :title="title"
      :series="series"
      :compact-series="compactSeries"
      kind="bar"
      y-format="short"
      :loading="loading"
      aria-label="Free Cash Flow chart"
      :view-mode-options="viewModeOptions"
      @modal-closed="resetViewMode"
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
import { useFcfSeries } from '../../composables/useFcfSeries';
import { useTickerStore } from '../../stores/tickerStore';
import BaseChart from '../common/BaseChart.vue';

// No ticker prop - using Pinia store
const tickerStore = useTickerStore();
const { viewMode, series, compactSeries, title, message, loading, error } = useFcfSeries();

const viewModeOptions = [
  { label: 'FCF', value: 'fcf' },
  { label: 'FCF Per Share', value: 'fcfPerShare' },
  { label: 'FCF & SBC', value: 'fcfAndSbc' },
];

const resetViewMode = () => {
  viewMode.value = 'fcfAndSbc'; // Reset to showing both FCF and SBC
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
