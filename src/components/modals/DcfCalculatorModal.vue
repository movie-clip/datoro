<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="handleClose"
        @keydown.esc="handleClose"
        tabindex="0"
        ref="overlayRef"
      >
        <div class="modal-container">
          <div class="modal-header">
            <div class="header-content">
              <h2>DCF Calculator</h2>
              <div v-if="companyData" class="company-context">
                <span class="ticker-badge">{{ companyData.ticker }}</span>
                <span class="company-name">{{ companyData.companyName }}</span>
              </div>
            </div>
            <button class="close-button" @click="handleClose" aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Data validation warning -->
            <div v-if="!dataValidation.valid" class="data-warning">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong>Insufficient Data</strong>
                <p>Missing: {{ dataValidation.missingFields.join(', ') }}</p>
              </div>
            </div>

            <div class="dcf-content">
              <!-- Left column: Model Assumptions -->
              <div class="left-column">
                <DcfInputs v-model="inputs" />
              </div>
              
              <!-- Right column: Valuation Results + Chart -->
              <div class="right-column">
                <DcfResults 
                  :intrinsic-value="intrinsicValue"
                  :current-price="companyData?.currentPrice || 0"
                  :upside="upside"
                  class="compact-results"
                />
                
                <DcfForecastChart 
                  :scenarios="scenarios"
                  :current-price="companyData?.currentPrice || 0"
                  :intrinsic-value="intrinsicValue"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { useDcfCalculator } from '../../composables/useDcfCalculator'
import { getDcfDataFromBatch, validateDcfData } from '../../services/dcf/dcfDataService'
import DcfInputs from '../dcf/DcfInputs.vue'
import DcfResults from '../dcf/DcfResults.vue'
import DcfForecastChart from '../dcf/DcfForecastChart.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const overlayRef = ref(null)

// Get ticker data from store
const tickerStore = useTickerStore()
const { batchData, currentTicker } = storeToRefs(tickerStore)

// Extract DCF data from batch
const companyData = computed(() => {
  if (!batchData.value) return null
  return getDcfDataFromBatch(batchData.value)
})

// Validate data
const dataValidation = computed(() => {
  if (!batchData.value) {
    return { valid: false, missingFields: ['No data loaded'] }
  }
  return validateDcfData(batchData.value)
})

// DCF Calculator composable with company data
const { 
  inputs, 
  intrinsicValue, 
  projectedPrices, 
  upside, 
  recommendation,
  enterpriseValue,
  terminalValue,
  scenarios
} = useDcfCalculator(companyData.value)

// Watch for company data changes and update growth rate scenarios
watch(companyData, (newData) => {
  if (newData && newData.historicalGrowthRate) {
    const baseGrowth = newData.historicalGrowthRate
    inputs.value.fcfGrowthRate = {
      best: Math.round(baseGrowth * 1.2 * 10) / 10,
      average: baseGrowth,
      worst: Math.round(baseGrowth * 0.8 * 10) / 10
    }
  }
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A'
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

const handleEscKey = (event) => {
  if (event.key === 'Escape' && props.modelValue) {
    handleClose()
  }
}

// Focus overlay when modal opens for ESC key handling
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      overlayRef.value?.focus()
    }, 100)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'
  } else {
    // Restore body scroll
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  outline: none;
}

.modal-container {
  background: #1a1a1a;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 89, 76, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  flex: 1;
}

.modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.company-context {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.ticker-badge {
  background: rgba(0, 89, 76, 0.2);
  color: #00b894;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
}

.company-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.current-price {
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  margin-left: auto;
}

.close-button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.close-button:active {
  transform: scale(0.95);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.data-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  color: #ffc107;
}

.data-warning svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.data-warning strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.data-warning p {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.dcf-content {
  display: grid !important;
  grid-template-columns: 320px 1fr !important;
  grid-auto-flow: column;
  gap: 24px;
  margin-top: 0px;
  min-height: 600px;
  width: 100%;
}

.left-column {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  width: 320px;
}

.right-column {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevents overflow */
}

.compact-results {
  margin-bottom: 16px;
}

.compact-results :deep(.dcf-results) {
  padding: 0;
  background: transparent;
  border: none;
}

.compact-results :deep(.section-title) {
  display: none;
}

.compact-results :deep(.results-grid) {
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
}

.compact-results :deep(.result-card) {
  padding: 12px 16px;
  min-height: auto;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.compact-results :deep(.result-card:hover) {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.2);
}

.compact-results :deep(.result-card.primary) {
  border-color: rgba(0, 184, 148, 0.4);
  background: rgba(0, 89, 76, 0.15);
}

.compact-results :deep(.card-label) {
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.compact-results :deep(.card-value) {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.compact-results :deep(.result-card.positive .card-value) {
  color: #00b894;
}

.compact-results :deep(.result-card.negative .card-value) {
  color: #ff7675;
}

.compact-results :deep(.card-hint) {
  display: none;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
    height: 100vh;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .dcf-content {
    grid-template-columns: 1fr;
  }
}

/* Custom scrollbar for modal body */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 89, 76, 0.3);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 89, 76, 0.5);
}

/* DCF Content Layout */
.dcf-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 768px) {
  .dcf-content {
    gap: 20px;
  }
}
</style>
