// src/types/composable.types.ts
// Type definitions for Vue composables return types

import type { Ref, ComputedRef } from 'vue'
import type { BatchData, SeriesDataPoint, ChartSeriesData } from './batch.types'

/**
 * useTickerData Composable
 * Main composable for fetching and managing ticker batch data
 */
export interface UseTickerDataReturn {
  /** Batch data (reactive) */
  batchData: ComputedRef<BatchData | null>
  
  /** Loading state */
  loading: ComputedRef<boolean>
  
  /** Error message */
  error: ComputedRef<string | null>
  
  /** Current ticker */
  ticker: ComputedRef<string>
  
  /** Fetch data for ticker */
  fetchData: (ticker: string) => Promise<void>
  
  /** Refresh current ticker data (skip cache) */
  refresh: () => Promise<void>
}

/**
 * Series Composable Return Type
 * For all chart data composables (revenue, FCF, EPS, etc.)
 */
export interface UseSeriesReturn {
  /** Time series data points */
  series: ComputedRef<SeriesDataPoint[]>
  
  /** Loading state */
  loading: ComputedRef<boolean>
  
  /** Error message */
  error: ComputedRef<string | null>
  
  /** Data availability flag */
  hasData: ComputedRef<boolean>
}

/**
 * Chart Series Composable Return Type
 * For composables returning ECharts-compatible data
 */
export interface UseChartSeriesReturn {
  /** Chart series data [timestamp, value][] */
  series: ComputedRef<ChartSeriesData>
  
  /** Loading state */
  loading: ComputedRef<boolean>
  
  /** Error message */
  error: ComputedRef<string | null>
  
  /** Data availability flag */
  hasData: ComputedRef<boolean>
  
  /** Latest value */
  latestValue: ComputedRef<number | null>
  
  /** Growth rate (YoY or QoQ) */
  growthRate: ComputedRef<number | null>
}

/**
 * usePriceSeries Composable
 */
export interface UsePriceSeriesReturn extends UseChartSeriesReturn {
  /** Current price */
  currentPrice: ComputedRef<number | null>
  
  /** Price change ($ amount) */
  priceChange: ComputedRef<number | null>
  
  /** Price change percentage */
  priceChangePercent: ComputedRef<number | null>
  
  /** 52-week high */
  yearHigh: ComputedRef<number | null>
  
  /** 52-week low */
  yearLow: ComputedRef<number | null>
}

/**
 * useDcfCalculator Composable
 */
export interface UseDcfCalculatorReturn {
  /** DCF intrinsic value */
  intrinsicValue: ComputedRef<number | null>
  
  /** Current stock price */
  currentPrice: ComputedRef<number | null>
  
  /** Margin of safety (percentage) */
  marginOfSafety: ComputedRef<number | null>
  
  /** Valuation status (undervalued/overvalued) */
  valuationStatus: ComputedRef<'undervalued' | 'fairly-valued' | 'overvalued' | null>
  
  /** Loading state */
  loading: ComputedRef<boolean>
  
  /** Error message */
  error: ComputedRef<string | null>
  
  /** DCF inputs */
  inputs: ComputedRef<DcfInputs | null>
  
  /** Recalculate with custom inputs */
  calculate: (customInputs?: Partial<DcfInputs>) => void
}

/**
 * DCF Calculator Inputs
 */
export interface DcfInputs {
  /** Free cash flow (latest) */
  freeCashFlow: number
  
  /** FCF growth rate (5-10 years) */
  growthRate: number
  
  /** Terminal growth rate */
  terminalGrowthRate: number
  
  /** Discount rate (WACC) */
  discountRate: number
  
  /** Number of shares outstanding */
  sharesOutstanding: number
  
  /** Cash and equivalents */
  cash: number
  
  /** Total debt */
  totalDebt: number
}

/**
 * useValuation Composable
 */
export interface UseValuationReturn {
  /** P/E ratio */
  peRatio: ComputedRef<number | null>
  
