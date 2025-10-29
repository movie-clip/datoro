// src/stores/tickerStore.ts
// Centralized ticker data store using Pinia
// Replaces individual component fetching with shared state

import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig'
import type {
  BatchData,
  FMPProfile,
  FMPQuote,
  FMPIncomeStatement,
  FMPBalanceSheet,
  FMPCashFlow,
  FMPInsiderTrading,
  FMPHistoricalPrice,
  FMPDividend
} from '../types'
import { STORAGE_KEYS } from '../config/storage'

// Re-export types for components
export type { BatchData, FMPProfile, FMPQuote, FMPIncomeStatement, FMPBalanceSheet, FMPCashFlow, FMPInsiderTrading, FMPHistoricalPrice, FMPDividend }

// Local storage key for API version tracking
const API_VERSION_KEY = STORAGE_KEYS.API_VERSION/**
 * API version response
 */
interface ApiVersionResponse {
  version: string
}

/**
 * Cache entry with metadata
 */
interface CachedEntry {
  data: BatchData
  etag: string | null
  version: string | null
  timestamp: number
}

/**
 * Cache statistics
 */
interface CacheStats {
  size: number
  maxSize: number
  keys: string[]
}

/**
 * Check API version and clear cache if version changed
 * This ensures stale data is auto-cleared when FMP endpoints change
 */
