// src/types/index.ts
// Central export file for all TypeScript types

// FMP API Types
export type {
  FMPProfile,
  FMPQuote,
  FMPIncomeStatement,
  FMPBalanceSheet,
  FMPCashFlow,
  FMPKeyMetrics,
  FMPRatiosTTM,
  FMPRatios,
  FMPEnterpriseValue,
  FMPFinancialGrowth,
  FMPInsiderTrading,
  FMPStockSplit,
  FMPDividend,
  FMPHistoricalPrice,
  FMPPriceTarget,
  FMPRevenueProductSegment,
  FMPRevenueGeographicSegment,
  FMPFinancialScore,
  FMPPriceTargetSummary,
  FMPPriceTargetConsensus,
  FMPDCF
} from './fmp.types'

// Batch Data Types
export type {
  BatchData,
  BatchDataResponse,
  CacheEntry,
  SeriesDataPoint,
  ChartSeriesData,
  ValuationMetrics,
  FinancialSummary,
  Timeframe,
  DataStatus
} from './batch.types'

// Server Types
export type {
  APIError,
  APIResponse,
  RouteConfig,
  CacheService,
  DatabaseService,
  LoggerService,
  MonitoringMetrics,
  HealthCheckResponse,
  SearchResult,
  DeepFinderResult,
  PopularTicker,
  SearchHistory,
  CustomRequest,
  AsyncRequestHandler,
  BatchFetchOptions,
  BatchFetchResult,
  RateLimitInfo,
  ValidationError
} from './server.types'

// Composable Types
export type {
  UseTickerDataReturn,
  UseSeriesReturn,
  UseChartSeriesReturn,
  UsePriceSeriesReturn,
  UseDcfCalculatorReturn,
  DcfInputs,
  UseValuationReturn,
  UseFinancialMetricsReturn,
  UseSearchReturn,
  UseDeepFinderReturn,
  UseTimeframeReturn,
  UseGrowthCalculatorReturn
} from './composable.types'

// Re-export search and deep finder result types from composable
export type { SearchResult as ComposableSearchResult } from './composable.types'
export type { DeepFinderResult as ComposableDeepFinderResult } from './composable.types'
export type { Timeframe as ComposableTimeframe } from './composable.types'
