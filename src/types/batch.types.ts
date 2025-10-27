// src/types/batch.types.ts
// Type definitions for batch data structure used throughout the app

import type {
  FMPProfile,
  FMPQuote,
  FMPIncomeStatement,
  FMPBalanceSheet,
  FMPCashFlow,
  FMPKeyMetrics,
  FMPRatiosTTM,
  FMPEnterpriseValue,
  FMPFinancialGrowth,
  FMPInsiderTrading,
  FMPStockSplit,
  FMPDividend,
  FMPHistoricalPrice,
  FMPPriceTarget,
  FMPDCF
} from './fmp.types'

/**
 * Batch Data Structure
 * Contains all financial data for a ticker from the single batch endpoint
 * Endpoint: /api/ticker-data/:ticker?mode=full
 */
export interface BatchData {
  /** Ticker symbol (e.g., 'AAPL') */
  ticker: string
  
  /** ISO timestamp when data was fetched */
  timestamp: string
  
  /** Time taken to fetch all data (milliseconds) */
  fetchDuration: number
  
  /** All financial data organized by endpoint */
  data: {
    /** Company profile information */
    profile: FMPProfile[]
    
    /** Real-time quote data */
    quote: FMPQuote[]
    
    /** Annual income statements */
    incomeAnnual: FMPIncomeStatement[]
    
    /** Quarterly income statements */
    incomeQuarter: FMPIncomeStatement[]
    
    /** Annual balance sheets */
    balanceAnnual: FMPBalanceSheet[]
    
    /** Quarterly balance sheets */
    balanceQuarter: FMPBalanceSheet[]
    
    /** Annual cash flow statements */
    cashflowAnnual: FMPCashFlow[]
    
    /** Quarterly cash flow statements */
    cashflowQuarter: FMPCashFlow[]
    
    /** Annual ratios */
    ratiosAnnual?: any[]
    
    /** Key metrics (combined annual/quarter) */
    keyMetrics?: any[]
    
    /** Historical price data with structure { symbol, historical: [...] } */
    priceHistory?: { symbol: string; historical: FMPHistoricalPrice[] }
    
    /** Revenue segments by product/geography */
    revenueSegments?: any[]
    
    /** Dividend history with structure { symbol, historical: [...] } */
    dividendHistory?: { symbol: string; historical: FMPDividend[] }
    
    /** Stock split history */
    stockSplit?: { symbol: string; historical: FMPStockSplit[] }
    
    /** Earnings calendar */
    earningsCalendar?: any[]
    
    /** Financial scores (Altman Z, Piotroski, etc.) */
    financialScores?: any[]
    
    /** Price target summary */
    priceTargetSummary?: any[]
    
    /** Price target consensus */
    priceTargetConsensus?: any[]
    
    /** Insider trading transactions */
    insiderTrading: FMPInsiderTrading[]
  }
}

/**
 * Batch Data Response from API
 * Includes metadata about cache source
 */
export interface BatchDataResponse {
  /** The batch data (null if not found or error) */
  data: BatchData | null
  
  /** Where the data came from */
  source: 'memory' | 'redis' | 'api'
  
  /** ETag for cache validation */
  etag?: string
  
  /** API version */
  version?: string
}

/**
 * Cache Entry Structure
 * Used for in-memory and Redis caching
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T
  
  /** Where data is stored */
  source: 'memory' | 'redis'
  
  /** Unix timestamp when cached */
  timestamp: number
  
  /** TTL in seconds (optional) */
  ttl?: number
}

/**
 * Time Series Data Point
 * Used for chart data (price, revenue, FCF, etc.)
 */
export interface SeriesDataPoint {
  /** Unix timestamp (milliseconds) */
  timestamp: number
  
  /** Data value */
  value: number
  
  /** Optional label */
  label?: string
}

/**
 * Chart Series Data
 * Array of [timestamp, value] tuples for ECharts
 */
export type ChartSeriesData = [number, number][]

/**
 * Valuation Metrics
 * Extracted from batch data for valuation table
 */
export interface ValuationMetrics {
  symbol: string
  companyName: string
  price: number
  marketCap: number
  peRatio?: number
  pbRatio?: number
  psRatio?: number
  evToEbitda?: number
  evToSales?: number
  dividendYield?: number
  roe?: number
  roic?: number
  debtToEquity?: number
  currentRatio?: number
  freeCashFlowYield?: number
}

/**
 * Financial Summary
 * Key financial metrics for overview cards
 */
export interface FinancialSummary {
  revenue: number
  revenueGrowth?: number
  netIncome: number
  netIncomeGrowth?: number
  freeCashFlow: number
  fcfGrowth?: number
  grossMargin?: number
  operatingMargin?: number
  netMargin?: number
  eps: number
  epsGrowth?: number
}

/**
 * Timeframe Options
 * For filtering financial data by period
 */
export type Timeframe = 'annual' | 'quarter' | 'ttm' | '1y' | '3y' | '5y' | '10y' | 'all'

/**
 * Data Status
 * Track loading/error states
 */
export interface DataStatus {
  loading: boolean
  error: string | null
  lastFetched?: string
}
