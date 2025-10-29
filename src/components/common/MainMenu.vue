<template>
  <div class="main-menu-overlay" :class="{ 'is-open': isOpen }" @click="emit('close')">
    <div class="main-menu" :class="{ 'is-open': isOpen }" @click.stop>
      <!-- Header -->
      <div class="menu-header">
        <div class="menu-title-section">
          <!-- Back button (only show in watchlist view) -->
          <button 
            v-if="currentView === 'watchlist'" 
            class="back-button" 
            @click="currentView = 'menu'"
            title="Back to menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <img 
            v-if="currentView === 'menu'"
            src="/logo.png" 
            :alt="`${BRAND.name} Logo`"
            class="menu-logo"
          >
          <span class="menu-title">{{ currentView === 'menu' ? 'Menu' : 'Watchlist' }}</span>
        </div>
        <!-- Close button removed - watchlist dropdown will replace header controls -->
      </div>

      <!-- Menu Content Container with animation -->
      <div class="menu-content-container">
        <!-- Menu Content (Main View) -->
        <Transition name="slide-left">
          <div v-if="currentView === 'menu'" key="menu" class="menu-content">
            <!-- Watchlist Button -->
            <button 
              v-if="isAuthenticated"
              class="menu-item" 
              @click="showWatchlist"
            >
              <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>Watchlist</span>
            </button>

            <!-- DCF Calculator Button -->
            <button 
              class="menu-item" 
              @click="showDcfCalculator"
            >
              <img 
                class="menu-item-icon" 
                src="/icons/dcf.png" 
                alt="DCF Calculator"
                loading="eager"
                decoding="async"
              >
              <span>DCF Calculator</span>
            </button>

            <!-- Deep Finder Button -->
            <button 
              class="menu-item" 
              @click="showDeepFinder"
            >
              <img 
                class="menu-item-icon" 
                src="/icons/deepFinder.png" 
                alt="Deep Finder"
                loading="eager"
                decoding="async"
              >
              <span>Deep Finder</span>
            </button>

            <!-- Macro Dashboard Button -->
            <button 
              class="menu-item" 
              @click="showMacro"
            >
              <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
              <span>Macro Dashboard</span>
            </button>

            <!-- Placeholder for future menu items -->
            <div class="menu-section-divider"></div>
            
            <!-- Coming Soon items (examples) -->
            <div class="menu-item disabled">
              <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Macro</span>
              <span class="coming-soon-badge">Soon</span>
            </div>
            
          </div>
        </Transition>

        <!-- Watchlist Content View -->
        <Transition name="slide-right">
          <div v-if="currentView === 'watchlist'" key="watchlist" class="menu-content watchlist-content">
            <!-- Watchlist Dropdown Selector -->
            <div v-if="isAuthenticated" class="watchlist-dropdown-container">
              <WatchlistDropdown />
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading watchlist...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="!watchlistItems.length" class="empty-state">
          <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p>Your watchlist is empty</p>
          <p class="empty-subtitle">Click the star icon next to any ticker to add it to your watchlist</p>
        </div>
        
        <!-- Watchlist items -->
        <div v-else class="watchlist-items">
          <TransitionGroup name="watchlist-item">
            <div 
              v-for="(item, index) in watchlistItems" 
              :key="item.ticker"
              class="watchlist-item"
              :class="{ 'drag-over': dragOverIndex === index }"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver($event, index)"
              @dragleave="handleDragLeave"
              @drop="handleDrop($event, index)"
              @click="goToTicker(item.ticker)"
            >
              <!-- Drag handle icon -->
              <div class="drag-handle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
                </svg>
              </div>
              
              <div class="ticker-info">
                <img 
                  :src="getIconUrl(item.ticker)"
                  :alt="`${item.ticker} logo`"
                  class="company-icon"
                  loading="lazy"
                  decoding="async"
                  @error="handleImageError"
                >
              <div class="ticker-text">
                <span class="ticker-symbol">{{ item.ticker }}</span>
                <span class="ticker-date">{{ formatDate(item.addedAt) }}</span>
              </div>
            </div>
            <button 
              class="remove-btn"
              @click.stop="handleRemove(item.ticker)"
              title="Remove from watchlist"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>
          </TransitionGroup>
        </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- DCF Calculator Modal -->
    <DcfCalculatorModal v-model="isDcfModalOpen" />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useWatchlists } from '../../composables/useWatchlists'
