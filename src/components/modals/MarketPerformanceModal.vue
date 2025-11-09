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
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Market Performance
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
            <div class="body-layout">
              <!-- Left Sidebar - Index Selector -->
              <div class="sidebar">
                <h3 class="sidebar-title">Market Index</h3>
                <div class="index-buttons">
                  <button
                    v-for="index in marketIndices"
                    :key="index.value"
                    :class="['index-button', { active: selectedIndex === index.value }]"
                    :disabled="loading"
                    @click="handleIndexChange(index.value)"
                  >
                    <span class="index-label">{{ index.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Main Content Area -->
              <div class="main-content">
            <!-- Error Message -->
            <div v-if="error" class="error-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ error }}</span>
            </div>

            <!-- Index Price Chart -->
            <!-- Chart shows 20 years of historical data with interactive scrollbar -->
            <SP500PriceChart 
              :period="'20Y'"
              :index="selectedIndex"
              @range-change="handleCustomRangeChange"
            />

            <!-- Heatmap Chart Component -->
            <!-- Note: Sector data currently only available for S&P 500 -->
            <!-- Future: Add sector breakdowns for NASDAQ/Russell if API provides them -->
            <MarketHeatmapChart 
              :data="heatmapData"
              :sp500="sp500Data"
              :loading="loading"
            />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import MarketHeatmapChart from '../charts/MarketHeatmapChart.vue'
import SP500PriceChart from '../charts/SP500PriceChart.vue'
import { useMarketPerformance } from '../../composables/useMarketPerformance'
import type { SectorData } from '../../services/market/marketPerformanceService'

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

// Market index options
interface MarketIndex {
  label: string
  value: string
  symbol: string
}

const marketIndices: MarketIndex[] = [
  { label: 'S&P 500', value: 'SPX', symbol: '^GSPC' },
  { label: 'NASDAQ', value: 'NASDAQ', symbol: '^IXIC' },
  { label: 'Russell 2000', value: 'RUSSELL', symbol: '^RUT' }
]

const selectedIndex = ref('SPX')
let customRangeAbortController: AbortController | null = null

// Use market performance composable
const { 
  heatmapData,
  sp500Data,
  summary, 
  loading, 
  error, 
  lastUpdate,
  currentPeriod,
  isCustomRange,
  fetchData,
  updateWithCustomRange
} = useMarketPerformance()

// Handle index change
function handleIndexChange(index: string) {
  selectedIndex.value = index
  console.log(`[Market Performance Modal] Index changed to: ${index}`)
  // TODO: Implement index-specific data fetching
}

// Handle modal close
function handleClose() {
  emit('update:modelValue', false)
}

// Handle overlay clicks (only close if both mousedown and click on overlay)
function handleOverlayMouseDown(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    mouseDownOnOverlay.value = true
  } else {
    mouseDownOnOverlay.value = false
  }
}

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget && mouseDownOnOverlay.value) {
    handleClose()
  }
  mouseDownOnOverlay.value = false
}

