// src/composables/useTickerData.js
// Centralized data fetcher using batch endpoint
// Replaces 30+ individual API calls with 1 batch request

import { ref, watch, computed } from 'vue'

// Get API base URL from environment variable or fallback to relative URL for dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const cache = new Map() // Client-side cache for instant navigation

export function useTickerData(tickerRef, options = {}) {
  const { mode = 'full', autoFetch = true } = options
  
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)
  const fetchTime = ref(0)
  
  // Individual data accessors for easy component usage
  const profile = computed(() => {
    const p = data.value?.data?.profile
    return Array.isArray(p) && p.length > 0 ? p[0] : null
  })
  
  const quote = computed(() => {
    const q = data.value?.data?.quote
    return Array.isArray(q) && q.length > 0 ? q[0] : null
  })
  
  const incomeStatements = computed(() => ({
    annual: data.value?.data?.incomeAnnual || [],
    quarter: data.value?.data?.incomeQuarter || []
  }))
  
  const balanceSheets = computed(() => ({
    annual: data.value?.data?.balanceAnnual || [],
    quarter: data.value?.data?.balanceQuarter || []
  }))
  
  const cashFlowStatements = computed(() => ({
    annual: data.value?.data?.cashflowAnnual || [],
    quarter: data.value?.data?.cashflowQuarter || []
  }))
  
  const ratios = computed(() => data.value?.data?.ratiosAnnual || [])
  const keyMetrics = computed(() => data.value?.data?.keyMetrics || [])
  const priceHistory = computed(() => {
    const hist = data.value?.data?.priceHistory
    return hist?.historical || []
  })
  
  const revenueSegments = computed(() => data.value?.data?.revenueSegments || [])
  const dividendHistory = computed(() => data.value?.data?.dividendHistory?.historical || [])
  const financialScores = computed(() => {
    const scores = data.value?.data?.financialScores
    return Array.isArray(scores) && scores.length > 0 ? scores[0] : null
  })
  const insiderTrading = computed(() => data.value?.data?.insiderTrading || [])
  const earningsCalendar = computed(() => data.value?.data?.earningsCalendar || [])
  
  async function fetchData(ticker = null) {
    const t = (ticker || tickerRef?.value)?.trim().toUpperCase()
    if (!t) return
    
    // Check client-side cache first
    const cacheKey = `${t}-${mode}`
    if (cache.has(cacheKey)) {
      console.log(`[useTickerData] ${t} → CLIENT CACHE HIT`)
      data.value = cache.get(cacheKey)
      loading.value = false
      error.value = null
      return
    }
    
    loading.value = true
    error.value = null
    const startTime = performance.now()
    
    try {
      console.log(`[useTickerData] Fetching ${t} (${mode} mode)...`)
      
      const response = await fetch(`${API_BASE_URL}/api/ticker-data/${t}?mode=${mode}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      fetchTime.value = Math.round(performance.now() - startTime)
      
      console.log(`[useTickerData] ${t} fetched in ${fetchTime.value}ms`)
      console.log(`[useTickerData] Server fetch time: ${result.fetchDuration}ms`)
      console.log(`[useTickerData] Cache: ${response.headers.get('X-Cache') || 'unknown'}`)
      
      data.value = result
      
      // Store in client-side cache (5 min TTL)
      cache.set(cacheKey, result)
      setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000)
      
    } catch (err) {
      console.error(`[useTickerData] Error fetching ${t}:`, err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // Auto-fetch when ticker changes
  if (autoFetch && tickerRef) {
    watch(tickerRef, (newTicker) => {
      if (newTicker) fetchData(newTicker)
    }, { immediate: true })
  }
  
  // Manual refresh (clears cache)
  function refresh() {
    const t = tickerRef?.value?.trim().toUpperCase()
    if (t) {
      cache.delete(`${t}-${mode}`)
      fetchData(t)
    }
  }
  
  return {
    // State
    loading,
    error,
    data,
    fetchTime,
    
    // Computed data accessors
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
    
    // Methods
    fetchData,
    refresh
  }
}
