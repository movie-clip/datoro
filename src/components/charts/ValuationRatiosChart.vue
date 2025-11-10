<template>
  <BaseChart
    :key="`valuation-ratios-${ticker}-${timeframe}`"
    :title="title"
    :series="series"
    :compact-series="compactSeries"
    kind="line"
    :dual-axis="true"
    y-format="ratio"
    right-axis-type="percentage"
    :loading="loading"
    :error="error ?? undefined"
    :message="message"
    aria-label="Financial Ratios chart"
    :force-expanded="forceExpanded"
    :timeframe="timeframe"
    @modal-closed="resetRatios"
  >
    <template #controls>
      <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; justify-content: center;">
        <button
          v-for="ratio in ratioOptions"
          :key="ratio.key"
          :class="['view-mode-btn', { active: selectedRatios.includes(ratio.key) }]"
          @click="toggleRatio(ratio.key)"
        >
          {{ ratio.label }}
        </button>
      </div>
    </template>
  </BaseChart>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useValuationRatiosSeries } from '../../composables/useValuationRatiosSeries'
import { useTickerStore } from '../../stores/tickerStore'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop - using Pinia store
const tickerStore = useTickerStore()
const { timeframe } = storeToRefs(tickerStore)
const { series, compactSeries, title, message, loading, error, ticker, selectedRatios } = useValuationRatiosSeries()

// Ratio toggle options
type RatioKey = 'pe' | 'ps' | 'roic' | 'grossMargin' | 'netMargin'

const ratioOptions: { key: RatioKey; label: string }[] = [
  { key: 'pe', label: 'P/E' },
  { key: 'ps', label: 'P/S' },
  { key: 'roic', label: 'ROIC' },
  { key: 'grossMargin', label: 'Gross Margin' },
  { key: 'netMargin', label: 'Net Margin' }
]

function toggleRatio(ratioKey: RatioKey) {
  const index = selectedRatios.value.indexOf(ratioKey)
  if (index > -1) {
    // Remove if already selected (but keep at least one)
    if (selectedRatios.value.length > 1) {
      selectedRatios.value.splice(index, 1)
    }
  } else {
    // Add if not selected
    selectedRatios.value.push(ratioKey)
  }
}

const resetRatios = (): void => {
  selectedRatios.value = ['pe', 'ps', 'roic']
}
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

.view-mode-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(30, 30, 34, 0.8) 0%, rgba(25, 25, 28, 0.8) 100%);
  color: rgba(229, 229, 229, 0.65);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: fit-content;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.view-mode-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  opacity: 0;
  transition: opacity 0.2s;
}

.view-mode-btn:hover {
  background: linear-gradient(135deg, rgba(35, 35, 39, 0.9) 0%, rgba(30, 30, 34, 0.9) 100%);
  color: rgba(229, 229, 229, 0.85);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.view-mode-btn:hover::before {
  opacity: 1;
}

.view-mode-btn.active {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.15) 100%);
  color: #10B981;
  font-weight: 600;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 4px 12px rgba(16, 185, 129, 0.2);
  transform: translateY(0);
}

.view-mode-btn.active::before {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
  opacity: 1;
}

.view-mode-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
