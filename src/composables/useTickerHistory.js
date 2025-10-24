import { ref, watch } from 'vue'

/**
 * Composable for managing ticker search history
 * Keeps track of last 3 searched tickers
 */
export function useTickerHistory() {
  const STORAGE_KEY = 'factorly_ticker_history'
  const MAX_HISTORY = 3

  // Load from localStorage
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.error('Failed to load ticker history:', err)
      return []
    }
  }

  const tickerHistory = ref(loadHistory())

  // Save to localStorage
  const saveHistory = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickerHistory.value))
    } catch (err) {
      console.error('Failed to save ticker history:', err)
    }
  }

  // Add ticker to history
  const addToHistory = (ticker) => {
    if (!ticker || typeof ticker !== 'string') return

    const upperTicker = ticker.trim().toUpperCase()
    
    // Remove if already exists (to move to front)
    tickerHistory.value = tickerHistory.value.filter(t => t !== upperTicker)
    
    // Add to front
    tickerHistory.value.unshift(upperTicker)
    
    // Keep only last 3
    if (tickerHistory.value.length > MAX_HISTORY) {
      tickerHistory.value = tickerHistory.value.slice(0, MAX_HISTORY)
    }
    
    saveHistory()
  }

  // Clear history
  const clearHistory = () => {
    tickerHistory.value = []
    saveHistory()
  }

  return {
    tickerHistory,
    addToHistory,
    clearHistory
  }
}
