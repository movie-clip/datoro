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
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #9E9E9E;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  position: relative;
  outline: none;
}

.toggle-btn:hover {
  background: rgba(0, 89, 76, 0.1);
  color: #E5E5E5;
  border-color: rgba(0, 89, 76, 0.3);
}

.toggle-btn.active {
  background: linear-gradient(135deg, rgba(0, 89, 76, 0.2) 0%, rgba(0, 89, 76, 0.15) 100%);
  border-color: #00594C;
  color: #00A88E;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.2);
}

.toggle-btn:focus-visible {
  outline: 2px solid #00594C;
  outline-offset: 2px;
}
</style>
