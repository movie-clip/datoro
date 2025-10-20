import { ref } from 'vue'

export function useTickerSearch() {
  const searchResults = ref([])
  const searching = ref(false)
  const searchError = ref(null)

  let debounceTimer = null

  const searchTickers = async (query) => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Reset if query is empty
    if (!query || query.trim().length === 0) {
      searchResults.value = []
      searchError.value = null
      return
    }

    // Debounce search by 150ms - faster response while preventing excessive API calls
    debounceTimer = setTimeout(async () => {
      searching.value = true
      searchError.value = null

      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`)
        
        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        searchResults.value = data || []
      } catch (error) {
        console.error('[TickerSearch] Error:', error)
        searchError.value = 'Failed to search tickers'
        searchResults.value = []
      } finally {
        searching.value = false
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
  }

  return {
    searchResults,
    searching,
    searchError,
    searchTickers,
    clearSearch
  }
}
