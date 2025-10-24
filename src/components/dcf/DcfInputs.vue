<template>
  <div class="dcf-inputs">
    <h3 class="section-title">Model Assumptions</h3>
    
    <div class="scenario-labels">
      <span class="scenario-label best">Best</span>
      <span class="scenario-label average">Average</span>
      <span class="scenario-label worst">Worst</span>
    </div>
    
    <div class="inputs-grid">
      <!-- Target P/E Ratio -->
      <div class="input-group">
        <label>Target P/E Ratio</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              v-model.number="localInputs.peRatio.best"
              type="number"
              step="0.5"
              min="0"
              max="100"
              @input="handleInput('peRatio')"
            />
            <span class="input-suffix">x</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              v-model.number="localInputs.peRatio.average"
              type="number"
              step="0.5"
              min="0"
              max="100"
              @input="handleInput('peRatio')"
            />
            <span class="input-suffix">x</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              v-model.number="localInputs.peRatio.worst"
              type="number"
              step="0.5"
              min="0"
              max="100"
              @input="handleInput('peRatio')"
            />
            <span class="input-suffix">x</span>
          </div>
        </div>
        <span class="input-hint">Price-to-earnings multiple for valuation</span>
      </div>

      <!-- FCF Growth Rate -->
      <div class="input-group">
        <label>FCF Growth Rate (%)</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              v-model.number="localInputs.fcfGrowthRate.best"
              type="number"
              step="0.1"
              min="-50"
              max="100"
              @input="handleInput('fcfGrowthRate')"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              v-model.number="localInputs.fcfGrowthRate.average"
              type="number"
              step="0.1"
              min="-50"
              max="100"
              @input="handleInput('fcfGrowthRate')"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              v-model.number="localInputs.fcfGrowthRate.worst"
              type="number"
              step="0.1"
              min="-50"
              max="100"
              @input="handleInput('fcfGrowthRate')"
            />
            <span class="input-suffix">%</span>
          </div>
        </div>
        <span class="input-hint">Annual free cash flow growth rate</span>
      </div>

      <!-- Terminal Growth Rate -->
      <div class="input-group">
        <label>Terminal Growth Rate (%)</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              v-model.number="localInputs.terminalGrowthRate.best"
              type="number"
              step="0.1"
              min="0"
              max="10"
              @input="handleInput('terminalGrowthRate')"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              v-model.number="localInputs.terminalGrowthRate.average"
              type="number"
              step="0.1"
              min="0"
              max="10"
              @input="handleInput('terminalGrowthRate')"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              v-model.number="localInputs.terminalGrowthRate.worst"
              type="number"
              step="0.1"
              min="0"
              max="10"
              @input="handleInput('terminalGrowthRate')"
            />
            <span class="input-suffix">%</span>
          </div>
        </div>
        <span class="input-hint">Perpetual growth rate after projection period</span>
      </div>

      <!-- Discount Rate -->
      <div class="input-group">
        <label>Discount Rate (%)</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              v-model.number="localInputs.discountRate.best"
              type="number"
              step="0.1"
              min="0"
              max="30"
              @input="handleInput('discountRate')"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              v-model.number="localInputs.discountRate.average"
              type="number"
              step="0.1"
              min="0"
              max="30"
              @input="handleInput('discountRate')"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              v-model.number="localInputs.discountRate.worst"
              type="number"
              step="0.1"
              min="0"
              max="30"
              @input="handleInput('discountRate')"
            />
            <span class="input-suffix">%</span>
          </div>
        </div>
        <span class="input-hint">Required rate of return (WACC)</span>
      </div>

      <!-- Projection Period -->
      <div class="input-group">
        <label>Projection Period (Years)</label>
        <div class="single-input">
          <div class="input-wrapper best-case">
            <input
              v-model.number="localInputs.projectionYears"
              type="number"
              step="1"
              min="3"
              max="15"
              @input="handleInput('projectionYears')"
            />
            <span class="input-suffix">yrs</span>
          </div>
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

// Default scenario values
const defaults = {
  peRatio: {
    best: 24,      // 20 + 20%
    average: 20,
    worst: 16      // 20 - 20%
  },
  fcfGrowthRate: {
    best: 12,      // 10 + 20%
    average: 10,
    worst: 8       // 10 - 20%
  },
  terminalGrowthRate: {
    best: 3,       // 2.5 + 20%
    average: 2.5,
    worst: 2       // 2.5 - 20%
  },
  discountRate: {
    best: 8,       // 10 - 20% (lower discount rate is better)
    average: 10,
    worst: 12      // 10 + 20%
  },
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
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.scenario-labels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  padding-left: 0;
}

.scenario-label {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  border-radius: 4px;
}

.scenario-label.best {
  color: #00b894;
  background: rgba(0, 184, 148, 0.1);
}

.scenario-label.average {
  color: #fdcb6e;
  background: rgba(253, 203, 110, 0.1);
}

.scenario-label.worst {
  color: #ff7675;
  background: rgba(255, 118, 117, 0.1);
}

.inputs-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.scenario-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.single-input {
  display: flex;
  width: 100%;
}

.single-input .input-wrapper {
  flex: 1;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 8px 28px 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 89, 76, 0.3);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

/* Best case - Green border */
.input-wrapper.best-case input {
  border-color: rgba(0, 184, 148, 0.5);
}

.input-wrapper.best-case input:focus {
  outline: none;
  border-color: #00b894;
  background: rgba(0, 184, 148, 0.05);
  box-shadow: 0 0 0 3px rgba(0, 184, 148, 0.1);
}

/* Average case - Yellow border */
.input-wrapper.average-case input {
  border-color: rgba(253, 203, 110, 0.5);
}

.input-wrapper.average-case input:focus {
  outline: none;
  border-color: #fdcb6e;
  background: rgba(253, 203, 110, 0.05);
  box-shadow: 0 0 0 3px rgba(253, 203, 110, 0.1);
}

/* Worst case - Red border */
.input-wrapper.worst-case input {
  border-color: rgba(255, 118, 117, 0.5);
}

.input-wrapper.worst-case input:focus {
  outline: none;
  border-color: #ff7675;
  background: rgba(255, 118, 117, 0.05);
  box-shadow: 0 0 0 3px rgba(255, 118, 117, 0.1);
}

.input-wrapper input:hover {
  background: rgba(0, 0, 0, 0.4);
}

.input-suffix {
  position: absolute;
  right: 8px;
  font-size: 11px;
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
