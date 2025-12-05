<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="close"
        @wheel.prevent
      >
        <div
          class="modal-container"
          @click.stop
        >
          <div class="modal-header">
            <div class="header-content">
              <h2>
                <img 
                  v-if="companyIcon" 
                  :src="companyIcon" 
                  :alt="ticker"
                  class="company-icon"
                  @error="handleImageError"
                >
                <div
                  v-else-if="ticker"
                  class="company-icon-placeholder"
                >
                  {{ ticker.substring(0, 1).toUpperCase() }}
                </div>
                <span class="chart-title">{{ title }}</span>
              </h2>
            </div>
            <button
              class="close-button"
              aria-label="Close modal"
              @click="close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                />
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  isOpen: boolean
  title?: string
  ticker?: string
  companyIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Chart',
  ticker: '',
  companyIcon: ''
})

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

const imageError = ref(false)

const close = (): void => emit('close')

const handleImageError = (): void => {
  imageError.value = true
}

// Prevent body scroll when modal is open
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  position: relative;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  width: 100%;
  max-width: 1400px;
  max-height: 90vh;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  border-bottom: 1px solid #2A2A2E;
  background: rgba(21, 21, 24, 0.6);
  flex-shrink: 0;
}

.header-content h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #E5E5E5;
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-icon {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
}

.company-icon-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(84, 112, 198, 0.2);
  border: 1px solid rgba(84, 112, 198, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #5470C6;
  font-size: 0.9rem;
}

.chart-title {
  color: #E5E5E5;
}

.close-button {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(42, 42, 42, 0.6);
  color: rgba(229, 229, 229, 0.7);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-button:hover {
  background: rgba(42, 42, 42, 0.9);
  color: #E5E5E5;
  border-color: rgba(255, 255, 255, 0.2);
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
  overflow: hidden; /* Prevent scrollbars for chart modals */
  flex: 1;
  min-height: 0;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-container {
    border-radius: 8px;
  }
  
  .modal-header {
    padding: 16px 20px;
  }

  .header-content h2 {
    font-size: 1.25rem;
  }

  .company-icon,
  .company-icon-placeholder {
    width: 28px;
    height: 28px;
  }
  
  .close-button {
    width: 32px;
    height: 32px;
  }

  .close-button svg {
    width: 18px;
    height: 18px;
  }

  .modal-body {
    padding: 20px;
  }
}

/* iPhone 12-16 Portrait (390px-430px) */
@media (max-width: 430px) {
  .modal-overlay {
    padding: 12px;
  }

  .modal-container {
    max-height: 85vh;
    border-radius: 12px;
  }

  .modal-header {
    padding: 14px 16px;
  }

  .header-content h2 {
    font-size: 1.1rem;
    gap: 10px;
  }

  .company-icon,
  .company-icon-placeholder {
    width: 26px;
    height: 26px;
  }

  .modal-body {
    padding: 16px;
  }

  .close-button {
    width: 44px;
    height: 44px;
  }

  .close-button svg {
    width: 20px;
    height: 20px;
  }
}

/* iPhone 12-16 Landscape */
@media (max-height: 430px) and (orientation: landscape) {
  .modal-overlay {
    padding: 8px;
  }

  .modal-container {
    max-height: 95vh;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .header-content h2 {
    font-size: 1rem;
  }

  .modal-body {
    padding: 12px;
  }

  .close-button {
    width: 40px;
    height: 40px;
  }
}
</style>
