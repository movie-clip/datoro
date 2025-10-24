<template>
  <div class="dcf-inputs">
    <h3 class="section-title">Model Assumptions</h3>
    
    <div class="inputs-grid">
      <!-- Current Company Data (Read-only) -->
      <div class="input-group company-data">
        <div class="company-data-labels">
          <span class="data-label">EPS</span>
          <span class="data-label">P/E</span>
          <span class="data-label">EPS Growth</span>
        </div>
        <div class="scenario-inputs">
          <div class="input-wrapper readonly">
            <div class="readonly-value">{{ formatEps(companyData?.eps) }}</div>
          </div>
          <div class="input-wrapper readonly">
            <div class="readonly-value">{{ formatPE(companyData?.currentPE) }}</div>
          </div>
          <div class="input-wrapper readonly">
            <div class="readonly-value">{{ formatGrowth(companyData?.epsGrowth) }}</div>
          </div>
        </div>
      </div>

    <div class="scenario-labels">
      <span class="scenario-label best">Best</span>
      <span class="scenario-label average">Average</span>
      <span class="scenario-label worst">Worst</span>
    </div>

      <!-- EPS Growth Rate -->
      <div class="input-group">
        <label>EPS Growth Rate (%)</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              :value="modelValue.fcfGrowthRate.best"
              @input="updateField('fcfGrowthRate', 'best', Number($event.target.value))"
              type="number"
              step="0.1"
              min="-50"
              max="100"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              :value="modelValue.fcfGrowthRate.average"
              @input="updateField('fcfGrowthRate', 'average', Number($event.target.value))"
              type="number"
              step="0.1"
              min="-50"
              max="100"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              :value="modelValue.fcfGrowthRate.worst"
              @input="updateField('fcfGrowthRate', 'worst', Number($event.target.value))"
              type="number"
              step="0.1"
              min="-50"
              max="100"
            />
            <span class="input-suffix">%</span>
          </div>
        </div>
        <span class="input-hint">Annual earnings per share growth rate</span>
      </div>

      <!-- Target P/E Ratio -->
      <div class="input-group">
        <label>Target P/E Ratio</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              :value="modelValue.peRatio.best"
              @input="updateField('peRatio', 'best', Number($event.target.value))"
              type="number"
              step="0.5"
              min="0"
              max="100"
            />
            <span class="input-suffix">x</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              :value="modelValue.peRatio.average"
              @input="updateField('peRatio', 'average', Number($event.target.value))"
              type="number"
              step="0.5"
              min="0"
              max="100"
            />
            <span class="input-suffix">x</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              :value="modelValue.peRatio.worst"
              @input="updateField('peRatio', 'worst', Number($event.target.value))"
              type="number"
              step="0.5"
              min="0"
              max="100"
            />
            <span class="input-suffix">x</span>
          </div>
        </div>
        <span class="input-hint">Price-to-earnings multiple for valuation</span>
      </div>

      <!-- Expected Return -->
      <div class="input-group">
        <label>Expected Return (%)</label>
        <div class="scenario-inputs">
          <div class="input-wrapper best-case">
            <input
              :value="modelValue.discountRate.best"
              @input="updateField('discountRate', 'best', Number($event.target.value))"
              type="number"
              step="0.1"
              min="0"
              max="30"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper average-case">
            <input
              :value="modelValue.discountRate.average"
              @input="updateField('discountRate', 'average', Number($event.target.value))"
              type="number"
              step="0.1"
              min="0"
              max="30"
            />
            <span class="input-suffix">%</span>
          </div>
          <div class="input-wrapper worst-case">
            <input
              :value="modelValue.discountRate.worst"
              @input="updateField('discountRate', 'worst', Number($event.target.value))"
              type="number"
              step="0.1"
              min="0"
              max="30"
            />
            <span class="input-suffix">%</span>
          </div>
        </div>
        <span class="input-hint">Target annualized return rate</span>
      </div>

      <!-- Projection Period -->
      <div class="input-group">
        <label>Projection Period (Years)</label>
        <div class="single-input">
          <div class="input-wrapper best-case">
            <input
              :value="modelValue.projectionYears"
              @input="updateField('projectionYears', null, Number($event.target.value))"
              type="number"
              step="1"
              min="3"
              max="10"
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
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  companyData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

// Format company data for display
const formatEps = (eps) => {
  if (eps === null || eps === undefined) return 'N/A'
  return `$${Number(eps).toFixed(1)}`
}

const formatPE = (pe) => {
  if (pe === null || pe === undefined || pe <= 0) return 'N/A'
  return `${Number(pe).toFixed(1)}`
}

const formatGrowth = (growth) => {
  if (growth === null || growth === undefined) return 'N/A'
  const value = Number(growth).toFixed(1)
  return `${value}%`
}

// Default scenario values for reset function
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

// Validation constraints
const constraints = {
  peRatio: { min: 0, max: 100 },
  fcfGrowthRate: { min: -50, max: 100 },
  terminalGrowthRate: { min: 0, max: 10 },
  discountRate: { min: 0, max: 30 },
  projectionYears: { min: 3, max: 10 }
}

// Update nested field and emit entire object (triggers parent reactivity)
const updateField = (field, scenario, value) => {
  // Validate value against constraints
  const constraint = constraints[field]
  let validatedValue = value
  
  if (constraint) {
    if (value < constraint.min) validatedValue = constraint.min
    if (value > constraint.max) validatedValue = constraint.max
  }
  
  const updated = { ...props.modelValue }
  if (scenario) {
    // Update scenario-based field
    updated[field] = { ...updated[field], [scenario]: validatedValue }
  } else {
    // Update simple field (projectionYears)
    updated[field] = validatedValue
  }
  emit('update:modelValue', updated)
}

const resetToDefaults = () => {
  emit('update:modelValue', { ...defaults })
}
</script>

<style scoped>
.dcf-inputs {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(0, 89, 76, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
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

/* Company Data Section - Styled like regular inputs with green border */
.company-data-labels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 6px;
}

.data-label {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.7);
}

.input-wrapper.readonly {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 184, 148, 0.5);
  border-radius: 6px;
  padding: 8px 10px;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.readonly-value {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  width: 100%;
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
