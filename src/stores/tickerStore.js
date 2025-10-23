// src/stores/tickerStore.js
// Centralized ticker data store using Pinia
// Replaces individual component fetching with shared state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig.js'

// Local storage key for API version tracking
const API_VERSION_KEY = 'factorly-api-version'

/**
 * Check API version and clear cache if version changed
 * This ensures stale data is auto-cleared when FMP endpoints change
 */
async function checkApiVersion(cache) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/version`)
    const { version } = await response.json()
    
    const cachedVersion = localStorage.getItem(API_VERSION_KEY)
    if (cachedVersion && cachedVersion !== version) {
      console.log(`[TickerStore] API version changed: ${cachedVersion} → ${version}`)
      console.log('[TickerStore] Clearing cache to prevent stale data')
      cache.clear()
      localStorage.setItem(API_VERSION_KEY, version)
      return true // Cache was cleared
    } else if (!cachedVersion) {
      // First time - just store version
      localStorage.setItem(API_VERSION_KEY, version)
    }
    return false
  } catch (err) {
    console.warn('[TickerStore] Version check failed:', err.message)
    return false
  }
}

/**
 * LRU Cache with max size limit
 * Automatically evicts least recently used items when full
 */
class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) {
      return undefined
    }
    
    // Move to end (mark as recently used)
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    // Remove if exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, value)
  }

  has(key) {
    return this.cache.has(key)
  }

  delete(key) {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  get size() {
    return this.cache.size
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const useTickerStore = defineStore('ticker', () => {
  // State
  const currentTicker = ref('AAPL')
  const batchData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const fetchTime = ref(0)
  
  // Cache (5 min TTL, max 50 items)
  const cache = new LRUCache(50)
  const CACHE_TTL = 5 * 60 * 1000
  
  // Check API version on startup (auto-clear cache if version changed)
  checkApiVersion(cache).catch(err => {
    console.error('[TickerStore] Version check error:', err)
  })
  
  // Computed - Individual data accessors
  const profile = computed(() => {
    const p = batchData.value?.data?.profile
    return Array.isArray(p) && p.length > 0 ? p[0] : null
  })
  
  const quote = computed(() => {
    const q = batchData.value?.data?.quote
    return Array.isArray(q) && q.length > 0 ? q[0] : null
  })
  
  const incomeStatements = computed(() => ({
    annual: batchData.value?.data?.incomeAnnual || [],
    quarter: batchData.value?.data?.incomeQuarter || []
  }))
  
  const balanceSheets = computed(() => ({
    annual: batchData.value?.data?.balanceAnnual || [],
    quarter: batchData.value?.data?.balanceQuarter || []
  }))
  
  const cashFlowStatements = computed(() => ({
    annual: batchData.value?.data?.cashflowAnnual || [],
    quarter: batchData.value?.data?.cashflowQuarter || []
  }))
  
  const ratios = computed(() => batchData.value?.data?.ratiosAnnual || [])
  const keyMetrics = computed(() => batchData.value?.data?.keyMetrics || [])
  
  const priceHistory = computed(() => {
    const hist = batchData.value?.data?.priceHistory
    return hist?.historical || []
  })
  
  const revenueSegments = computed(() => batchData.value?.data?.revenueSegments || [])
  const dividendHistory = computed(() => batchData.value?.data?.dividendHistory?.historical || [])
  
  const financialScores = computed(() => {
    const scores = batchData.value?.data?.financialScores
    return Array.isArray(scores) && scores.length > 0 ? scores[0] : null
  })
  
  const insiderTrading = computed(() => batchData.value?.data?.insiderTrading || [])
  const earningsCalendar = computed(() => batchData.value?.data?.earningsCalendar || [])
  
  // Actions
  async function setTicker(ticker, mode = 'full') {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    
    currentTicker.value = t
    await fetchTickerData(t, mode)
  }
  
  async function fetchTickerData(ticker, mode = 'full') {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    
    // Check cache first
    const cacheKey = `${t}-${mode}`
    const cached = cache.get(cacheKey)
    const currentVersion = localStorage.getItem(API_VERSION_KEY)
    
    // Use cached data if:
    // 1. Cache exists and not expired
    // 2. Version matches (prevents serving stale data after API changes)
    if (cached && 
        Date.now() - cached.timestamp < CACHE_TTL && 
        cached.version === currentVersion) {
      batchData.value = cached.data
      loading.value = false
      error.value = null
      return
    }
    
    loading.value = true
    error.value = null
    const startTime = performance.now()
    
    try {
      // Send ETag if we have cached data with matching version
      const headers = {}
      if (cached?.etag && cached?.version === currentVersion) {
        headers['If-None-Match'] = cached.etag
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ticker-data/${t}?mode=${mode}`, { headers })
      
      // Handle 304 Not Modified - use cached data (server validated it's still fresh)
      if (response.status === 304) {
        console.log(`[TickerStore] ${t} - 304 Not Modified (using cached data)`)
        batchData.value = cached.data
        loading.value = false
        error.value = null
        fetchTime.value = Math.round(performance.now() - startTime)
        return
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      fetchTime.value = Math.round(performance.now() - startTime)
      
      batchData.value = result
      
      // Store in cache with ETag and version for future 304 responses
      const etag = response.headers.get('etag')
      cache.set(cacheKey, {
        data: result,
        etag: etag || null,
        version: currentVersion,
        timestamp: Date.now()
      })
      
    } catch (err) {
      console.error(`[TickerStore] Error fetching ${t}:`, err)
      error.value = err.message
      batchData.value = null
    } finally {
      loading.value = false
    }
  }
  
  // Refresh current ticker data
  async function refresh() {
    if (currentTicker.value) {
      // Clear cache for current ticker
      cache.delete(`${currentTicker.value}-full`)
      await fetchTickerData(currentTicker.value, 'full')
    }
  }
  
  // Clear all cache
  function clearCache() {
    cache.clear()
  }

  return {
    // State
    currentTicker,
    batchData,
    loading,
    error,
    fetchTime,
    
    // Computed
    profile,
    quote,
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
    ratios,
    keyMetrics,
    priceHistory,
    revenueSegments,
    dividendHistory,
    financialScores,
    insiderTrading,
    earningsCalendar,
    
    // Actions
    setTicker,
    fetchTickerData,
    refresh,
    clearCache,
    
    // Cache monitoring
    getCacheStats: () => cache.getStats()
  }
})
