/**
 * Ticker Search Composable
 * 
 * Uses debouncing for user input without local caching.
 * Server-side caching (Redis) handles caching to prevent redundant API calls.
 * 
 * Architecture:
 * - Debounced input (300ms) to prevent excessive API calls
 * - Request cancellation via AbortController
 * - Server handles caching (5min TTL in Redis)
 */

import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

interface SearchResult {
  symbol: string
  name: string
  exchangeShortName?: string
  [key: string]: unknown
}

export interface UseTickerSearchReturn {
  searchResults: ShallowRef<SearchResult[]>
  searching: Ref<boolean>
  searchError: Ref<string | null>
  searchTickers: (query: string) => Promise<void>
  clearSearch: () => void
  cleanup: () => void
}

export function useTickerSearch(): UseTickerSearchReturn {
  // Use shallowRef for better performance with array updates
  const searchResults = shallowRef<SearchResult[]>([])
  const searching = ref(false)
  const searchError = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null

  const searchTickers = async (query: string): Promise<void> => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Abort previous request if still pending
    if (abortController) {
      abortController.abort()
    }

    // Reset if query is empty
    if (!query || query.trim().length === 0) {
      searchResults.value = []
      searchError.value = null
      searching.value = false
      return
    }

    const normalizedQuery = query.trim().toUpperCase()

    // Debounce search by 300ms - prevents excessive API calls while user is typing
    debounceTimer = setTimeout(async () => {
      searching.value = true
      searchError.value = null

      // Create new abort controller for this request
      abortController = new AbortController()

      try {
        // Use environment variable in production, relative path in development
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
        const url = `${apiBaseUrl}/api/search?query=${encodeURIComponent(normalizedQuery)}`
        
        const response = await fetch(url, { signal: abortController.signal })
        
        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        searchResults.value = data || []

      } catch (_error) {
        const error = _error as Error
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        
        console.error('[TickerSearch] Error:', error)
        searchError.value = 'Failed to search tickers'
        searchResults.value = []
      } finally {
        searching.value = false
        abortController = null
      }
    }, 300) // 300ms debounce to prevent excessive API calls
  }

  const clearSearch = (): void => {
    searchResults.value = []
    searching.value = false
    searchError.value = null
    
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  // Cleanup function for component unmount
  const cleanup = (): void => {
    clearSearch()
  }

  return {
    searchResults,
    searching,
    searchError,
    searchTickers,
    clearSearch,
    cleanup
  }
}
