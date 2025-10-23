<script setup>
import { ref, computed, watch } from 'vue'
import { useTickerStore } from '../../stores/tickerStore'
import StarIcon from './StarIcon.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'toggle-watchlist', 'select-ticker'])

const tickerStore = useTickerStore()
const watchlist = ref([])
const loading = ref(false)
const error = ref(null)

// Fetch watchlist when panel opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await fetchWatchlist()
  }
})

const fetchWatchlist = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await fetch('/api/watchlist')
    
    if (!response.ok) {
      if (response.status === 401) {
        error.value = 'Please log in to view your watchlist'
        return
      }
      throw new Error('Failed to fetch watchlist')
    }
    
    const data = await response.json()
    watchlist.value = data.tickers || []
  } catch (err) {
    console.error('Error fetching watchlist:', err)
    error.value = 'Failed to load watchlist'
  } finally {
    loading.value = false
  }
}

const handleToggleWatchlist = async (ticker) => {
  emit('toggle-watchlist', ticker)
  // Remove from local state
  watchlist.value = watchlist.value.filter(item => item.ticker !== ticker)
}

const goToTicker = (ticker) => {
  // Emit to parent to update input field and set ticker in store
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
</script>

<template>
  <div class="watchlist-overlay" :class="{ 'is-open': isOpen }" @click="emit('close')">
    <div class="watchlist-panel" :class="{ 'is-open': isOpen }" @click.stop>
      <!-- Header -->
      <div class="panel-header">
        <h2>⭐ Watchlist</h2>
        <button class="close-btn" @click="emit('close')" title="Close">×</button>
      </div>
      
      <!-- Content -->
      <div class="panel-content">
        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading watchlist...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button v-if="error.includes('log in')" @click="emit('close')">
            Close
          </button>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="watchlist.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <h3>No tickers in watchlist</h3>
          <p>Click the star icon next to any ticker to add it to your watchlist</p>
        </div>
        
        <!-- Watchlist items -->
        <div v-else class="watchlist-items">
          <div 
            v-for="item in watchlist" 
            :key="item.ticker"
            class="watchlist-item"
          >
            <div class="item-main" @click="goToTicker(item.ticker)">
              <div class="item-info">
                <span class="item-ticker">{{ item.ticker }}</span>
                <span class="item-date">{{ formatDate(item.addedAt) }}</span>
              </div>
            </div>
            <StarIcon 
              :ticker="item.ticker" 
              :is-watchlisted="true"
              @toggle="handleToggleWatchlist"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watchlist-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.watchlist-overlay.is-open {
  opacity: 1;
  pointer-events: all;
}

.watchlist-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  max-width: 100%;
  background: #1A1A1D;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1001;
}

.watchlist-panel.is-open {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #2A2A2E;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #F9FAFB;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #F9FAFB;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
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
  color: #9CA3AF;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2A2A2E;
  border-top-color: #00A88E;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #4B5563;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem;
  color: #F9FAFB;
  font-size: 1.125rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.error-state button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #00A88E;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.error-state button:hover {
  background: #008F77;
}

.watchlist-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.watchlist-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #2A2A2E;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.watchlist-item:hover {
  border-color: #00A88E;
  background: #252529;
}

.item-main {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-ticker {
  font-size: 1rem;
  font-weight: 700;
  color: #F9FAFB;
  letter-spacing: 0.05em;
}

.item-date {
  font-size: 0.75rem;
  color: #9CA3AF;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .watchlist-panel {
    width: 100%;
  }
}
</style>