  /** P/B ratio */
  pbRatio: ComputedRef<number | null>
  
  /** P/S ratio */
  psRatio: ComputedRef<number | null>
  
  /** EV/EBITDA */
  evToEbitda: ComputedRef<number | null>
  
  /** Dividend yield */
  dividendYield: ComputedRef<number | null>
  
  /** FCF yield */
  fcfYield: ComputedRef<number | null>
  
  /** Loading state */
  loading: ComputedRef<boolean>
  
  /** Error message */
  error: ComputedRef<string | null>
}

/**
 * useFinancialMetrics Composable
 */
export interface UseFinancialMetricsReturn {
  /** Revenue (latest) */
  revenue: ComputedRef<number | null>
  
  /** Revenue growth (YoY) */
  revenueGrowth: ComputedRef<number | null>
  
  /** Net income (latest) */
  netIncome: ComputedRef<number | null>
  
  /** Net income growth (YoY) */
  netIncomeGrowth: ComputedRef<number | null>
  
  /** Free cash flow (latest) */
  freeCashFlow: ComputedRef<number | null>
  
  /** FCF growth (YoY) */
  fcfGrowth: ComputedRef<number | null>
  
  /** Gross margin */
  grossMargin: ComputedRef<number | null>
  
  /** Operating margin */
  operatingMargin: ComputedRef<number | null>
  
  /** Net margin */
  netMargin: ComputedRef<number | null>
  
  /** ROE */
  roe: ComputedRef<number | null>
  
  /** ROIC */
  roic: ComputedRef<number | null>
  
  /** Loading state */
  loading: ComputedRef<boolean>
  
  /** Error message */
  error: ComputedRef<string | null>
}

/**
 * useSearch Composable
 */
export interface UseSearchReturn {
  /** Search query */
  query: Ref<string>
  
  /** Search results */
  results: Ref<SearchResult[]>
  
  /** Loading state */
  loading: Ref<boolean>
  
  /** Error message */
  error: Ref<string | null>
  
  /** Perform search */
  search: (query: string) => Promise<void>
  
  /** Clear results */
  clear: () => void
}

/**
 * Search Result (for useSearch)
 */
export interface SearchResult {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

/**
 * useDeepFinder Composable
 */
export interface UseDeepFinderReturn {
  /** Deep finder results */
  results: Ref<DeepFinderResult[]>
  
  /** Loading state */
  loading: Ref<boolean>
  
  /** Error message */
  error: Ref<string | null>
  
  /** Fetch deep finder data */
  fetch: (minDistance?: number, maxDistance?: number) => Promise<void>
  
  /** Sort by field */
  sortBy: (field: keyof DeepFinderResult, ascending?: boolean) => void
}

/**
 * Deep Finder Result (for useDeepFinder)
 */
export interface DeepFinderResult {
  symbol: string
  name: string
  price: number
  ma200: number
  distanceFromMA200: number
  marketCap?: number
  volume?: number
}

/**
 * useTimeframe Composable
 */
export interface UseTimeframeReturn {
  /** Current timeframe */
  timeframe: Ref<Timeframe>
  
  /** Set timeframe */
  setTimeframe: (timeframe: Timeframe) => void
  
  /** Get data for current timeframe */
  getData: <T>(
    annual: T[],
    quarterly: T[],
    dateField?: keyof T
  ) => T[]
}

/**
 * Timeframe Type
 */
export type Timeframe = 'annual' | 'quarterly' | '1y' | '3y' | '5y' | '10y' | 'all'

/**
 * useGrowthCalculator Composable
 */
export interface UseGrowthCalculatorReturn {
  /** Calculate CAGR */
  calculateCAGR: (
    startValue: number,
    endValue: number,
    years: number
  ) => number | null
  
  /** Calculate YoY growth */
  calculateYoYGrowth: (
    currentValue: number,
    previousValue: number
  ) => number | null
  
  /** Calculate average growth rate */
  calculateAverageGrowth: (values: number[]) => number | null
}
