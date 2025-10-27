// src/models/timeframe.ts

/**
 * Timeframe Configuration
 * Defines chart time ranges and intervals
 */

/**
 * Calculate days since start of year
 */
function ytdDays(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const days = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(days, 1)
}

/**
 * Timeframe Key Type
 */
export type TimeframeKey = '5D' | '1M' | '6M' | 'YTD' | '5Y' | 'ALL'

/**
 * Timeframe Configuration Interface
 */
export interface TimeframeConfig {
  /** Yahoo Finance range parameter */
  range: string
  
  /** Yahoo Finance interval parameter */
  interval: string
  
  /** Stooq days parameter (null for ALL) */
  stooqDays: number | null | (() => number)
  
  /** Display title */
  title: string
}

/**
 * Timeframe Configurations
 */
export const TIMEFRAMES: Record<TimeframeKey, TimeframeConfig> = {
  '5D':  { range: '5d',  interval: '30m', stooqDays: 7,       title: '— 5D'  },
  '1M':  { range: '1mo', interval: '1h',  stooqDays: 31,      title: '— 1M'  },
  '6M':  { range: '6mo', interval: '1d',  stooqDays: 200,     title: '— 6M'  },
  'YTD': { range: 'ytd', interval: '1d',  stooqDays: ytdDays, title: '— YTD' },
  '5Y':  { range: '5y',  interval: '1d',  stooqDays: 1850,    title: '— 5Y'  },
  'ALL': { range: 'max', interval: '1mo', stooqDays: null,    title: '— ALL' },
}

/**
 * Timeframe Display Order
 */
export const TF_ORDER: readonly TimeframeKey[] = ['5D', '1M', '6M', 'YTD', '5Y', 'ALL'] as const

/**
 * Default Timeframe
 * Year-To-Date for price chart
 */
export const DEFAULT_TF: TimeframeKey = 'YTD'
