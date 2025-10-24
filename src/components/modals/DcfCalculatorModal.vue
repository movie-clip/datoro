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
            <h2>DCF Calculator</h2>
            <button class="close-button" @click="handleClose" aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="dcf-content">
              <DcfInputs v-model="inputs" />
              <DcfResults 
                :intrinsic-value="intrinsicValue"
                :current-price="currentPrice"
                :upside="upside"
                :recommendation="recommendation"
              />
              <DcfForecastChart 
                :projected-prices="projectedPrices"
                :current-price="currentPrice"
                :intrinsic-value="intrinsicValue"
              />
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

// DCF Calculator composable
const currentPrice = ref(100) // TODO: Get from ticker data
const { inputs, intrinsicValue, projectedPrices, upside, recommendation } = useDcfCalculator(currentPrice)

const handleClose = () => {
  emit('update:modelValue', false)
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

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
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
