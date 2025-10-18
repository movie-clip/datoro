<template>
  <div>
    <div class="toolbar">
      <div
        class="ticker-input-section"
        :class="{ 'has-error': validationError }"
      >
        <label
          class="label"
          for="ticker"
        >Ticker</label>
        <div class="input-wrapper">
          <input
            id="ticker"
            v-model.trim="localInput"
            class="input"
            type="text"
            placeholder="e.g., AAPL"
            maxlength="10"
            :aria-invalid="!!validationError"
            :aria-describedby="validationError ? 'ticker-error' : undefined"
            @keyup.enter="handleSubmit"
            @input="validateInput"
          >
          <span
            v-if="validationError"
            class="error-icon"
            title="Invalid ticker"
          >⚠️</span>
        </div>
        <button
          class="btn"
          :disabled="!!validationError"
          @click="handleSubmit"
        >
          Search
        </button>
        <span
          v-if="validationError"
          id="ticker-error"
          class="error-message"
        >
          {{ validationError }}
        </span>
      </div>
      <CompanyHeader 
        v-if="confirmedTicker" 
        :ticker="confirmedTicker" 
        @update:company-name="$emit('update:companyName', $event)"
        @update:companyProfile="companyProfile = $event"
      />
    </div>
    <!-- TODO: uncomment to show company description  -->
    <!-- <div v-if="companyProfile && companyProfile.description" class="company-description">
      {{ companyProfile.description }}
    </div> -->
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import CompanyHeader from './CompanyHeader.vue'

const companyProfile = ref(null)

// Props used in template (ESLint can't detect template usage)
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  confirmedTicker: { type: String, default: '' }
})

const model = defineModel()
const emit = defineEmits(['submit', 'update:companyName'])

const localInput = ref(model.value || '')
const validationError = ref('')

// Validate ticker format: 1-10 uppercase letters/numbers, no special chars except dots
const validateInput = () => {
  // Automatically uppercase the input as user types
  localInput.value = localInput.value.toUpperCase()
  
  const value = localInput.value.trim()
  
  if (!value) {
    validationError.value = ''
    return
  }
  
  // Allow only letters, numbers, and dots (for some stocks like BRK.A)
  if (!/^[A-Z0-9.]+$/i.test(value)) {
    validationError.value = 'Only letters, numbers, and dots allowed'
    return
  }
  
  if (value.length > 10) {
    validationError.value = 'Max 10 characters'
    return
  }
  
  validationError.value = ''
}

const handleSubmit = () => {
  const value = localInput.value.trim().toUpperCase()
  
  if (!value) {
    validationError.value = 'Please enter a ticker symbol'
    return
  }
  
  if (validationError.value) {
    return // Don't submit if there's an error
  }
  
  model.value = value
  localInput.value = value
  emit('submit')
}

// Sync model changes back to local input
watch(() => model.value, (newVal) => {
  localInput.value = newVal || ''
})
</script>

<style scoped>
.toolbar { 
  display: flex; 
  gap: 16px; 
  align-items: stretch; 
  max-width: 1200px; 
  margin: 0 auto; 
}

.ticker-input-section {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-radius: 10px;
  border: 1px solid #2A2A2E;
  flex: 1;
  position: relative;
  flex-wrap: wrap;
  transition: all 0.2s;
}

.ticker-input-section:hover {
  border-color: #00594C;
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.2);
}

.ticker-input-section.has-error {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
}

.label { 
  font-size: 12px; 
  color: #E5E5E5;
  opacity: 0.85; 
  white-space: nowrap;
  font-weight: 500;
}

.input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.input {
  flex: 1;
  padding: 10px 12px; 
  border-radius: 10px;
  border: 1px solid #2A2A2E; 
  background: rgba(15, 15, 16, 0.5); 
  color: #E5E5E5;
  outline: none; 
  transition: all 0.2s;
  text-transform: uppercase;
}

.input:focus { 
  border-color: #00594C; 
  box-shadow: 0 0 0 3px rgba(0, 89, 76, 0.3); 
  background: rgba(15, 15, 16, 0.8);
}

.input[aria-invalid="true"] {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.error-icon {
  position: absolute;
  right: 10px;
  font-size: 16px;
  pointer-events: none;
}

.error-message {
  width: 100%;
  font-size: 11px;
  color: #ef4444;
  margin-top: -6px;
  margin-left: 60px;
}

.btn {
  padding: 10px 20px; 
  border-radius: 10px; 
  border: 1px solid #00594C;
  background: #00594C; 
  color: #E5E5E5; 
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) { 
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 89, 76, 0.5);
  background: #007060;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .toolbar {
    gap: 8px;
  }

  .ticker-input-section {
    padding: 8px 12px;
    gap: 8px;
  }

  .label {
    font-size: 11px;
  }

  .input {
    padding: 8px 10px;
    font-size: 14px;
  }

  .btn {
    padding: 8px 16px;
    font-size: 14px;
  }

  .error-message {
    font-size: 10px;
    margin-left: 50px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    flex-direction: column;
  }

  .ticker-input-section {
    width: 100%;
  }

  .input {
    min-width: 0; /* Allow input to shrink */
  }

  .btn {
    width: 100%;
  }
}
</style>
