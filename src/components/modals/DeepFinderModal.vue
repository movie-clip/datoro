<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        ref="overlayRef"
        class="modal-overlay"
        tabindex="0"
        @mousedown="handleOverlayMouseDown"
        @click="handleOverlayClick"
        @keydown.esc="handleClose"
      >
        <div
          class="modal-container"
          @mousedown.stop
        >
          <div class="modal-header">
            <div class="header-content">
              <h2>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                  class="header-icon"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                  />
                  <path d="m21 21-4.35-4.35" />
                  <line
                    x1="8"
                    y1="11"
                    x2="14"
                    y2="11"
                  />
                  <line
                    x1="11"
                    y1="8"
                    x2="11"
                    y2="14"
                  />
                </svg>
                Deep Finder
              </h2>
            </div>
            <button
              class="close-button"
              aria-label="Close modal"
              @click="handleClose"
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
            <!-- Description and Watchlist Selector Row -->
            <div class="controls-row">
              <!-- Description -->
              <div class="description">
                <p>
                  <strong class="oversold">Red bars</strong> indicate stocks below MA200 (oversold), 
                  <strong class="overbought">green bars</strong> show stocks above MA200 (overbought).
                </p>
              </div>

              <!-- Watchlist Selector -->
              <div class="watchlist-selector-wrapper">
                <BaseDropdown
                  v-model="selectedWatchlistId"
                  :options="watchlistOptions"
                  :show-default-icon="true"
                  @update:model-value="handleWatchlistChange"
                />
              </div>
            </div>

            <!-- Chart Component -->
            <DeepFinderChart :tickers="currentWatchlistTickers" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import DeepFinderChart from '../charts/DeepFinderChart.vue'
import BaseDropdown, { type DropdownOption } from '../common/BaseDropdown.vue'
import { useWatchlists } from '../../composables/useWatchlists'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const emit = defineEmits<Emits>()

const overlayRef = ref<HTMLDivElement | null>(null)
const mouseDownOnOverlay = ref(false)

// Get all watchlists and items
const { 
  watchlists, 
  activeWatchlistId,
  items,
  selectWatchlist
} = useWatchlists()

// Track selected watchlist (default to active)
const selectedWatchlistId = ref<string>(activeWatchlistId.value || '')

// Convert watchlists to dropdown options
const watchlistOptions = computed<DropdownOption[]>(() => {
  return watchlists.value.map(watchlist => ({
    label: watchlist.name,
    value: watchlist.id
  }))
})

// Get tickers for current (active) watchlist
const currentWatchlistTickers = computed(() => {
  return items.value.map(item => item.ticker)
})

// Handle watchlist change
const handleWatchlistChange = async (id: string) => {
  selectedWatchlistId.value = id
  await selectWatchlist(id)
}

// Watch for active watchlist changes and update selected
watch(activeWatchlistId, (newId) => {
  if (newId) {
    selectedWatchlistId.value = newId
  }
})

const handleClose = (): void => {
  emit('update:modelValue', false)
}

// Track if mousedown started on overlay (not on modal content)
const handleOverlayMouseDown = (event: MouseEvent): void => {
  mouseDownOnOverlay.value = event.target === event.currentTarget
}

// Only close if both mousedown and click happened on overlay
const handleOverlayClick = (event: MouseEvent): void => {
  if (event.target === event.currentTarget && mouseDownOnOverlay.value) {
    handleClose()
  }
}

// Focus overlay on mount for keyboard navigation
onMounted(() => {
  // Set selected watchlist to active on mount
  if (activeWatchlistId.value) {
    selectedWatchlistId.value = activeWatchlistId.value
  }
  
  if (overlayRef.value) {
    overlayRef.value.focus()
  }
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  // Restore body scroll
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ============================================ */
/* MODAL OVERLAY & CONTAINER */
/* ============================================ */
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
  position: relative;
  border: 1px solid rgba(0, 89, 76, 0.2);
}

/* ============================================ */
/* MODAL HEADER */
/* ============================================ */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #00C087;
  width: 20px;
  height: 20px;
}

.subtitle {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 8px;
}

/* ============================================ */
/* CLOSE BUTTON */
/* ============================================ */
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

/* ============================================ */
/* MODAL BODY */
/* ============================================ */
.modal-body {
  padding: 24px 32px;
  overflow-y: auto;
  flex: 1;
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

/* ============================================ */
/* CONTROLS ROW (Description + Watchlist Selector) */
/* ============================================ */
.controls-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
}

/* ============================================ */
/* DESCRIPTION */
/* ============================================ */
.description {
  flex: 1;
  padding: 12px 16px;
  background: rgba(0, 89, 76, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(0, 192, 135, 0.15);
}

.description p {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  line-height: 1.5;
}

/* ============================================ */
/* WATCHLIST SELECTOR WRAPPER */
/* ============================================ */
.watchlist-selector-wrapper {
  flex-shrink: 0;
  min-width: 200px;
}

/* ============================================ */
/* DESCRIPTION TEXT STYLING */
/* ============================================ */
.description strong.oversold {
  color: #EF4444;
  font-weight: 600;
}

.description strong.overbought {
  color: #00C087;
  font-weight: 600;
}

/* ============================================ */
/* MODAL TRANSITIONS */
/* ============================================ */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

/* ============================================ */
/* RESPONSIVE - MOBILE */
/* ============================================ */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-start;
  }

  .modal-container {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
    height: 100vh;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .header-content h2 {
    font-size: 18px;
  }

  .subtitle {
    display: none;
  }

  .modal-body {
    padding: 16px;
  }

  .description {
    padding: 14px 16px;
  }
}

@media (max-width: 480px) {
  .header-content h2 {
    font-size: 16px;
    gap: 8px;
  }

  .header-icon {
    width: 18px;
    height: 18px;
  }
}
</style>