import WatchlistDropdown from './WatchlistDropdown.vue'
import DcfCalculatorModal from '../modals/DcfCalculatorModal.vue'
import { API_ABSOLUTE_URL } from '../../utils/apiConfig'
import BRAND from '../../config/brand'

// Helper to get full icon URL for production compatibility
const getIconUrl = (ticker) => {
  return `${API_ABSOLUTE_URL}/api/company-icon/${ticker}`
}

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'toggle-watchlist', 'select-ticker', 'show-deep-finder', 'show-macro'])

const currentView = ref('menu') // 'menu' or 'watchlist'
const isDcfModalOpen = ref(false)

// Use shared watchlists composable with multi-watchlist support
const { 
  items,
  loading, 
  initializeWatchlists,
  toggleWatchlist,
  reorderWatchlist
} = useWatchlists()

// Alias items to watchlistItems for template compatibility
const watchlistItems = items

// Drag and drop state
const draggedIndex = ref(null)
const dragOverIndex = ref(null)
const isReordering = ref(false)

// Computed to handle errors locally
const error = ref(null)

// Fetch watchlist when switching to watchlist view
watch(currentView, async (view) => {
  if (view === 'watchlist') {
    error.value = null
    try {
      await initializeWatchlists()
    } catch (_err) {
      console.error('Error loading watchlist:', err)
      error.value = 'Failed to load watchlist'
    }
  }
})

function showWatchlist() {
  currentView.value = 'watchlist'
}

function showDcfCalculator() {
  isDcfModalOpen.value = true
  emit('close') // Close the main menu
}

function showDeepFinder() {
  emit('show-deep-finder')
  emit('close') // Close the main menu
}

function showMacro() {
  emit('show-macro')
  emit('close') // Close the main menu
}

const handleRemove = async (ticker) => {
  try {
    await toggleWatchlist(ticker)
  } catch (_err) {
    console.error('Error removing ticker:', err)
  }
}

const goToTicker = (ticker) => {
  emit('select-ticker', ticker)
  emit('close')
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

const handleImageError = (_event) => {
  event.target.style.display = 'none'
}

// Drag and drop handlers
const handleDragStart = (__event, _index) => {
  draggedIndex.value = _index
  __event.dataTransfer.effectAllowed = 'move'
  __event.target.style.opacity = '0.5'
}

const handleDragEnd = (_event) => {
  _event.target.style.opacity = '1'
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragOver = (__event, _index) => {
  __event.preventDefault()
  __event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = _index
}

const handleDragLeave = () => {
  dragOverIndex.value = null
}

const handleDrop = async (__event, _dropIndex) => {
  __event.preventDefault()
  
  // Prevent duplicate drops or invalid drops
  if (draggedIndex.value === null || draggedIndex.value === _dropIndex || isReordering.value) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }
  
  isReordering.value = true
  error.value = null
  
  try {
    // Reorder the array
    const items = [...watchlistItems.value]
    const [draggedItem] = items.splice(draggedIndex.value, 1)
    items.splice(_dropIndex, 0, draggedItem)
    
    // Extract tickers in new order
    const newOrder = items.map(item => item.ticker)
    
    // Update server (will throw on error for rollback)
    await reorderWatchlist(newOrder)
    
  } catch (_err) {
    console.error('Error during drag and drop:', _err)
    error.value = 'Failed to reorder watchlist. Changes reverted.'
    
    // Error is already handled in composable (rollback)
    // UI will automatically reflect the rollback via reactive state
    
  } finally {
    isReordering.value = false
    draggedIndex.value = null
    dragOverIndex.value = null
  }
}
</script>

<style scoped>
.main-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.main-menu-overlay.is-open {
  opacity: 1;
  pointer-events: all;
}

.main-menu {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 85%;
  background: #1A1A1D;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.4);
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-menu.is-open {
  transform: translateX(0);
}

/* Header */
.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 89, 76, 0.05);
}

.menu-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-button {
  padding: 0.375rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #9E9E9E;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background: rgba(0, 168, 142, 0.1);
  border-color: rgba(0, 168, 142, 0.3);
  color: #00A88E;
}

.menu-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: contain;
}

.menu-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #E5E5E5;
  letter-spacing: -0.02em;
}

/* Close button removed - replaced with watchlist dropdown */

