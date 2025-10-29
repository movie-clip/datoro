/**
 * Application Constants
 * 
 * Centralized configuration for magic numbers used throughout the application.
 * Extracted for maintainability and consistency.
 */

// ============================================
// CACHE TTL (Time To Live) - in milliseconds
// ============================================

export const CACHE_TTL = {
  /** Client-side cache duration: 5 minutes */
  CLIENT: 5 * 60 * 1000,
  
  /** Server memory cache duration: 5 minutes (aligned with client) */
  MEMORY: 5 * 60 * 1000,
  
  /** Session cache duration: 1 minute */
  SESSION: 60 * 1000,
  
  /** Rate limiter Redis key expiration: 1 minute */
  RATE_LIMIT: 60,
} as const

// ============================================
// REDIS CACHE TTL - in seconds
// ============================================

export const REDIS_TTL = {
  /** Default TTL for cached data: 1 hour */
  DEFAULT: 3600,
  
  /** Real-time quote: 5 minutes */
  QUOTE: 5 * 60,
  
  /** Current price: 15 minutes (increased for better caching) */
  PRICE: 15 * 60,
  
  /** Price history data: 8 hours (historical data changes infrequently) */
  PRICE_HISTORY: 8 * 60 * 60,
  
  /** Financial statements: 7 days (quarterly reports) */
  FINANCIAL_STATEMENTS: 7 * 24 * 60 * 60,
  
  /** Income statements: 7 days */
  INCOME_STATEMENT: 7 * 24 * 60 * 60,
  
  /** Balance sheets: 7 days */
  BALANCE_SHEET: 7 * 24 * 60 * 60,
  
  /** Cash flow statements: 7 days */
  CASH_FLOW: 7 * 24 * 60 * 60,
  
  /** Financial ratios: 7 days */
  RATIOS: 7 * 24 * 60 * 60,
  
  /** Revenue segments: 7 days */
  REVENUE_SEGMENTS: 7 * 24 * 60 * 60,
  
  /** Company profiles: 7 days (rarely changes) */
  COMPANY_PROFILE: 7 * 24 * 60 * 60,
  
  /** Financial scores (Altman Z-Score): 7 days */
  FINANCIAL_SCORES: 7 * 24 * 60 * 60,
  
  /** Key metrics: 7 days */
  KEY_METRICS: 7 * 24 * 60 * 60,
  
  /** Analyst estimates: 7 days (rarely changes) */
  ANALYST_ESTIMATES: 7 * 24 * 60 * 60,
  
  /** AI analysis: 30 days (expensive to regenerate) */
  AI_ANALYSIS: 30 * 24 * 60 * 60,
  
  // ============================================
  // MACRO DATA (Global - same for all users)
  // ============================================
  
  /** Macro economic indicators (GDP, CPI, unemployment): 7 days (updates monthly/quarterly) */
  MACRO_LONG: 7 * 24 * 60 * 60,
  
  /** Macro historical data (treasury rates, indices): 7 days (historical data doesn't change) */
  MACRO_HISTORICAL: 7 * 24 * 60 * 60,
  
  /** Macro current quotes (index prices): 15 minutes (reasonable delay for macro view) */
  MACRO_QUOTE: 15 * 60,
  
  /** Macro calculated data (risk premiums): 1 hour (derived from treasury rates) */
  MACRO_CALCULATED: 60 * 60,
} as const

// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMIT = {
  /** Time window for rate limiting: 1 minute */
  WINDOW_MS: 60 * 1000,
  
  /** General API requests per minute */
  GENERAL_MAX: 100,
  
  /** FMP API requests per IP per minute */
  FMP_PER_IP_MAX: 30,
  
  /** Global FMP limit across all IPs (83% of 300 quota) */
  FMP_GLOBAL_MAX: 250,
  
  /** Admin endpoint requests per minute */
  ADMIN_MAX: 10,
  
  /** AI endpoint requests per minute (expensive operations) */
  AI_MAX: 5,
} as const

// ============================================
// SPEED LIMITING
// ============================================

export const SPEED_LIMIT = {
  /** Time window: 1 minute */
  WINDOW_MS: 60 * 1000,
  
  /** Allow this many requests at full speed */
  DELAY_AFTER: 30,
  
  /** Add this much delay per request over limit (ms) */
  DELAY_PER_REQUEST_MS: 500,
  
  /** Maximum delay before blocking (ms) */
  MAX_DELAY_MS: 5000,
} as const

// ============================================
// MEMORY LIMITS
// ============================================

export const MEMORY_LIMITS = {
  /** Maximum memory cache size: 100 MB */
  CACHE_SIZE: 100 * 1024 * 1024,
  
  /** Vite chunk size warning limit: 1000 KB */
  VITE_CHUNK_WARNING: 1000,
} as const

// ============================================
// VALIDATION LIMITS
// ============================================

export const VALIDATION = {
  /** Minimum watchlist name length */
  WATCHLIST_NAME_MIN: 1,
  
  /** Maximum watchlist name length */
  WATCHLIST_NAME_MAX: 50,
  
  /** Maximum user name length */
  USER_NAME_MAX: 100,
  
  /** Maximum number of watchlists per user */
  MAX_WATCHLISTS: 5,
} as const

// ============================================
// DCF CALCULATOR BOUNDS
// ============================================

export const DCF_BOUNDS = {
  PE_RATIO: { min: 0, max: 100 },
  FCF_GROWTH_RATE: { min: -50, max: 100 },
  TERMINAL_GROWTH_RATE: { min: 0, max: 10 },
  DISCOUNT_RATE: { min: 0, max: 30 },
  PROJECTION_YEARS: { min: 3, max: 10 },
} as const

// ============================================
// DEBOUNCE TIMINGS
// ============================================

export const DEBOUNCE = {
  /** Deep Finder chart data loading: 150ms */
  DEEP_FINDER_CHART: 150,
  
  /** Ticker search: 300ms */
  TICKER_SEARCH: 300,
} as const

// ============================================
// HTTP CACHE HEADERS
// ============================================

export const HTTP_CACHE = {
  /** Static assets max-age: 1 year */
  STATIC_ASSETS_MAX_AGE: 31536000,
} as const

// ============================================
// TYPE EXPORTS
// ============================================

export type CacheTTLKey = keyof typeof CACHE_TTL
export type RedisTTLKey = keyof typeof REDIS_TTL
export type RateLimitKey = keyof typeof RATE_LIMIT
