// src/types/server.types.ts
// Type definitions for server-side code (Express, routes, middleware, services)

import type { Request, Response, NextFunction } from 'express'
import type { BatchData } from './batch.types'

/**
 * API Error Response
 */
export interface APIError {
  /** Error message */
  message: string
  
  /** Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code: string
  
  /** ISO timestamp */
  timestamp: string
  
  /** Additional error details */
  details?: any
  
  /** HTTP status code */
  status?: number
}

/**
 * API Success Response
 */
export interface APIResponse<T = any> {
  /** Response data */
  data: T
  
  /** Success message (optional) */
  message?: string
  
  /** Metadata (pagination, cache source, etc.) */
  meta?: Record<string, any>
}

/**
 * Route Configuration
 * Injected dependencies for route modules
 */
export interface RouteConfig {
  /** Current API version */
  apiVersion: string
  
  /** FMP API key (injected from env) */
  fmpApiKey: string
  
  /** Database availability flag */
  isDatabaseAvailable: boolean
}

/**
 * Cache Service Methods
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
  keys(pattern?: string): Promise<string[]>
}

/**
 * Database Service Methods
 */
export interface DatabaseService {
  isAvailable(): Promise<boolean>
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<void>
  close(): Promise<void>
}

/**
 * Logger Service Methods
 */
export interface LoggerService {
  info(message: string, meta?: Record<string, any>): void
  warn(message: string, meta?: Record<string, any>): void
  error(message: string, error?: Error, meta?: Record<string, any>): void
  debug(message: string, meta?: Record<string, any>): void
}

/**
 * Monitoring Metrics
 */
export interface MonitoringMetrics {
  /** Total API requests */
  totalRequests: number
  
  /** Cache hits */
  cacheHits: number
  
  /** Cache misses */
  cacheMisses: number
  
  /** Failed requests */
  failedRequests: number
  
  /** Average response time (ms) */
  avgResponseTime: number
  
  /** Uptime (seconds) */
  uptime: number
  
  /** Memory usage (MB) */
  memoryUsage: number
  
  /** Timestamp */
  timestamp: string
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  /** Overall status */
  status: 'healthy' | 'degraded' | 'unhealthy'
  
  /** ISO timestamp */
  timestamp: string
  
  /** Uptime in seconds */
  uptime: number
  
  /** Database status */
  database: 'connected' | 'disconnected' | 'unavailable'
  
  /** Redis status */
  redis: 'connected' | 'disconnected' | 'unavailable'
  
  /** Memory usage */
  memory?: {
    used: number
    total: number
    percentage: number
  }
  
  /** Additional checks */
  checks?: Record<string, any>
}

/**
 * Search Result
 */
export interface SearchResult {
  /** Ticker symbol */
  symbol: string
  
  /** Company name */
  name: string
  
  /** Exchange (e.g., 'NASDAQ', 'NYSE') */
  exchange?: string
  
  /** Security type (e.g., 'stock', 'ETF') */
  type?: string
  
  /** Currency */
  currency?: string
  
  /** Match score (0-1) */
  score?: number
}

/**
 * Deep Finder Result
 * Stocks by distance from MA200
 */
export interface DeepFinderResult {
  /** Ticker symbol */
  symbol: string
  
  /** Company name */
  name: string
  
  /** Current price */
  price: number
  
  /** 200-day moving average */
  ma200: number
  
  /** Distance from MA200 (percentage) */
  distanceFromMA200: number
  
  /** Market cap */
  marketCap?: number
  
  /** Volume */
  volume?: number
}

/**
 * Analytics - Popular Tickers
 */
export interface PopularTicker {
  /** Ticker symbol */
  ticker: string
  
  /** Search count */
  searchCount: number
  
  /** Company name (if available) */
  companyName?: string
}

/**
 * Analytics - User Search History
 */
export interface SearchHistory {
  /** Ticker symbol */
  ticker: string
  
  /** Timestamp */
  timestamp: string
  
  /** User IP (hashed) */
  userIp?: string
}

/**
 * Request with Custom Properties
 * Extended Express Request type
 */
export interface CustomRequest extends Request {
  /** Request ID for tracking */
  requestId?: string
  
  /** User ID (if authenticated) */
  userId?: string
  
  /** Start time for response time calculation */
  startTime?: number
}

/**
 * Async Request Handler
 * For asyncHandler wrapper
 */
export type AsyncRequestHandler = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response>

/**
 * Batch Fetch Options
 */
export interface BatchFetchOptions {
  /** Ticker symbol */
  ticker: string
  
  /** Fetch mode ('full' or 'minimal') */
  mode?: 'full' | 'minimal'
  
  /** Force refresh (skip cache) */
  forceRefresh?: boolean
  
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Batch Fetch Result
 */
export interface BatchFetchResult {
  /** Batch data */
  data: BatchData | null
  
  /** Cache source */
  source: 'memory' | 'redis' | 'api'
  
  /** Fetch duration (ms) */
  duration: number
  
  /** ETag for caching */
  etag?: string
  
  /** Errors (if any) */
  errors?: string[]
}

/**
 * Rate Limit Info
 */
export interface RateLimitInfo {
  /** Limit per window */
  limit: number
  
  /** Current count */
  current: number
  
  /** Remaining requests */
  remaining: number
  
  /** Reset time (Unix timestamp) */
  reset: number
}

/**
 * Validation Error Detail
 */
export interface ValidationError {
  /** Field name */
  field: string
  
  /** Error message */
  message: string
  
  /** Received value */
  value?: any
}
