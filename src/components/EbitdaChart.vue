
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
      :title="title"
      :series="chartView === 'margin' ? ebitdaWithMargin : series"
      :compact-series="ebitdaWithMargin"
      kind="bar"
      y-format="currency"
      :loading="loading"
      :stacked="chartView === 'bridge'"
      :dual-axis="chartView === 'margin'"
      :selected-segments="chartView === 'bridge' ? selectedSegments : undefined"
      :view-mode-options="chartView === 'bridge' ? viewModeOptions : undefined"
      aria-label="EBITDA chart"
      @update:selected-segments="selectedSegments = $event"
      @modal-closed="resetView"
    >
      <template #controls>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <button 
            :class="{ active: chartView === 'margin' }" 
            class="view-toggle"
            @click="chartView = 'margin'"
          >
            EBITDA & Margin
          </button>
          <button 
            :class="{ active: chartView === 'bridge' }" 
            class="view-toggle"
            @click="chartView = 'bridge'"
          >
            Bridge View
          </button>
        </div>
      </template>
    </BaseChart>
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
import { useEbitdaSeries } from '../composables/useEbitdaSeries';
import BaseChart from './BaseChart.vue';

import { computed } from 'vue';

// No ticker prop - using Pinia store
const { 
  series, 
  compactSeries,
  marginData,
  title, 
  message, 
  loading, 
  error,
  chartView,
  selectedSegments, 
  viewModeOptions
} = useEbitdaSeries();

// Combined EBITDA bars with margin line for dual-axis view
const ebitdaWithMargin = computed(() => {
  if (Array.isArray(compactSeries.value) && compactSeries.value.length > 0 && compactSeries.value[0].name) {
    // compactSeries is already a multi-series array, use it
    return [
      ...compactSeries.value,
      {
        name: 'EBITDA Margin',
        data: marginData.value,
        type: 'line',
        yAxisIndex: 1
      }
    ];
  }
  // compactSeries is a simple array for margin view
  return [
    {
      name: 'EBITDA',
      data: compactSeries.value,
      type: 'bar'
    },
    {
      name: 'EBITDA Margin %',
      data: marginData.value,
      type: 'line',
      yAxisIndex: 1
    }
  ];
});

const resetView = () => {
  // Reset to margin view by default
  chartView.value = 'margin';
  // Also reset bridge components if switching back
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
.view-toggle {
  padding: 4px 12px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s;
}
.view-toggle:hover {
  background: #e8e8e8;
}
.view-toggle.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
</style>
