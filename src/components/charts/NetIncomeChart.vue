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
      :key="`netincome-${tickerStore.currentTicker}`"
      v-model:period="period"
      :title="title"
      :series="series"
      kind="bar"
      y-format="currency"
      :loading="loading"
      aria-label="Net Income chart"
      :period-options="viewModeOptions"
      :show-growth-labels="true"
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
import { useNetIncomeSeries } from '../../composables/useNetIncomeSeries'
import { useTickerStore } from '../../stores/tickerStore'
import BaseChart from '../common/BaseChart.vue'

// No ticker prop - using Pinia store
const tickerStore = useTickerStore()
const { series, title, message, loading, error, period, viewModeOptions } = useNetIncomeSeries()
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
