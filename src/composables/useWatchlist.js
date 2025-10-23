import { ref, computed } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig.js'

// Shared state across all components
const watchlistSet = ref(new Set())
const loading = ref(false)
const initialized = ref(false)

export function useWatchlist() {
  /**
   * Initialize watchlist from server
   */
  const initializeWatchlist = async (forceRefresh = false) => {
    if (initialized.value && !forceRefresh) return
    
    loading.value = true
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist`)
      
      if (response.ok) {
        const data = await response.json()
        watchlistSet.value = new Set(data.tickers.map(item => item.ticker))
        initialized.value = true
      } else if (response.status === 401) {
        // User not authenticated - clear watchlist
        watchlistSet.value.clear()
        initialized.value = true
      }
    } catch (error) {
      console.error('Error initializing watchlist:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if ticker is in watchlist
   */
  const isWatchlisted = (ticker) => {
    return watchlistSet.value.has(ticker.toUpperCase())
  }

  /**
   * Add ticker to watchlist
   */
  const addToWatchlist = async (ticker) => {
    const upperTicker = ticker.toUpperCase()
    
    // Optimistic update
    watchlistSet.value.add(upperTicker)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/${upperTicker}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        // Revert on error
        watchlistSet.value.delete(upperTicker)
        
        if (response.status === 401) {
          throw new Error('Please log in to add tickers to your watchlist')
        } else if (response.status === 409) {
          // Already in watchlist - not really an error
          watchlistSet.value.add(upperTicker)
          return { success: true }
        }
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to add ticker')
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      throw error
    }
  }

  /**
   * Remove ticker from watchlist
   */
  const removeFromWatchlist = async (ticker) => {
    const upperTicker = ticker.toUpperCase()
    
    // Optimistic update
    watchlistSet.value.delete(upperTicker)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/${upperTicker}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        // Revert on error
        watchlistSet.value.add(upperTicker)
        
        if (response.status === 401) {
          throw new Error('Authentication required')
        }
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove ticker')
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      throw error
    }
  }

  /**
   * Toggle ticker in watchlist
   */
  const toggleWatchlist = async (ticker) => {
    const upperTicker = ticker.toUpperCase()
    
    if (isWatchlisted(upperTicker)) {
      await removeFromWatchlist(upperTicker)
      return { added: false }
    } else {
      await addToWatchlist(upperTicker)
      return { added: true }
    }
  }

  /**
   * Clear watchlist (on logout)
   */
  const clearWatchlist = () => {
    watchlistSet.value.clear()
    initialized.value = false
  }

  return {
    // State
    watchlist: computed(() => Array.from(watchlistSet.value)),
    loading: computed(() => loading.value),
    initialized: computed(() => initialized.value),
    
    // Methods
    initializeWatchlist,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist
  }
}
