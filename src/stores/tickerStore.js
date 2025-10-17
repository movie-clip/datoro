// src/stores/tickerStore.js
// Centralized ticker data store using Pinia
// Replaces individual component fetching with shared state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const useTickerStore = defineStore('ticker', () => {
  // State
  const currentTicker = ref('AAPL')
  const batchData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const fetchTime = ref(0)
  
  // Cache (5 min TTL)
  const cache = new Map()
  const CACHE_TTL = 5 * 60 * 1000
  
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
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[TickerStore] ${t} → CLIENT CACHE HIT`)
      batchData.value = cached.data
      loading.value = false
      error.value = null
      return
    }
    
    loading.value = true
    error.value = null
    const startTime = performance.now()
    
    try {
      console.log(`[TickerStore] Fetching ${t} (${mode} mode)...`)
      
      const response = await fetch(`${API_BASE_URL}/api/ticker-data/${t}?mode=${mode}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      fetchTime.value = Math.round(performance.now() - startTime)
      
      console.log(`[TickerStore] ${t} fetched in ${fetchTime.value}ms`)
      console.log(`[TickerStore] Server fetch time: ${result.fetchDuration}ms`)
      console.log(`[TickerStore] Cache: ${response.headers.get('X-Cache') || 'unknown'}`)
      
      batchData.value = result
      
      // Update cache
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
      
      // Clean up old cache entries
      setTimeout(() => cache.delete(cacheKey), CACHE_TTL)
      
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
    console.log('[TickerStore] Cache cleared')
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
    clearCache
  }
})
