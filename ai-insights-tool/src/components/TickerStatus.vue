<template>
  <div class="panel status-section">
    <div class="status-header">
      <h2>Ticker Status</h2>
      <div class="status-controls">
        <div class="control-buttons">
          <button 
            @click="$emit('selectAll')" 
            :class="['control-btn', { 'control-btn-active': allSelected }]"
            :disabled="isGenerating || allSelected"
          >
            Select All
          </button>
          <button 
            @click="$emit('deselectAll')" 
            :class="['control-btn', 'control-btn-secondary', { 'control-btn-active': noneSelected }]"
            :disabled="isGenerating || noneSelected"
          >
            Deselect All
          </button>
        </div>
        <span class="selection-count">{{ selectedCount }} selected</span>
      </div>
    </div>
    
    <div class="status-list">
      <!-- Invalid Tickers -->
      <div 
        v-for="ticker in invalidTickers" 
        :key="ticker"
        class="ticker-item ticker-error"
      >
        <div class="ticker-content">
          <div class="ticker-name">{{ ticker }}</div>
          <div class="ticker-status">{{ tickerStatuses[ticker].error }}</div>
        </div>
      </div>

      <!-- Existing Tickers -->
      <div 
        v-for="ticker in existingTickers" 
        :key="ticker"
        class="ticker-item ticker-exists"
      >
        <input 
          type="checkbox" 
          :checked="isSelected(ticker)"
          @change="$emit('toggle', ticker)"
          :disabled="isGenerating"
          class="ticker-checkbox"
        >
        <div class="ticker-content">
          <div class="ticker-name">{{ ticker }}</div>
          <div class="ticker-status">Already in bundle</div>
        </div>
      </div>

      <!-- New Tickers -->
      <div 
        v-for="ticker in newTickers" 
        :key="ticker"
        class="ticker-item ticker-new"
      >
        <input 
          type="checkbox" 
          :checked="isSelected(ticker)"
          @change="$emit('toggle', ticker)"
          :disabled="isGenerating"
          class="ticker-checkbox"
        >
        <div class="ticker-content">
          <div class="ticker-name">{{ ticker }}</div>
          <div class="ticker-status">New ticker</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  invalidTickers: { type: Array, required: true },
  existingTickers: { type: Array, required: true },
  newTickers: { type: Array, required: true },
  tickerStatuses: { type: Object, required: true },
  selectedCount: { type: Number, required: true },
  isGenerating: { type: Boolean, required: true },
  isSelected: { type: Function, required: true }
})

defineEmits(['selectAll', 'deselectAll', 'toggle'])

// Compute total selectable tickers (excluding invalid)
const totalSelectableTickers = computed(() => {
  return props.existingTickers.length + props.newTickers.length
})

// Check if all tickers are selected
const allSelected = computed(() => {
  return props.selectedCount > 0 && props.selectedCount === totalSelectableTickers.value
})

// Check if no tickers are selected
const noneSelected = computed(() => {
  return props.selectedCount === 0
})
</script>

<style scoped>
.status-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 1;
}

.control-buttons {
  display: flex;
  gap: 0.375rem;
}

.control-btn {
  background: transparent;
  color: #E5E5E5;
  border: 1px solid #2A2A2E;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  line-height: 1.3;
}

.control-btn:hover:not(:disabled) {
  border-color: #3A3A3E;
  background: rgba(255, 255, 255, 0.02);
}

.control-btn:active:not(:disabled) {
  transform: translateY(0);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #6B7280;
  border-color: #374151;
}

.control-btn-active {
  border-color: #00A88E;
  color: #00A88E;
  background: transparent;
  box-shadow: 0 0 8px rgba(0, 168, 142, 0.3);
}

.control-btn-active:hover {
  border-color: #00A88E;
  background: rgba(0, 168, 142, 0.05);
}

.selection-count {
  font-size: 0.75rem;
  color: #9CA3AF;
  font-weight: 500;
  white-space: nowrap;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.ticker-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.8rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid;
  transition: all 0.2s ease;
}

.ticker-item:hover {
  transform: translateX(2px);
}

.ticker-checkbox {
  width: 12px;
  height: 12px;
  margin-top: 0px;
  cursor: pointer;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent;
  border: 1px solid #00A88E;
  border-radius: 3px;
  position: relative;
  transition: all 0.2s ease;
}

.ticker-checkbox:hover:not(:disabled) {
  border-color: #00A88E;
  background: rgb(0, 168, 142, 0.1);
}

.ticker-checkbox:checked {
  background: transparent;
  border-color: #00A88E;
  box-shadow: 0 0 8px rgba(0, 168, 142, 0.3);
}

.ticker-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #00A88E;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.ticker-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ticker-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.ticker-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #E5E5E5;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.ticker-status {
  font-size: 0.7rem;
  color: #9CA3AF;
  font-weight: 500;
  line-height: 1.2;
}

/* Status color variants */
.ticker-exists {
  background: rgba(0, 168, 142, 0.1);
  border-color: #00A88E;
}

.ticker-new {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.ticker-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.ticker-error .ticker-status {
  color: #ef4444;
}
</style>
