import { ref, shallowRef } from 'vue'

export function useTickerSearch() {
  // Use shallowRef for better performance with array updates
  const searchResults = shallowRef([])
  const searching = ref(false)
  const searchError = ref(null)

  // Client-side cache to avoid duplicate API calls
  const searchCache = new Map()
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const MAX_CACHE_SIZE = 50 // Limit cache size

  let debounceTimer = null
  let abortController = null

  const searchTickers = async (query) => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Abort previous request if still pending
    if (abortController) {
      abortController.abort()
    }

    // Reset if query is empty or too short
    if (!query || query.trim().length === 0) {
      searchResults.value = []
      searchError.value = null
      return
    }

    const normalizedQuery = query.trim().toUpperCase()

    // Check client-side cache first
    const cached = searchCache.get(normalizedQuery)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      searchResults.value = cached.data
      return
    }

    // Debounce search by 150ms - faster response while preventing excessive API calls
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

        // Cache the result
        searchCache.set(normalizedQuery, {
          data: data || [],
          timestamp: Date.now()
        })

        // Limit cache size (LRU behavior - remove oldest)
        if (searchCache.size > MAX_CACHE_SIZE) {
          const firstKey = searchCache.keys().next().value
          searchCache.delete(firstKey)
        }

      } catch (error) {
        // Ignore abort errors
        if (error.name === 'AbortError') {
          return
        }
        
        console.error('[TickerSearch] Error:', error)
        searchError.value = 'Failed to search tickers'
        searchResults.value = []
      } finally {
        searching.value = false
        abortController = null
      }
    }, 150)
  }

  const clearSearch = () => {
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
  const cleanup = () => {
    clearSearch()
    searchCache.clear()
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
