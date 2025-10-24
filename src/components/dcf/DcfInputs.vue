<template>
  <div class="dcf-inputs">
    <h3 class="section-title">Model Assumptions</h3>
    
    <div class="inputs-grid">
      <!-- FCF Growth Rate -->
      <div class="input-group">
        <label for="fcf-growth">FCF Growth Rate (%)</label>
        <div class="input-wrapper">
          <input
            id="fcf-growth"
            v-model.number="localInputs.fcfGrowthRate"
            type="number"
            step="0.1"
            min="-50"
            max="100"
            @input="handleInput('fcfGrowthRate')"
          />
          <span class="input-suffix">%</span>
        </div>
        <span class="input-hint">Annual free cash flow growth rate</span>
      </div>

      <!-- Terminal Growth Rate -->
      <div class="input-group">
        <label for="terminal-growth">Terminal Growth Rate (%)</label>
        <div class="input-wrapper">
          <input
            id="terminal-growth"
            v-model.number="localInputs.terminalGrowthRate"
            type="number"
            step="0.1"
            min="0"
            max="10"
            @input="handleInput('terminalGrowthRate')"
          />
          <span class="input-suffix">%</span>
        </div>
        <span class="input-hint">Perpetual growth rate after projection period</span>
      </div>

      <!-- Discount Rate -->
      <div class="input-group">
        <label for="discount-rate">Discount Rate (%)</label>
        <div class="input-wrapper">
          <input
            id="discount-rate"
            v-model.number="localInputs.discountRate"
            type="number"
            step="0.1"
            min="0"
            max="30"
            @input="handleInput('discountRate')"
          />
          <span class="input-suffix">%</span>
        </div>
        <span class="input-hint">Required rate of return (WACC)</span>
      </div>

      <!-- P/E Ratio -->
      <div class="input-group">
        <label for="pe-ratio">Target P/E Ratio</label>
        <div class="input-wrapper">
          <input
            id="pe-ratio"
            v-model.number="localInputs.peRatio"
            type="number"
            step="0.5"
            min="0"
            max="100"
            @input="handleInput('peRatio')"
          />
          <span class="input-suffix">x</span>
        </div>
        <span class="input-hint">Price-to-earnings multiple for valuation</span>
      </div>

      <!-- Projection Years -->
      <div class="input-group">
        <label for="projection-years">Projection Period (Years)</label>
        <div class="input-wrapper">
          <input
            id="projection-years"
            v-model.number="localInputs.projectionYears"
            type="number"
            step="1"
            min="3"
            max="15"
            @input="handleInput('projectionYears')"
          />
          <span class="input-suffix">yrs</span>
        </div>
        <span class="input-hint">Number of years to project</span>
      </div>
    </div>

    <div class="actions">
      <button class="reset-button" @click="resetToDefaults">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        Reset to Defaults
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Local state for immediate UI updates
const localInputs = reactive({ ...props.modelValue })

// Default values
const defaults = {
  fcfGrowthRate: 10,
  terminalGrowthRate: 2.5,
  discountRate: 10,
  peRatio: 20,
  projectionYears: 10
}

const handleInput = (field) => {
  // Emit changes to parent
  emit('update:modelValue', { ...localInputs })
}

const resetToDefaults = () => {
  Object.assign(localInputs, defaults)
  emit('update:modelValue', { ...defaults })
}

// Sync with parent changes
watch(() => props.modelValue, (newVal) => {
  Object.assign(localInputs, newVal)
}, { deep: true })
</script>

<style scoped>
.dcf-inputs {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(0, 89, 76, 0.1);
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.inputs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 89, 76, 0.3);
  border-radius: 6px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #00594c;
  background: rgba(0, 0, 0, 0.4);
}

.input-wrapper input:hover {
  border-color: rgba(0, 89, 76, 0.5);
}

.input-suffix {
  position: absolute;
  right: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  pointer-events: none;
}

.input-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: -2px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.reset-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.reset-button:active {
  transform: scale(0.98);
}

.reset-button svg {
  width: 16px;
  height: 16px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .inputs-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .dcf-inputs {
    padding: 20px;
  }
}

/* Remove number input spinners for cleaner look */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
