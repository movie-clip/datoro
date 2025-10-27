/**
 * API Request/Response DTOs (Data Transfer Objects)
 * Type-safe interfaces for all API endpoints
 */

import type { Request, Response } from 'express'

// ============================================
// Base Types
// ============================================

export interface ErrorResponse {
  error: string | {
    message: string
    code: string
    details?: string
  }
  errors?: Array<{
    msg?: string
    message?: string
  }>
}

export interface SuccessResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

// ============================================
// Ticker Endpoints (/api/ticker-data)
// ============================================

export interface TickerDataParams {
  ticker: string
}

export interface TickerDataQuery {
  mode?: 'full' | 'priority'
}

export interface TickerDataRequest extends Request<TickerDataParams, unknown, unknown, TickerDataQuery> {
  fmpCallTracked?: boolean
}

export interface TickerDataResponse {
  ticker: string
  timestamp: string
  fetchDuration: number
  data: {
    profile?: unknown[]
    quote?: unknown[]
    incomeAnnual?: unknown[]
    incomeQuarter?: unknown[]
    balanceAnnual?: unknown[]
    balanceQuarter?: unknown[]
    cashFlowAnnual?: unknown[]
    cashFlowQuarter?: unknown[]
    ratios?: unknown[]
    keyMetrics?: unknown[]
    financialScores?: unknown[]
    enterpriseValue?: unknown[]
    dividendHistory?: unknown[]
    stockSplit?: unknown[]
    insiderTrading?: unknown[]
    analystEstimates?: unknown[]
    priceTarget?: unknown[]
    upgrades?: unknown[]
    advancedDcf?: unknown[]
    historicalPrice?: unknown[]
  }
}

// ============================================
// Auth Endpoints (/api/auth)
// ============================================

export interface RegisterBody {
  email: string
  password: string
  name?: string
}

export interface RegisterRequest extends Request<unknown, unknown, RegisterBody> {}

export interface LoginBody {
  email: string
  password: string
}

export interface LoginRequest extends Request<unknown, unknown, LoginBody> {}

export interface GoogleLoginBody {
  credential: string
}

export interface GoogleLoginRequest extends Request<unknown, unknown, GoogleLoginBody> {}

export interface AuthUser {
  id: string
  email: string
  name?: string
  subscriptionTier: 'free' | 'premium' | 'enterprise'
  avatarUrl?: string
  emailVerified: boolean
  createdAt: Date
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: AuthUser
  }
  error?: string
  errors?: Array<{
    msg?: string
    message?: string
  }>
}

export interface LogoutResponse {
  success: boolean
  message: string
}

// ============================================
// Watchlist Endpoints (/api/watchlist)
// ============================================

export interface WatchlistItem {
  ticker: string
  addedAt: Date
  displayOrder: number | null
}

export interface WatchlistResponse {
  tickers: WatchlistItem[]
}

export interface AddWatchlistParams {
  ticker: string
}

export interface AddWatchlistRequest extends Request<AddWatchlistParams> {}

export interface AddWatchlistResponse {
  success: boolean
  ticker: string
  addedAt: Date
}

export interface DeleteWatchlistParams {
  ticker: string
}

export interface DeleteWatchlistRequest extends Request<DeleteWatchlistParams> {}

export interface DeleteWatchlistResponse {
  success: boolean
  ticker: string
}

export interface ReorderWatchlistBody {
  tickers: string[]
}

export interface ReorderWatchlistRequest extends Request<unknown, unknown, ReorderWatchlistBody> {}

export interface ReorderWatchlistResponse {
  success: boolean
}

// ============================================
// Search Endpoints (/api/search)
// ============================================

export interface SearchQuery {
  q: string
  limit?: string
}

export interface SearchRequest extends Request<unknown, unknown, unknown, SearchQuery> {}

export interface SearchResult {
  symbol: string
  name: string
  currency: string
  stockExchange: string
  exchangeShortName: string
}

export interface SearchResponse {
  results: SearchResult[]
  count: number
}

export interface PopularTickersQuery {
  limit?: string
}

export interface PopularTickersRequest extends Request<unknown, unknown, unknown, PopularTickersQuery> {}

export interface PopularTicker {
  ticker: string
  searchCount: number
  companyName?: string
}

export interface PopularTickersResponse {
  tickers: PopularTicker[]
}

// ============================================
// Analytics Endpoints (/api/analytics)
// ============================================

export interface AnalyticsStatsResponse {
  totalRequests: number
  totalSearches: number
  uniqueUsers: number
  popularTickers: Array<{
    ticker: string
    count: number
  }>
  errorRate: number
}

// ============================================
// Health Endpoints (/api/health)
// ============================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      latency?: number
      error?: string
    }
    cache: {
      status: 'healthy' | 'unhealthy'
      error?: string
    }
    fmpApi: {
      status: 'operational' | 'degraded'
      remainingCalls?: number
    }
  }
}

// ============================================
// Admin Endpoints (/api/admin)
// ============================================

export interface AdminStatsResponse {
  database: {
    totalUsers: number
    totalSearches: number
    totalApiRequests: number
  }
  cache: {
    keys: number
    memoryUsage: string
  }
  performance: {
    avgResponseTime: number
    errorRate: number
  }
}

export interface ClearCacheParams {
  pattern?: string
}

export interface ClearCacheRequest extends Request<unknown, unknown, unknown, ClearCacheParams> {}

export interface ClearCacheResponse {
  success: boolean
  keysDeleted: number
}

// ============================================
// Extended Request Types (with user auth)
// ============================================

import type { User } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user?: Partial<User> | null
}

export interface AuthenticatedTickerDataRequest extends TickerDataRequest {
  user?: Partial<User> | null
}

export interface AuthenticatedWatchlistRequest extends Request {
  user?: Partial<User> | null
}

export interface AuthenticatedAddWatchlistRequest extends Request<AddWatchlistParams> {
  user?: Partial<User> | null
}

export interface AuthenticatedDeleteWatchlistRequest extends Request<DeleteWatchlistParams> {
  user?: Partial<User> | null
}

export interface AuthenticatedReorderWatchlistRequest extends Request<unknown, unknown, ReorderWatchlistBody> {
  user?: Partial<User> | null
}
