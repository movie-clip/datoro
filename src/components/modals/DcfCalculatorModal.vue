<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @mousedown="handleOverlayMouseDown"
        @click="handleOverlayClick"
        @keydown.esc="handleClose"
        tabindex="0"
        ref="overlayRef"
      >
        <div class="modal-container" @mousedown.stop>
          <div class="modal-header">
            <div class="header-content">
              <h2>
                DCF Calculator
                <span v-if="companyData" class="company-context">
                  <img 
                    v-if="companyData.image" 
                    :src="companyData.image" 
                    :alt="companyData.ticker"
                    class="company-icon"
                    @error="handleImageError"
                  >
                  <div
                    v-else
                    class="company-icon-placeholder"
                  >
                    {{ companyData.ticker?.substring(0, 1).toUpperCase() }}
                  </div>
                  <span class="company-name">{{ companyData.companyName }}</span>
                  <span v-if="companyData.currentPrice" class="company-price">${{ formatPrice(companyData.currentPrice) }}</span>
                </span>
              </h2>
            </div>
            <button class="close-button" @click="handleClose" aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Loading state -->
            <div v-if="loading" class="data-loading">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                </path>
              </svg>
              <p>Loading financial data...</p>
            </div>

            <!-- Data validation warning -->
            <div v-else-if="!dataValidation.valid" class="data-warning">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong>Insufficient Data</strong>
                <p>{{ error || `Missing: ${dataValidation.missingFields.join(', ')}` }}</p>
              </div>
            </div>

            <div v-else class="dcf-content">
              <!-- Left column: Model Assumptions -->
              <div class="left-column">
                <DcfInputs v-model="inputs" :company-data="companyData" />
              </div>
              
              <!-- Right column: Valuation Results + Chart -->
              <div class="right-column">
                <DcfResults 
                  :intrinsic-value="intrinsicValue"
                  :current-price="companyData?.currentPrice || 0"
                  :upside="upside"
                  :buffett-value="buffettValue"
                  :fmp-dcf-value="fmpDcfValue"
                  :fmp-dcf-loading="fmpDcfLoading"
                  :fmp-dcf-error="fmpDcfError"
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useDcfCalculator } from '../../composables/useDcfCalculator'
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
const mouseDownOnOverlay = ref(false)

// DCF Calculator composable - now self-contained (matches project pattern)
const { 
  inputs,
  buffettInputs,
  intrinsicValue, 
  upside, 
  scenarios,
  buffettValue,
  fmpDcfValue,
  fmpDcfLoading,
  fmpDcfError,
  companyData,
  dataValidation,
  loading,
  error,
  ticker
} = useDcfCalculator()

const handleClose = () => {
  emit('update:modelValue', false)
}

// Track if mousedown started on overlay (not on modal content)
const handleOverlayMouseDown = (event) => {
  mouseDownOnOverlay.value = event.target === event.currentTarget
}

// Only close if both mousedown and click happened on overlay
const handleOverlayClick = (event) => {
  if (mouseDownOnOverlay.value && event.target === event.currentTarget) {
    handleClose()
  }
  mouseDownOnOverlay.value = false
}

const handleEscKey = (event) => {
  if (event.key === 'Escape' && props.modelValue) {
    handleClose()
  }
}

// Handle company logo error
const handleImageError = (event) => {
  event.target.style.display = 'none'
}

// Format price with commas
const formatPrice = (price) => {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  max-width: 1320px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 89, 76, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  flex: 1;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 20px;
}

.company-context {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 400;
}

.company-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: contain;
  background: rgba(229, 229, 229, 0.05);
  border: 1px solid #2A2A2E;
  padding: 2px;
}

.company-icon-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, #00594C 0%, #00755F 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #E5E5E5;
}

.company-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
}

.company-price {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  font-size: 16px;
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
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-left: 12px;
}

.close-button svg {
  width: 20px;
  height: 20px;
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
  padding: 24px 32px;
  min-height: 0;
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

.data-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.data-loading svg {
  color: #00b894;
}

.data-loading p {
  margin: 0;
  font-size: 14px;
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
  grid-template-columns: 340px 2fr !important;
  grid-auto-flow: column;
  gap: 24px;
  margin-top: 0px;
  min-height: 0;
  width: 100%;
  align-items: start;
}

.left-column {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  width: 340px;
  height: 100%;
}

.right-column {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0; /* Prevents overflow */
  height: 100%;
}

.compact-results {
  flex-shrink: 0;
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
