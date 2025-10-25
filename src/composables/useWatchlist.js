import { ref, computed } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig.js'

// Shared state across all components
const watchlistSet = ref(new Set())
const watchlistItemsCache = ref([]) // Cache full items with metadata
const loading = ref(false)
const initialized = ref(false)
const lastFetchTime = ref(0)

// Cache TTL: 5 minutes (same as other composables per project pattern)
const CACHE_TTL = 5 * 60 * 1000

export function useWatchlist() {
  /**
   * Initialize watchlist from server with caching
   */
  const initializeWatchlist = async (forceRefresh = false) => {
    const now = Date.now()
    const isCacheValid = (now - lastFetchTime.value) < CACHE_TTL
    
    // Return cached data if valid and not forcing refresh
    if (initialized.value && isCacheValid && !forceRefresh) {
      return
    }
    
    loading.value = true
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist`, {
        credentials: 'include' // Send HttpOnly cookie
      })
      
      if (response.ok) {
        const data = await response.json()
        // Update both Set (for quick lookups) and full items (with metadata)
        watchlistSet.value = new Set(data.tickers.map(item => item.ticker))
        watchlistItemsCache.value = data.tickers || []
        initialized.value = true
        lastFetchTime.value = now
      } else if (response.status === 401) {
        // User not authenticated - clear watchlist
        watchlistSet.value.clear()
        watchlistItemsCache.value = []
        initialized.value = true
        lastFetchTime.value = now
      }
    } catch (error) {
      console.error('Error initializing watchlist:', error)
      // Don't clear cache on network error - use stale data
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
    
    // Also add to items cache optimistically
    const newItem = {
      ticker: upperTicker,
      addedAt: new Date().toISOString()
    }
    watchlistItemsCache.value = [newItem, ...watchlistItemsCache.value]
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/${upperTicker}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Send HttpOnly cookie
      })
      
      if (!response.ok) {
        // Revert on error
        watchlistSet.value.delete(upperTicker)
        watchlistItemsCache.value = watchlistItemsCache.value.filter(item => item.ticker !== upperTicker)
        
        if (response.status === 401) {
          throw new Error('Please log in to add tickers to your watchlist')
        } else if (response.status === 409) {
          // Already in watchlist - not really an error
          watchlistSet.value.add(upperTicker)
          return { success: true }
        }
        
        let errorMessage = 'Failed to add ticker'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          // Response not JSON, use default message
        }
        throw new Error(errorMessage)
      }
      
      return { success: true }
    } catch (error) {
      // Revert optimistic update on network error
      watchlistSet.value.delete(upperTicker)
      watchlistItemsCache.value = watchlistItemsCache.value.filter(item => item.ticker !== upperTicker)
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
    watchlistItemsCache.value = watchlistItemsCache.value.filter(item => item.ticker !== upperTicker)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/${upperTicker}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Send HttpOnly cookie
      })
      
      if (!response.ok) {
        // Revert on error
        watchlistSet.value.add(upperTicker)
        // Re-add to cache (will be at end, not original position - acceptable tradeoff)
        const restoredItem = {
          ticker: upperTicker,
          addedAt: new Date().toISOString()
        }
        watchlistItemsCache.value = [...watchlistItemsCache.value, restoredItem]
        
        if (response.status === 401) {
          throw new Error('Authentication required')
        }
        
        let errorMessage = 'Failed to remove ticker'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          // Response not JSON, use default message
        }
        throw new Error(errorMessage)
      }
      
      return { success: true }
    } catch (error) {
      // Revert optimistic update on network error
      watchlistSet.value.add(upperTicker)
      const restoredItem = {
        ticker: upperTicker,
        addedAt: new Date().toISOString()
      }
      watchlistItemsCache.value = [...watchlistItemsCache.value, restoredItem]
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
    watchlistItemsCache.value = []
    initialized.value = false
    lastFetchTime.value = 0
  }

  /**
   * Reorder watchlist items
   */
  const reorderWatchlist = async (tickers) => {
    // Store original state for rollback
    const originalItems = [...watchlistItemsCache.value]
    
    // Optimistically update local state with new displayOrder
    const newItems = tickers.map((ticker, index) => {
      const item = watchlistItemsCache.value.find(i => i.ticker === ticker)
      return item ? { ...item, displayOrder: index } : null
    }).filter(Boolean)
    
    // Update both cache structures
    watchlistItemsCache.value = newItems
    watchlistSet.value = new Set(tickers)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ tickers })
      })
      
      if (!response.ok) {
        throw new Error('Failed to reorder watchlist')
      }
      
      // Success - no need to refetch (optimistic update already applied)
      // Just invalidate cache for next session
      lastFetchTime.value = 0
      
    } catch (error) {
      console.error('Error reordering watchlist:', error)
      
      // Rollback on error
      watchlistItemsCache.value = originalItems
      watchlistSet.value = new Set(originalItems.map(item => item.ticker))
      
      // Show error to user
      throw error
    }
  }

  return {
    // State
    watchlist: computed(() => Array.from(watchlistSet.value)),
    watchlistItems: computed(() => watchlistItemsCache.value),
    loading: computed(() => loading.value),
    initialized: computed(() => initialized.value),
    
    // Methods
    initializeWatchlist,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
    reorderWatchlist
  }
}