async function checkApiVersion(cache: LRUCache): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/version`)
    const { version }: ApiVersionResponse = await response.json()
    
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
  } catch (_err) {
    const error = err as Error
    console.warn('[TickerStore] Version check failed:', error.message)
    return false
  }
}

/**
 * LRU Cache with max size limit
 * Automatically evicts least recently used items when full
 */
class LRUCache {
  private maxSize: number
  private cache: Map<string, CachedEntry>

  constructor(maxSize = 50) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key: string): CachedEntry | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }
    
    // Move to end (mark as recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: string, value: CachedEntry): void {
    // Remove if exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  // Get cache statistics
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Income statements by period
 */
interface IncomeStatements {
  annual: FMPIncomeStatement[]
  quarter: FMPIncomeStatement[]
}

/**
 * Balance sheets by period
 */
interface BalanceSheets {
  annual: FMPBalanceSheet[]
  quarter: FMPBalanceSheet[]
}

/**
 * Cash flow statements by period
 */
interface CashFlowStatements {
  annual: FMPCashFlow[]
  quarter: FMPCashFlow[]
}

/**
 * Ticker store return type
 */
export interface TickerStoreState {
  // State
  currentTicker: Ref<string>
  batchData: Ref<BatchData | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  fetchTime: Ref<number>
  timeframe: Ref<'annual' | 'quarterly'>
  
  // Computed
  profile: ComputedRef<FMPProfile | null>
  quote: ComputedRef<FMPQuote | null>
  incomeStatements: ComputedRef<IncomeStatements>
  balanceSheets: ComputedRef<BalanceSheets>
  cashFlowStatements: ComputedRef<CashFlowStatements>
  ratios: ComputedRef<any[]>
  keyMetrics: ComputedRef<any[]>
  priceHistory: ComputedRef<FMPHistoricalPrice[]>
  revenueSegments: ComputedRef<any[]>
  dividendHistory: ComputedRef<FMPDividend[]>
  financialScores: ComputedRef<any | null>
  insiderTrading: ComputedRef<FMPInsiderTrading[]>
  earningsCalendar: ComputedRef<any[]>
  
  // Actions
  setTicker: (ticker: string, mode?: 'full' | 'lite') => Promise<void>
  fetchTickerData: (ticker: string, mode?: 'full' | 'lite') => Promise<void>
  refresh: () => Promise<void>
  clearCache: () => void
  getCacheStats: () => CacheStats
  setTimeframe: (timeframe: 'annual' | 'quarterly') => void
}

export const useTickerStore = defineStore('ticker', (): TickerStoreState => {
  // State
  const currentTicker = ref('AAPL')
  const batchData = ref<BatchData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fetchTime = ref(0)
  const timeframe = ref<'annual' | 'quarterly'>('annual')
  
  // Cache (5 min TTL, max 50 items)
  const cache = new LRUCache(50)
  const CACHE_TTL = 5 * 60 * 1000
  
  // Check API version on startup (auto-clear cache if version changed)
  checkApiVersion(cache).catch(err => {
    console.error('[TickerStore] Version check error:', err)
  })
  
  // Computed - Individual data accessors
  const profile = computed((): FMPProfile | null => {
    const p = batchData.value?.data?.profile
    if (Array.isArray(p) && p.length > 0 && p[0]) {
      return p[0]
    }
    return null
  })
  
  const quote = computed((): FMPQuote | null => {
    const q = batchData.value?.data?.quote
    if (Array.isArray(q) && q.length > 0 && q[0]) {
      return q[0]
    }
    return null
  })
  
  const incomeStatements = computed((): IncomeStatements => ({
    annual: batchData.value?.data?.incomeAnnual || [],
    quarter: batchData.value?.data?.incomeQuarter || []
  }))
  
  const balanceSheets = computed((): BalanceSheets => ({
    annual: batchData.value?.data?.balanceAnnual || [],
    quarter: batchData.value?.data?.balanceQuarter || []
  }))
  
  const cashFlowStatements = computed((): CashFlowStatements => ({
    annual: batchData.value?.data?.cashflowAnnual || [],
    quarter: batchData.value?.data?.cashflowQuarter || []
  }))
  
  const ratios = computed(() => batchData.value?.data?.ratiosAnnual || [])
  const keyMetrics = computed(() => batchData.value?.data?.keyMetrics || [])
  
  const priceHistory = computed((): FMPHistoricalPrice[] => {
    const hist = batchData.value?.data?.priceHistory
    return hist?.historical || []
  })
  
  const revenueSegments = computed(() => batchData.value?.data?.revenueSegments || [])
  const dividendHistory = computed((): FMPDividend[] => batchData.value?.data?.dividendHistory?.historical || [])
  
  const financialScores = computed((): any | null => {
    const scores = batchData.value?.data?.financialScores
    return Array.isArray(scores) && scores.length > 0 ? scores[0] : null
  })
  
  const insiderTrading = computed((): FMPInsiderTrading[] => batchData.value?.data?.insiderTrading || [])
  const earningsCalendar = computed(() => batchData.value?.data?.earningsCalendar || [])
  
  // Actions
  async function setTicker(ticker: string, mode: 'full' | 'lite' = 'full'): Promise<void> {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    
    currentTicker.value = t
    await fetchTickerData(t, mode)
  }
  
  async function fetchTickerData(ticker: string, mode: 'full' | 'lite' = 'full'): Promise<void> {
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
      const headers: HeadersInit = {}
      if (cached?.etag && cached?.version === currentVersion) {
        headers['If-None-Match'] = cached.etag
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ticker-data/${t}?mode=${mode}`, { headers })
      
      // Handle 304 Not Modified - use cached data (server validated it's still fresh)
      if (response.status === 304 && cached) {
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
      
      const result: BatchData = await response.json()
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
      
    } catch (_err) {
      const errorObj = err as Error
      console.error(`[TickerStore] Error fetching ${t}:`, errorObj)
      error.value = errorObj.message
      batchData.value = null
    } finally {
      loading.value = false
    }
  }
  
  // Refresh current ticker data
  async function refresh(): Promise<void> {
    if (currentTicker.value) {
      // Clear cache for current ticker
      cache.delete(`${currentTicker.value}-full`)
      await fetchTickerData(currentTicker.value, 'full')
    }
  }
  
  // Clear all cache
  function clearCache(): void {
    cache.clear()
  }

  // Set timeframe (annual or quarterly)
  function setTimeframe(newTimeframe: 'annual' | 'quarterly'): void {
    timeframe.value = newTimeframe
  }

  return {
    // State
    currentTicker,
    batchData,
    loading,
    error,
    fetchTime,
    timeframe,
    
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
    setTimeframe,
    
    // Cache monitoring
    getCacheStats: () => cache.getStats()
  }
})
