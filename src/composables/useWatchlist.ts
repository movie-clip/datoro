import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig'
import { trackWatchlistAdd, trackWatchlistRemove } from '../services/analytics/gaService'

interface WatchlistItem {
  ticker: string
  addedAt: string
  displayOrder?: number
}

interface ApiResponse {
  success: boolean
  error?: string
}

interface ToggleResponse {
  added: boolean
}

export interface UseWatchlistReturn {
  watchlist: ComputedRef<string[]>
  watchlistItems: ComputedRef<WatchlistItem[]>
  loading: ComputedRef<boolean>
  initialized: ComputedRef<boolean>
  initializeWatchlist: (forceRefresh?: boolean) => Promise<void>
  isWatchlisted: (ticker: string) => boolean
  addToWatchlist: (ticker: string) => Promise<ApiResponse>
  removeFromWatchlist: (ticker: string) => Promise<ApiResponse>
  toggleWatchlist: (ticker: string) => Promise<ToggleResponse>
  clearWatchlist: () => void
  reorderWatchlist: (tickers: string[]) => Promise<void>
}

// Shared state across all components
const watchlistSet = ref<Set<string>>(new Set())
const watchlistItemsCache = ref<WatchlistItem[]>([]) // Cache full items with metadata
const loading = ref(false)
const initialized = ref(false)
const lastFetchTime = ref(0)

// Cache TTL: 5 minutes (same as other composables per project pattern)
const CACHE_TTL = 5 * 60 * 1000

export function useWatchlist(): UseWatchlistReturn {
  /**
   * Initialize watchlist from server with caching
   */
  const initializeWatchlist = async (forceRefresh = false): Promise<void> => {
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
        watchlistSet.value = new Set(data.tickers.map((item: WatchlistItem) => item.ticker))
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
    } catch (_error) {
      console.error('Error initializing watchlist:', _error)
      // Don't clear cache on network error - use stale data
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if ticker is in watchlist
   */
  const isWatchlisted = (ticker: string): boolean => {
    return watchlistSet.value.has(ticker.toUpperCase())
  }

  /**
   * Add ticker to watchlist
   */
  const addToWatchlist = async (ticker: string): Promise<ApiResponse> => {
    const upperTicker = ticker.toUpperCase()
    
    // Optimistic update
    watchlistSet.value.add(upperTicker)
    
    // Also add to items cache optimistically
    const newItem: WatchlistItem = {
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
        } catch (_e) {
          // Response not JSON, use default message
        }
        throw new Error(errorMessage)
      }
      
      // Track successful watchlist addition in GA4
      // Check if authenticated (default false if auth store not available, e.g., in tests)
      let isAuthenticated = false
      try {
        // Dynamic import to avoid Pinia dependency errors in tests
        const { useAuthStore } = await import('../stores/authStore')
        const authStore = useAuthStore()
        isAuthenticated = authStore.isAuthenticated
      } catch {
        // Auth store not available (e.g., tests without Pinia setup)
        isAuthenticated = false
      }
      trackWatchlistAdd(upperTicker, isAuthenticated)
      
      return { success: true }
    } catch (_error) {
      // Revert optimistic update on network error
      watchlistSet.value.delete(upperTicker)
      watchlistItemsCache.value = watchlistItemsCache.value.filter(item => item.ticker !== upperTicker)
      console.error('Error adding to watchlist:', _error)
      throw _error
    }
  }

  /**
   * Remove ticker from watchlist
   */
  const removeFromWatchlist = async (ticker: string): Promise<ApiResponse> => {
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
        const restoredItem: WatchlistItem = {
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
        } catch (_e) {
          // Response not JSON, use default message
        }
        throw new Error(errorMessage)
      }
      
      // Track watchlist removal in GA4
      trackWatchlistRemove(upperTicker)
      
      return { success: true }
    } catch (_error) {
      // Revert optimistic update on network error
      watchlistSet.value.add(upperTicker)
      const restoredItem: WatchlistItem = {
        ticker: upperTicker,
        addedAt: new Date().toISOString()
      }
      watchlistItemsCache.value = [...watchlistItemsCache.value, restoredItem]
      console.error('Error removing from watchlist:', _error)
      throw _error
    }
  }

  /**
   * Toggle ticker in watchlist
   */
  const toggleWatchlist = async (ticker: string): Promise<ToggleResponse> => {
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
  const clearWatchlist = (): void => {
    watchlistSet.value.clear()
    watchlistItemsCache.value = []
    initialized.value = false
    lastFetchTime.value = 0
  }

  /**
   * Reorder watchlist items
   */
  const reorderWatchlist = async (tickers: string[]): Promise<void> => {
    // Store original state for rollback
    const originalItems = [...watchlistItemsCache.value]
    
    // Optimistically update local state with new displayOrder
    const newItems: WatchlistItem[] = []
    
    for (let index = 0; index < tickers.length; index++) {
      const ticker = tickers[index]
      const item = watchlistItemsCache.value.find(i => i.ticker === ticker)
      if (item) {
        newItems.push({ ...item, displayOrder: index })
      }
    }
    
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
      
    } catch (_error) {
      console.error('Error reordering watchlist:', _error)
      
      // Rollback on error
      watchlistItemsCache.value = originalItems
      watchlistSet.value = new Set(originalItems.map(item => item.ticker))
      
      // Show error to user
      throw _error
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