// Handle custom range change from price chart
async function handleCustomRangeChange(range: { start: string; end: string }) {
  try {
    // Validate date range
    if (!range.start || !range.end) {
      console.warn('[Market Performance Modal] Invalid date range:', range)
      return
    }
    
    const startDate = new Date(range.start)
    const endDate = new Date(range.end)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('[Market Performance Modal] Invalid date format:', range)
      error.value = 'Invalid date format'
      return
    }
    
    if (startDate >= endDate) {
      console.warn('[Market Performance Modal] Start date must be before end date')
      error.value = 'Invalid date range: Start date must be before end date'
      return
    }
    
    // Cancel any pending custom range request
    if (customRangeAbortController) {
      customRangeAbortController.abort()
    }
    
    // Create new abort controller for this request
    customRangeAbortController = new AbortController()
    
    loading.value = true
    error.value = null
    
    // Fetch sector performance for custom date range
    const url = `http://localhost:7071/api/market/sectors/custom-range?startDate=${range.start}&endDate=${range.end}`
    
    const response = await fetch(url, { 
      signal: customRangeAbortController.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error'
      throw new Error(`Failed to fetch sector data: ${response.status} ${statusText}`)
    }
    
    const data = await response.json()
    
    // Validate response data
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No sector data available for this date range')
    }
    
    // Convert API data to SectorData format
    const customSectors: SectorData[] = data
      .map((sector: any) => {
        if (!sector.sector || !sector.changesPercentage) {
          return null
        }
        
        // Parse percentage string (e.g., "74.67%" -> 74.67)
        const percentageStr = String(sector.changesPercentage).replace('%', '')
        const performance = parseFloat(percentageStr)
        
        if (isNaN(performance)) {
          return null
        }
        
        return {
          sector: sector.sector,
          performance: performance,
          totalMarketCap: Math.abs(performance) * 100000000000 // Scaled value
        }
      })
      .filter((s): s is SectorData => s !== null) // Type-safe filter
    
    if (customSectors.length === 0) {
      throw new Error('No valid sector data received')
    }
    
    // Update heatmap with custom range data
    updateWithCustomRange(customSectors)
    console.log(`[Market Performance Modal] Updated heatmap with ${customSectors.length} sectors for range ${range.start} to ${range.end}`)
    
    loading.value = false
  } catch (err) {
    // Ignore abort errors (expected when request is cancelled)
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }
    
    console.error('[Market Performance Modal] Error fetching custom range data:', err)
    
    // Handle specific error types
    if (err instanceof TypeError && err.message.includes('fetch')) {
      error.value = 'Network error: Unable to connect to server'
    } else if (err instanceof Error && err.message.includes('No sector data')) {
      error.value = 'No data available for this date range'
    } else if (err instanceof Error && err.message.includes('Invalid date')) {
      error.value = 'Invalid date range selected'
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to load custom range data'
    }
    
    loading.value = false
  }
}

// Focus overlay when modal opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    // Fetch data when modal opens (default to 1D performance)
    if (heatmapData.value.length === 0) {
      fetchData(false, '1D')
    }
    
    // Focus overlay for keyboard events
    setTimeout(() => {
      overlayRef.value?.focus()
    }, 100)
  }
})

// Handle escape key
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    handleClose()
  }
}
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
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 1400px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid #2A2A2E;
}

/* ============================================ */
/* MODAL HEADER */
/* ============================================ */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #2A2A2E;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #E5E5E5;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #00A88E;
  width: 20px;
  height: 20px;
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
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* Custom scrollbar for modal body */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(42, 42, 46, 0.3);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 117, 95, 0.5);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 168, 142, 0.7);
}

/* ============================================ */
/* BODY LAYOUT (Sidebar + Main Content) */
/* ============================================ */
.body-layout {
  display: flex;
  gap: 24px;
  height: 100%;
}

/* ============================================ */
/* SIDEBAR - Index Selector */
/* ============================================ */
.sidebar {
  flex-shrink: 0;
  width: 220px;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #2A2A2E;
}

.sidebar-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #E5E5E5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.index-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.index-button {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #2A2A2E;
  color: rgba(255, 255, 255, 0.7);
  padding: 14px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.index-button:hover:not(:disabled) {
  background: rgba(0, 168, 142, 0.1);
  border-color: rgba(0, 168, 142, 0.3);
  color: #00A88E;
  transform: translateX(4px);
}

.index-button.active {
  background: linear-gradient(135deg, rgba(0, 168, 142, 0.15) 0%, rgba(0, 117, 95, 0.15) 100%);
  border-color: #00A88E;
  color: #00A88E;
  font-weight: 600;
}

.index-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.index-label {
  display: block;
}

/* ============================================ */
/* MAIN CONTENT AREA */
/* ============================================ */
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.green-text {
  color: #00C087;
  font-weight: 600;
}

.red-text {
  color: #ef4444;
  font-weight: 600;
}

/* ============================================ */
/* ERROR MESSAGE */
/* ============================================ */
.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #EF4444;
  border-radius: 8px;
  color: #EF4444;
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
/* RESPONSIVE DESIGN */
/* ============================================ */
@media (max-width: 1024px) {
  .body-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .index-buttons {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .index-button {
    flex: 1;
    min-width: 150px;
  }
}

@media (max-width: 768px) {
  .modal-container {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .modal-body {
    padding: 16px;
  }

  .header-content h2 {
    font-size: 18px;
  }

  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
