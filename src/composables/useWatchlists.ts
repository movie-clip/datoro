/**
 * Enhanced Watchlist Composable (Multi-Watchlist Support)
 * 
 * Manages multiple watchlists per user with full CRUD operations.
 * Uses new /api/watchlists endpoints with mock backend.
 * 
 * Features:
 * - Multiple watchlists per user
 * - Active watchlist selection
 * - Watchlist CRUD (create, rename, delete)
 * - Ticker management per watchlist
 * - Optimistic updates with rollback
 * - 5-minute caching
 * 
 * TODO: After DB migration, this will seamlessly work with Prisma (Task #14)
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig'

export interface Watchlist {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface WatchlistItem {
  ticker: string
  addedAt: string
  displayOrder: number
}

interface ApiResponse {
  success: boolean
  error?: string
}

export interface UseWatchlistsReturn {
  // State
  watchlists: ComputedRef<Watchlist[]>
  activeWatchlistId: ComputedRef<string | null>
  activeWatchlist: ComputedRef<Watchlist | null>
  items: ComputedRef<WatchlistItem[]>
  tickers: ComputedRef<string[]>
  loading: ComputedRef<boolean>
  initialized: ComputedRef<boolean>
  
  // Watchlist Management
  initializeWatchlists: (forceRefresh?: boolean) => Promise<void>
  selectWatchlist: (id: string) => Promise<void>
  createWatchlist: (name: string) => Promise<ApiResponse>
  renameWatchlist: (id: string, name: string) => Promise<ApiResponse>
  deleteWatchlist: (id: string) => Promise<ApiResponse>
  
  // Item Management (for active watchlist)
  isWatchlisted: (ticker: string) => boolean
  addToWatchlist: (ticker: string) => Promise<ApiResponse>
  removeFromWatchlist: (ticker: string) => Promise<ApiResponse>
  toggleWatchlist: (ticker: string) => Promise<{ added: boolean }>
  reorderWatchlist: (tickers: string[]) => Promise<void>
  
  // Utility
  clearAll: () => void
}

// Shared state across all components
const watchlistsCache = ref<Watchlist[]>([])
const activeWatchlistIdRef = ref<string | null>(null)
const itemsCache = ref<Map<string, WatchlistItem[]>>(new Map())
const loading = ref(false)
const initialized = ref(false)
const lastFetchTime = ref(0)

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000

// LocalStorage key for active watchlist
const ACTIVE_WATCHLIST_KEY = 'factorly-active-watchlist'

export function useWatchlists(): UseWatchlistsReturn {
  /**
   * Initialize watchlists from server
   */
  const initializeWatchlists = async (forceRefresh = false): Promise<void> => {
    const now = Date.now()
    const isCacheValid = (now - lastFetchTime.value) < CACHE_TTL
    
    if (initialized.value && isCacheValid && !forceRefresh) {
      return
    }
    
    loading.value = true
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        watchlistsCache.value = data.data.watchlists || []
        
        console.log('[Watchlists] Initialized, fetched:', watchlistsCache.value.length, 'watchlists')
        
        // Set active watchlist (preference: saved > default > first)
        if (watchlistsCache.value.length > 0) {
          const saved = localStorage.getItem(ACTIVE_WATCHLIST_KEY)
          const savedWatchlist = watchlistsCache.value.find(w => w.id === saved)
          const defaultWatchlist = watchlistsCache.value.find(w => w.isDefault)
          
          activeWatchlistIdRef.value = 
            savedWatchlist?.id || 
            defaultWatchlist?.id || 
            watchlistsCache.value[0].id
          
          // Load items for active watchlist
          await loadWatchlistItems(activeWatchlistIdRef.value)
        }
        
        initialized.value = true
        lastFetchTime.value = now
      } else if (response.status === 401) {
        // Not authenticated - clear all
        watchlistsCache.value = []
        activeWatchlistIdRef.value = null
        itemsCache.value.clear()
        initialized.value = true
        lastFetchTime.value = now
      }
    } catch (error) {
      console.error('[Watchlists] Error initializing:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load items for a specific watchlist
   */
  const loadWatchlistItems = async (watchlistId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        itemsCache.value.set(watchlistId, data.data.items || [])
      }
    } catch (error) {
      console.error(`[Watchlists] Error loading items for watchlist ${watchlistId}:`, error)
    }
  }

  /**
   * Select active watchlist
   */
  const selectWatchlist = async (id: string): Promise<void> => {
    if (activeWatchlistIdRef.value === id) return
    
    activeWatchlistIdRef.value = id
    localStorage.setItem(ACTIVE_WATCHLIST_KEY, id)
    
    // Load items if not cached
    if (!itemsCache.value.has(id)) {
      await loadWatchlistItems(id)
    }
  }

  /**
   * Create new watchlist
   */
  const createWatchlist = async (name: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create watchlist')
      }
      
      const data = await response.json()
      const newWatchlist = data.data.watchlist
      
      // Add to cache (don't replace, append!)
      watchlistsCache.value = [...watchlistsCache.value, newWatchlist]
      
      // Set as active
      activeWatchlistIdRef.value = newWatchlist.id
      localStorage.setItem(ACTIVE_WATCHLIST_KEY, newWatchlist.id)
      itemsCache.value.set(newWatchlist.id, [])
      
      // Invalidate cache timestamp to force refresh on next init
      lastFetchTime.value = 0
      
      console.log('[Watchlists] Created watchlist, total now:', watchlistsCache.value.length)
      
      return { success: true }
    } catch (error) {
      console.error('[Watchlists] Error creating watchlist:', error)
      throw error
    }
  }

  /**
   * Rename watchlist
   */
  const renameWatchlist = async (id: string, name: string): Promise<ApiResponse> => {
    const originalWatchlists = [...watchlistsCache.value]
    
    // Optimistic update
    watchlistsCache.value = watchlistsCache.value.map(w =>
      w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w
    )
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name })
      })
      
      if (!response.ok) {
        throw new Error('Failed to rename watchlist')
      }
      
      return { success: true }
    } catch (error) {
      // Rollback
      watchlistsCache.value = originalWatchlists
      console.error('[Watchlists] Error renaming watchlist:', error)
      throw error
    }
  }

  /**
   * Delete watchlist
   */
  const deleteWatchlist = async (id: string): Promise<ApiResponse> => {
    const originalWatchlists = [...watchlistsCache.value]
    const originalItems = new Map(itemsCache.value)
    const originalActive = activeWatchlistIdRef.value
    
    // Optimistic update
    watchlistsCache.value = watchlistsCache.value.filter(w => w.id !== id)
    itemsCache.value.delete(id)
    
    // If deleting active watchlist, switch to first available
    if (activeWatchlistIdRef.value === id && watchlistsCache.value.length > 0) {
      activeWatchlistIdRef.value = watchlistsCache.value[0].id
      localStorage.setItem(ACTIVE_WATCHLIST_KEY, watchlistsCache.value[0].id)
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const error = await response.json()
        if (error.code === 'CANNOT_DELETE_DEFAULT') {
          throw new Error('Cannot delete default watchlist')
        }
        throw new Error('Failed to delete watchlist')
      }
      
      return { success: true }
    } catch (error) {
      // Rollback
      watchlistsCache.value = originalWatchlists
      itemsCache.value = originalItems
      activeWatchlistIdRef.value = originalActive
      console.error('[Watchlists] Error deleting watchlist:', error)
      throw error
    }
  }

  /**
   * Check if ticker is in active watchlist
   */
  const isWatchlisted = (ticker: string): boolean => {
    if (!activeWatchlistIdRef.value) return false
    
    const items = itemsCache.value.get(activeWatchlistIdRef.value) || []
    return items.some(item => item.ticker === ticker.toUpperCase())
  }

  /**
   * Add ticker to active watchlist
   */
  const addToWatchlist = async (ticker: string): Promise<ApiResponse> => {
    if (!activeWatchlistIdRef.value) {
      throw new Error('No active watchlist')
    }
    
    const upperTicker = ticker.toUpperCase()
    const watchlistId = activeWatchlistIdRef.value
    const originalItems = itemsCache.value.get(watchlistId) || []
    
    // Optimistic update
    const newItem: WatchlistItem = {
      ticker: upperTicker,
      addedAt: new Date().toISOString(),
      displayOrder: originalItems.length
    }
    itemsCache.value.set(watchlistId, [newItem, ...originalItems])
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items/${upperTicker}`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (!response.ok) {
        if (response.status === 409) {
          // Already exists - not really an error
          return { success: true }
        }
        if (response.status === 401) {
          throw new Error('Please log in to add tickers to your watchlist')
        }
        throw new Error('Failed to add ticker')
      }
      
      return { success: true }
    } catch (error) {
      // Rollback
      itemsCache.value.set(watchlistId, originalItems)
      console.error('[Watchlists] Error adding ticker:', error)
      throw error
    }
  }

  /**
   * Remove ticker from active watchlist
   */
  const removeFromWatchlist = async (ticker: string): Promise<ApiResponse> => {
    if (!activeWatchlistIdRef.value) {
      throw new Error('No active watchlist')
    }
    
    const upperTicker = ticker.toUpperCase()
    const watchlistId = activeWatchlistIdRef.value
    const originalItems = itemsCache.value.get(watchlistId) || []
    
    // Optimistic update
    itemsCache.value.set(
      watchlistId,
      originalItems.filter(item => item.ticker !== upperTicker)
    )
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items/${upperTicker}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove ticker')
      }
      
      return { success: true }
    } catch (error) {
      // Rollback
      itemsCache.value.set(watchlistId, originalItems)
      console.error('[Watchlists] Error removing ticker:', error)
      throw error
    }
  }

  /**
   * Toggle ticker in active watchlist
   */
  const toggleWatchlist = async (ticker: string): Promise<{ added: boolean }> => {
    if (isWatchlisted(ticker)) {
      await removeFromWatchlist(ticker)
      return { added: false }
    } else {
      await addToWatchlist(ticker)
      return { added: true }
    }
  }

  /**
   * Reorder items in active watchlist
   */
  const reorderWatchlist = async (tickers: string[]): Promise<void> => {
    if (!activeWatchlistIdRef.value) {
      throw new Error('No active watchlist')
    }
    
    const watchlistId = activeWatchlistIdRef.value
    const originalItems = itemsCache.value.get(watchlistId) || []
    
    // Optimistic update
    const reorderedItems: WatchlistItem[] = tickers.map((ticker, index) => {
      const item = originalItems.find(i => i.ticker === ticker)
      return item ? { ...item, displayOrder: index } : { ticker, addedAt: new Date().toISOString(), displayOrder: index }
    })
    itemsCache.value.set(watchlistId, reorderedItems)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tickers })
      })
      
      if (!response.ok) {
        throw new Error('Failed to reorder watchlist')
      }
    } catch (error) {
      // Rollback
      itemsCache.value.set(watchlistId, originalItems)
      console.error('[Watchlists] Error reordering:', error)
      throw error
    }
  }

  /**
   * Clear all (on logout)
   */
  const clearAll = (): void => {
    watchlistsCache.value = []
    activeWatchlistIdRef.value = null
    itemsCache.value.clear()
    initialized.value = false
    lastFetchTime.value = 0
    localStorage.removeItem(ACTIVE_WATCHLIST_KEY)
  }

  // Computed properties
  const activeWatchlist = computed(() => {
    if (!activeWatchlistIdRef.value) return null
    return watchlistsCache.value.find(w => w.id === activeWatchlistIdRef.value) || null
  })

  const items = computed(() => {
    if (!activeWatchlistIdRef.value) return []
    return itemsCache.value.get(activeWatchlistIdRef.value) || []
  })

  const tickers = computed(() => {
    return items.value.map(item => item.ticker)
  })

  return {
    // State
    watchlists: computed(() => watchlistsCache.value),
    activeWatchlistId: computed(() => activeWatchlistIdRef.value),
    activeWatchlist,
    items,
    tickers,
    loading: computed(() => loading.value),
    initialized: computed(() => initialized.value),
    
    // Watchlist Management
    initializeWatchlists,
    selectWatchlist,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    
    // Item Management
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    reorderWatchlist,
    
    // Utility
    clearAll
  }
}
