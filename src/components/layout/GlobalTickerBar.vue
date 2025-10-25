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
            ref="inputRef"
            v-model.trim="localInput"
            class="input"
            type="text"
            placeholder="e.g., AAPL"
            maxlength="10"
            :aria-invalid="!!validationError"
            :aria-describedby="validationError ? 'ticker-error' : undefined"
            @keyup.enter="handleEnterKey"
            @input="handleInputChange"
            @focus="showDropdown = true"
            @blur="handleBlur"
          >
          <span
            v-if="validationError"
            class="error-icon"
            title="Invalid ticker"
          >⚠️</span>
          
          <!-- Search Results Dropdown - Optimized rendering -->
          <div
            v-if="showDropdown && (searching || searchResults.length > 0)"
            class="search-dropdown"
            role="listbox"
            @mousedown.prevent
          >
            <div 
              v-if="searching" 
              class="search-loading"
              role="status"
              aria-live="polite"
            >
              <div class="loading-spinner-container">
                <div class="loading-spinner-dot"></div>
                <span>Searching...</span>
              </div>
            </div>
            <button
              v-else
              v-for="result in searchResults"
              :key="result.symbol"
              type="button"
              class="search-result"
              role="option"
              :aria-label="`Select ${result.symbol} - ${result.name}`"
              @click="selectTicker(result.symbol)"
            >
              <div class="result-left">
                <div class="result-symbol">{{ result.symbol }}</div>
              </div>
              <div class="result-right">
                <div class="result-name">{{ result.name }}</div>
                <div v-if="result.exchange" class="result-exchange">{{ result.exchange }}</div>
              </div>
            </button>
          </div>
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

      <!-- Ticker History (Desktop only) -->
      <div v-if="isStandalone && tickerHistory.length > 0" class="ticker-history">
        <button
          v-for="ticker in tickerHistory"
          :key="ticker"
          class="history-ticker-btn"
          @click="selectHistoryTicker(ticker)"
          :title="`Switch to ${ticker}`"
        >
          {{ ticker }}
        </button>
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
import { ref, watch, onUnmounted } from 'vue'
import CompanyHeader from './CompanyHeader.vue'
import { useTickerSearch } from '../../composables/useTickerSearch'
import { usePlatform } from '../../composables/usePlatform'
import { useTickerHistory } from '../../composables/useTickerHistory'

const companyProfile = ref(null)

// Platform detection
const { isStandalone } = usePlatform()

// Ticker history
const { tickerHistory, addToHistory } = useTickerHistory()

// Debug logging
watch([isStandalone, tickerHistory], ([standalone, history]) => {
  console.log('[TickerHistory Debug]', {
    isStandalone: standalone,
    historyLength: history.length,
    history: history
  })
}, { immediate: true, deep: true })

// Props used in template (ESLint can't detect template usage)
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  confirmedTicker: { type: String, default: '' }
})

const model = defineModel()
const emit = defineEmits(['submit', 'update:companyName'])

const localInput = ref(model.value || '')
const validationError = ref('')
const showDropdown = ref(false)
const inputRef = ref(null)

// Search functionality with cleanup
const { searchResults, searching, searchTickers, clearSearch, cleanup } = useTickerSearch()

// Cleanup on component unmount
onUnmounted(() => {
  cleanup()
})

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

const handleInputChange = () => {
  validateInput()
  
  // Trigger search if input is valid and at least 1 character
  const value = localInput.value.trim()
  if (value.length >= 1 && !validationError.value) {
    searchTickers(value)
    showDropdown.value = true
  } else {
    clearSearch()
    showDropdown.value = false
  }
}

const selectTicker = (symbol) => {
  localInput.value = symbol
  model.value = symbol
  showDropdown.value = false
  clearSearch()
  
  // Hide virtual keyboard on mobile
  if (inputRef.value) {
    inputRef.value.blur()
  }
  
  // Add to history
  addToHistory(symbol)
  
  emit('submit')
}

const handleBlur = () => {
  // Delay hiding dropdown to allow click events to fire
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

const handleEnterKey = () => {
  // If there are search results, select the first one
  if (searchResults.value && searchResults.value.length > 0) {
    selectTicker(searchResults.value[0].symbol)
    return
  }
  
  // Otherwise, proceed with normal submit
  handleSubmit()
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
  showDropdown.value = false
  clearSearch()
  
  // Hide virtual keyboard on mobile
  if (inputRef.value) {
    inputRef.value.blur()
  }
  
  // Add to history
  addToHistory(value)
  
  emit('submit')
}

// Handle clicking a ticker from history
const selectHistoryTicker = (ticker) => {
  localInput.value = ticker
  model.value = ticker
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
  gap: 0; 
  align-items: stretch; 
  width: 100%;
  justify-content: space-between;
  min-height: 72px; /* Ensure consistent height even when components reload */
}

.ticker-input-section {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-radius: 10px;
  border: 1px solid #2A2A2E;
  width: calc((100% - 20px) / 2.5 * 1.5);
  position: relative;
  flex-wrap: wrap;
  transition: all 0.2s;
  min-height: 72px; /* Fixed minimum height to match company header */
}

.ticker-input-section:hover {
  border-color: #00594C;
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.2);
}

.ticker-input-section.has-error {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
}

/* Ticker History */
.ticker-history {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
  margin: 10px;
}

.history-ticker-btn {
  padding: 10px 16px;
  background: rgba(0, 89, 76, 0.02);
  border: 1px solid rgba(0, 89, 76, 0.3);
  border-radius: 8px;
  color: #00705f;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: 80px;
  text-align: center;
}

.history-ticker-btn:hover {
  border-color: rgba(0, 89, 76, 0.5);
  transform: translateY(-1px);
}

.history-ticker-btn:active {
  transform: scale(0.95);
  background: rgba(0, 89, 76, 0.3);
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
  flex: 1.05;
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
  font-size: 16px; /* Prevent mobile zoom on focus */
}

.input:focus { 
  border-color: #00594C; 
  box-shadow: 0 0 0 3px rgba(0, 89, 76, 0.3); 
  background: rgba(15, 15, 16, 0.8);
}

/* Search Dropdown */
.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #151518 0%, #1A1A1D 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.search-loading {
  padding: 16px;
  text-align: center;
  background: linear-gradient(135deg, rgba(0, 168, 142, 0.05) 0%, rgba(0, 168, 142, 0.02) 100%);
  border-bottom: 1px solid rgba(0, 168, 142, 0.1);
}

.loading-spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #00A88E;
  font-size: 14px;
  font-weight: 500;
}

.loading-spinner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00A88E;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(0, 168, 142, 0.5);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.search-result {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(42, 42, 46, 0.5);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  text-align: left;
  width: 100%;
}

.search-result:last-child {
  border-bottom: none;
}

.search-result:hover {
  background: rgba(0, 168, 142, 0.1);
  border-color: rgba(0, 168, 142, 0.2);
}

.result-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.result-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
  overflow: hidden;
}

.result-symbol {
  font-weight: 600;
  font-size: 15px;
  color: #00A88E;
  min-width: 60px;
}

.result-name {
  font-size: 13px;
  color: #E5E5E5;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.result-exchange {
  font-size: 11px;
  color: #9E9E9E;
  text-transform: uppercase;
  padding: 2px 8px;
  background: rgba(158, 158, 158, 0.1);
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
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
    flex-direction: column;
    gap: 12px;
    min-height: auto; /* Allow natural height on mobile */
  }

  .ticker-input-section {
    width: 100%;
    padding: 8px 12px;
    gap: 8px;
    min-height: 56px; /* Smaller but still fixed on mobile */
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
