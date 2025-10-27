<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="close"
      >
        <div
          class="modal-container"
          @click.stop
        >
          <button
            class="close-btn"
            aria-label="Close"
            @click="close"
          >
            ×
          </button>
          <div class="modal-content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

const close = (): void => emit('close')

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
  overflow: hidden;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(42, 42, 42, 0.6);
  color: rgba(229, 229, 229, 0.7);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  border-radius: 6px;
  z-index: 10;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(42, 42, 42, 0.9);
  color: #E5E5E5;
  border-color: rgba(255, 255, 255, 0.2);
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
  max-height: 90vh;
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

/* Mobile responsive - smaller close button */
@media (max-width: 768px) {
  .modal-container {
    border-radius: 8px;
  }
  
  .close-btn {
    width: 30px;
    height: 30px;
    font-size: 22px;
    top: 8px;
    right: 8px;
  }
}
</style>