/* Menu Content Container */
.menu-content-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Menu Content */
.menu-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1rem 0;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 0.875rem 1.25rem;
  background: transparent;
  border: none;
  color: #E5E5E5;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.menu-item:hover:not(.disabled) {
  background: rgba(0, 89, 76, 0.1);
  color: #00A88E;
}

.menu-item.disabled {
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

.menu-item-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.coming-soon-badge {
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  background: rgba(255, 184, 0, 0.15);
  border: 1px solid rgba(255, 184, 0, 0.3);
  border-radius: 4px;
  color: #FFB800;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0.75rem 0;
}

/* Scrollbar */
.menu-content::-webkit-scrollbar {
  width: 6px;
}

.menu-content::-webkit-scrollbar-track {
  background: transparent;
}

.menu-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.menu-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .main-menu {
    width: 280px;
  }
}

/* Watchlist Content Styles */
.watchlist-content {
  padding: 0;
}

.watchlist-dropdown-container {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #9E9E9E;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 168, 142, 0.1);
  border-top-color: #00A88E;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #FF3B30;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #666;
  margin-bottom: 1rem;
  stroke-width: 1.5;
}

.empty-state p {
  margin: 0;
  color: #9E9E9E;
}

.empty-state .empty-subtitle {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  color: #666;
  max-width: 220px;
  line-height: 1.4;
}

/* Watchlist Items */
.watchlist-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

/* TransitionGroup animations for smooth removal */
.watchlist-item-move,
.watchlist-item-enter-active,
.watchlist-item-leave-active {
  transition: all 0.3s ease;
}

.watchlist-item-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.watchlist-item-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.watchlist-item-leave-active {
  position: absolute;
  width: calc(100% - 2rem);
}

.watchlist-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.68rem 0.85rem; /* 15% smaller: 0.8rem -> 0.68rem, 1rem -> 0.85rem */
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6.8px; /* 15% smaller: 8px -> 6.8px */
  cursor: grab;
  transition: all 0.2s;
}

.watchlist-item:active {
  cursor: grabbing;
}

.watchlist-item:hover {
  background: rgba(0, 168, 142, 0.08);
  border-color: rgba(0, 168, 142, 0.2);
  transform: translateX(4px);
}

.watchlist-item:hover .drag-handle {
  opacity: 1;
}

.watchlist-item.drag-over {
  border-color: rgba(0, 192, 135, 0.5);
  border-width: 2px;
  border-style: dashed;
  background: rgba(0, 192, 135, 0.1);
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  opacity: 0.3;
  color: rgba(255, 255, 255, 0.4);
  cursor: grab;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.drag-handle svg {
  width: 14px;
  height: 14px;
}

.watchlist-item:active .drag-handle {
  cursor: grabbing;
}

.ticker-info {
  display: flex;
  align-items: center;
  gap: 0.64rem; /* 15% smaller: 0.75rem -> 0.64rem */
  flex: 1;
}

.company-icon {
  width: 27.2px; /* 15% smaller: 32px -> 27.2px */
  height: 27.2px;
  border-radius: 5.1px; /* 15% smaller: 6px -> 5.1px */
  object-fit: contain;
  background: rgba(255, 255, 255, 0.05);
  padding: 3.4px; /* 15% smaller: 4px -> 3.4px */
  flex-shrink: 0;
}

.ticker-text {
  display: flex;
  flex-direction: column;
  gap: 0.21rem; /* 15% smaller: 0.25rem -> 0.21rem */
}

.ticker-symbol {
  font-size: 0.85rem; /* 15% smaller: 1rem -> 0.85rem */
  font-weight: 600;
  color: #E5E5E5;
  letter-spacing: 0.02em;
}

.ticker-date {
  font-size: 0.64rem; /* 15% smaller: 0.75rem -> 0.64rem */
  color: #666;
}

.remove-btn {
  padding: 0.425rem; /* 15% smaller: 0.5rem -> 0.425rem */
  background: transparent;
  border: none;
  color: #FFB800;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3.4px; /* 15% smaller: 4px -> 3.4px */
  flex-shrink: 0;
}

.remove-btn svg {
  width: 17px; /* 15% smaller: 20px -> 17px */
  height: 17px;
}

.remove-btn:hover {
  background: rgba(255, 184, 0, 0.1);
  color: #FFC933;
  transform: scale(1.1);
}

.remove-btn:active {
  transform: scale(0.95);
}

/* Slide Transitions */
/* Slide left (menu to watchlist) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Slide right (watchlist back to menu) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
