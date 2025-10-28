<template>
  <div class="timeframe-toggle">
    <button
      class="toggle-btn"
      :class="{ active: timeframe === 'annual' }"
      @click="handleTimeframeChange('annual')"
    >
      Annual
    </button>
    <button
      class="toggle-btn"
      :class="{ active: timeframe === 'quarterly' }"
      @click="handleTimeframeChange('quarterly')"
    >
      Quarterly
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'

const tickerStore = useTickerStore()
const { timeframe } = storeToRefs(tickerStore)

const handleTimeframeChange = (newTimeframe: 'annual' | 'quarterly'): void => {
  tickerStore.setTimeframe(newTimeframe)
}
</script>

<style scoped>
.timeframe-toggle {
  display: inline-flex;
  gap: 8px;
  padding: 0;
}

.toggle-btn {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.toggle-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.toggle-btn.active {
  color: #fff;
  background: rgba(0, 181, 154, 0.2);
  border: 1px solid rgba(0, 181, 154, 0.5);
  box-shadow: 0 0 10px rgba(0, 181, 154, 0.15);
}

.toggle-btn.active:hover {
  background: rgba(0, 181, 154, 0.25);
}
</style>
