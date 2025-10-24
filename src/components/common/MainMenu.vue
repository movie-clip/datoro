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
            alt="Factorly Logo" 
            class="menu-logo"
          >
          <span class="menu-title">{{ currentView === 'menu' ? 'Menu' : 'Watchlist' }}</span>
        </div>
        <button class="close-button" @click="emit('close')" title="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
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
              <span>Dashboard</span>
              <span class="coming-soon-badge">Soon</span>
            </div>
            
            <div class="menu-item disabled">
              <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Analytics</span>
              <span class="coming-soon-badge">Soon</span>
            </div>
          </div>
        </Transition>

        <!-- Watchlist Content View -->
        <Transition name="slide-right">
          <div v-if="currentView === 'watchlist'" key="watchlist" class="menu-content watchlist-content">
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
              v-for="item in watchlistItems" 
              :key="item.ticker"
              class="watchlist-item"
              @click="goToTicker(item.ticker)"
            >
              <div class="ticker-info">
                <img 
                  :src="`https://financialmodelingprep.com/image-stock/${item.ticker}.png`"
                :alt="`${item.ticker} logo`"
                class="company-icon"
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useWatchlist } from '../../composables/useWatchlist'

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

const emit = defineEmits(['close', 'toggle-watchlist', 'select-ticker'])

const currentView = ref('menu') // 'menu' or 'watchlist'

// Use shared watchlist composable - now with full cached items
const { 
  watchlistItems,
  loading, 
  initializeWatchlist 
} = useWatchlist()

// Computed to handle errors locally
const error = ref(null)

// Fetch watchlist when switching to watchlist view
watch(currentView, async (view) => {
  if (view === 'watchlist') {
    error.value = null
    try {
      await initializeWatchlist()
    } catch (err) {
      console.error('Error loading watchlist:', err)
      error.value = 'Failed to load watchlist'
    }
  }
})

function showWatchlist() {
  currentView.value = 'watchlist'
}

const handleRemove = async (ticker) => {
  // Emit to parent to handle actual removal via composable
  emit('toggle-watchlist', ticker)
  // Optimistic update handled in useWatchlist composable
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

const handleImageError = (event) => {
  event.target.style.display = 'none'
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

.close-button {
  padding: 0.5rem;
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

.close-button:hover {
  background: rgba(255, 59, 48, 0.1);
  border-color: rgba(255, 59, 48, 0.3);
  color: #FF3B30;
}

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
  width: 22px;
  height: 22px;
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
  justify-content: space-between;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.watchlist-item:hover {
  background: rgba(0, 168, 142, 0.08);
  border-color: rgba(0, 168, 142, 0.2);
  transform: translateX(4px);
}

.ticker-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.company-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  flex-shrink: 0;
}

.ticker-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ticker-symbol {
  font-size: 1rem;
  font-weight: 600;
  color: #E5E5E5;
  letter-spacing: 0.02em;
}

.ticker-date {
  font-size: 0.75rem;
  color: #666;
}

.remove-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #FFB800;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.remove-btn svg {
  width: 20px;
  height: 20px;
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
