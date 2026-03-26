// src/stores/tickerStore.ts
// Centralized ticker data store using Pinia + TanStack Query
// Replaces custom caching with industry standard server state management

import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { API_BASE_URL } from '../utils/apiConfig'
import type {
  BatchData,
  FMPProfile,
  FMPQuote,
  FMPIncomeStatement,
  FMPBalanceSheet,
  FMPCashFlow,
  FMPRatios,
  FMPKeyMetrics,
  FMPInsiderTrading,
  FMPHistoricalPrice,
  FMPDividend,
  FMPFinancialScore,
  FMPEarnings,
  FMPRevenueProductSegment
} from '../types'
import { trackSearch, trackTickerView } from '../services/analytics/gaService'

// Re-export types for components
export type { BatchData, FMPProfile, FMPQuote, FMPIncomeStatement, FMPBalanceSheet, FMPCashFlow, FMPInsiderTrading, FMPHistoricalPrice, FMPDividend }

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
  timeframe: Ref<'annual' | 'quarterly'>

  // Query State (from Vue Query)
  batchData: Ref<BatchData | undefined>
  loading: Ref<boolean>
  error: Ref<unknown>
  isFetching: Ref<boolean>

  // Computed
  profile: ComputedRef<FMPProfile | null>
  quote: ComputedRef<FMPQuote | null>
  incomeStatements: ComputedRef<IncomeStatements>
  balanceSheets: ComputedRef<BalanceSheets>
  cashFlowStatements: ComputedRef<CashFlowStatements>
  ratios: ComputedRef<FMPRatios[]>
  keyMetrics: ComputedRef<FMPKeyMetrics[]>
  priceHistory: ComputedRef<FMPHistoricalPrice[]>
  revenueSegments: ComputedRef<FMPRevenueProductSegment[]>
  dividendHistory: ComputedRef<FMPDividend[]>
  financialScores: ComputedRef<FMPFinancialScore | null>
  insiderTrading: ComputedRef<FMPInsiderTrading[]>
  earningsCalendar: ComputedRef<FMPEarnings[]>

  // Actions
  setTicker: (ticker: string, mode?: 'full' | 'lite') => Promise<void>
  refresh: () => Promise<void>
  setTimeframe: (timeframe: 'annual' | 'quarterly') => void
}

export async function fetchTickerDataWithSplit(
  ticker: string,
  mode: 'full' | 'lite',
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<BatchData> {
  const t = ticker.trim().toUpperCase()
  if (!t) throw new Error('Ticker is required')

  // Backend supports full|priority; keep lite as frontend alias for priority.
  const apiMode = mode === 'lite' ? 'priority' : mode

  // Preferred path: fire static + dynamic in parallel for lower latency.
  // Dynamic fetch is best-effort and must never block static correctness.
  const staticResponsePromise = fetchImpl(`${apiBaseUrl}/api/ticker-data/${t}/static?mode=${apiMode}`)
  const dynamicResponsePromise = fetchImpl(`${apiBaseUrl}/api/ticker-data/${t}/dynamic`).catch(() => null)

  const staticResponse = await staticResponsePromise
  if (!staticResponse.ok) {
    throw new Error(`HTTP ${staticResponse.status}: ${staticResponse.statusText}`)
  }

  const data = await staticResponse.json() as BatchData

  // Dynamic quote merge remains best-effort; keep static payload on any dynamic failure.
  const dynamicResponse = await dynamicResponsePromise
  if (dynamicResponse && dynamicResponse.ok) {
    try {
      const dynamicPayload = await dynamicResponse.json() as { timestamp?: string; quote?: FMPQuote[] }
      if (Array.isArray(dynamicPayload.quote) && dynamicPayload.quote.length > 0) {
        data.data.quote = dynamicPayload.quote
        if (dynamicPayload.timestamp) {
          data.timestamp = dynamicPayload.timestamp
        }
      }
    } catch {
      // Ignore invalid dynamic payloads and return static payload.
    }
  }

  return data
}

export const useTickerStore = defineStore('ticker', (): TickerStoreState => {
  // State
  const currentTicker = ref('AAPL')
  const timeframe = ref<'annual' | 'quarterly'>('annual')
  const currentMode = ref<'full' | 'lite'>('full')

  // Vue Query: Fetcher function
  const fetchTickerData = async (ticker: string, mode: 'full' | 'lite'): Promise<BatchData> => {
    const startTime = performance.now()
    const t = ticker.trim().toUpperCase()
    const data = await fetchTickerDataWithSplit(t, mode, API_BASE_URL, fetch)

    // Track successful load
    const duration = Math.round(performance.now() - startTime)
    trackTickerView(t, duration)

    return data
  }

  // Vue Query: Main Query
  const {
    data: batchData,
    isLoading: loading,
    error,
    isFetching,
    refetch
  } = useQuery({
    // Unique key for caching: ['ticker', 'AAPL', 'full']
    queryKey: computed(() => ['ticker', currentTicker.value, currentMode.value]),

    // Fetcher function
    queryFn: () => fetchTickerData(currentTicker.value, currentMode.value),

    // Configuration
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 15 * 60 * 1000,   // Keep unused data in memory for 15 minutes
    retry: 2,                 // Retry failed requests twice
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    enabled: computed(() => !!currentTicker.value), // Only run if ticker exists
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

  const financialScores = computed((): FMPFinancialScore | null => {
    const scores = batchData.value?.data?.financialScores
    return Array.isArray(scores) && scores.length > 0 ? scores[0] ?? null : null
  })

  const insiderTrading = computed((): FMPInsiderTrading[] => batchData.value?.data?.insiderTrading || [])
  const earningsCalendar = computed(() => batchData.value?.data?.earningsCalendar || [])

  // Actions
  async function setTicker(ticker: string, mode: 'full' | 'lite' = 'full'): Promise<void> {
    const t = ticker.trim().toUpperCase()
    if (!t || (t === currentTicker.value && mode === currentMode.value)) return

    currentTicker.value = t
    currentMode.value = mode

    // Track ticker search in GA4
    trackSearch(t, 'direct')

    // Note: We don't need to call fetch manually, changing the reactive 
    // currentTicker/currentMode will automatically trigger useQuery
  }

  // Refresh current ticker data
  async function refresh(): Promise<void> {
    await refetch()
  }

  // Set timeframe (annual or quarterly)
  function setTimeframe(newTimeframe: 'annual' | 'quarterly'): void {
    timeframe.value = newTimeframe
  }

  return {
    // State
    currentTicker,
    timeframe,

    // Query State
    batchData,
    loading,
    error,
    isFetching,

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
    refresh,
    setTimeframe
  }
})
