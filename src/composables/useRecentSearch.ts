import { ref, type Ref } from 'vue'

interface RecentSearchReturn {
  recentSearches: Ref<string[]>
  addToRecent: (ticker: string) => void
  clearRecent: () => void
}

/**
 * Composable for managing recent ticker searches
 * Client-side only - stores last 5 searched tickers in sessionStorage
 * Data persists only during the browser session (no server/database calls)
 */
export function useRecentSearch(): RecentSearchReturn {
  const STORAGE_KEY = 'factorly_recent_search'
  const MAX_HISTORY = 5

  // Load from sessionStorage (client-side only, no API calls)
  const loadRecentSearches = (): string[] => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.error('[RecentSearch] Failed to load from sessionStorage:', err)
      return []
    }
  }

  const recentSearches = ref<string[]>(loadRecentSearches())

  // Save to sessionStorage (client-side only, no API calls)
  const saveRecentSearches = (): void => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches.value))
    } catch (err) {
      console.error('[RecentSearch] Failed to save to sessionStorage:', err)
    }
  }

  // Add ticker to recent searches
  const addToRecent = (ticker: string): void => {
    if (!ticker || typeof ticker !== 'string') return

    const upperTicker = ticker.trim().toUpperCase()
    if (!upperTicker) return
    
    // Remove if already exists (to move to front)
    recentSearches.value = recentSearches.value.filter(t => t !== upperTicker)
    
    // Add to front
    recentSearches.value.unshift(upperTicker)
    
    // Keep only last MAX_HISTORY items
    if (recentSearches.value.length > MAX_HISTORY) {
      recentSearches.value = recentSearches.value.slice(0, MAX_HISTORY)
    }
    
    saveRecentSearches()
  }

  // Clear all recent searches
  const clearRecent = (): void => {
    recentSearches.value = []
    saveRecentSearches()
  }

  return {
    recentSearches,
    addToRecent,
    clearRecent
  }
}
