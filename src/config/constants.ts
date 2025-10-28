/**
 * Client-Side Application Constants
 * 
 * Centralized configuration for magic numbers used in the frontend.
 * Extracted for maintainability and consistency.
 */

// ============================================
// CACHE TTL (Time To Live) - in milliseconds
// ============================================

export const CACHE_TTL = {
  /** Default client-side cache duration: 5 minutes */
  DEFAULT: 5 * 60 * 1000,
  
  /** Ticker data cache: 5 minutes */
  TICKER_DATA: 5 * 60 * 1000,
  
  /** Watchlist cache: 5 minutes */
  WATCHLIST: 5 * 60 * 1000,
  
  /** Ticker search results: 5 minutes */
  TICKER_SEARCH: 5 * 60 * 1000,
  
  /** Growth data cache: 5 minutes */
  GROWTH_DATA: 5 * 60 * 1000,
  
  /** Deep Finder data: 5 minutes */
  DEEP_FINDER: 5 * 60 * 1000,
} as const

// ============================================
// DEBOUNCE TIMINGS (milliseconds)
// ============================================

export const DEBOUNCE = {
  /** Deep Finder chart data loading */
  DEEP_FINDER_CHART: 150,
  
  /** Ticker search input */
  TICKER_SEARCH: 300,
  
  /** Window resize events */
  WINDOW_RESIZE: 200,
} as const

// ============================================
// VALIDATION LIMITS
// ============================================

export const VALIDATION = {
  /** Maximum watchlist name length */
  WATCHLIST_NAME_MAX: 50,
  
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
// UI TIMING
// ============================================

export const UI_TIMING = {
  /** Animation duration for transitions (ms) */
  TRANSITION_DURATION: 200,
  
  /** Toast notification duration (ms) */
  TOAST_DURATION: 3000,
  
  /** Loading spinner minimum display time (ms) */
  MIN_LOADING_TIME: 300,
} as const

// ============================================
// TYPE EXPORTS
// ============================================

export type CacheTTLKey = keyof typeof CACHE_TTL
export type DebounceKey = keyof typeof DEBOUNCE
export type ValidationKey = keyof typeof VALIDATION
