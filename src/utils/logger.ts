// src/utils/logger.ts
// Development-only logger utility
// In production, these calls will be removed by Terser

/**
 * Logger utility that only logs in development mode
 * All console.* calls are automatically removed in production builds by Vite/Terser
 * 
 * Usage:
 *   import { logger } from '@/utils/logger'
 *   logger.log('Debug info')
 *   logger.error('Error occurred')
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * Log general information (development only)
   */
  log(...args: unknown[]): void {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log errors (always logged, even in production for error tracking)
   */
  error(...args: unknown[]): void {
    console.error(...args)
  },

  /**
   * Log warnings (development only)
   */
  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log debug information (development only)
   */
  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * Log informational messages (development only)
   */
  info(...args: unknown[]): void {
    if (isDev) {
      console.info(...args)
    }
  },

  /**
   * Log table data (development only)
   */
  table(data: any): void {
    if (isDev) {
      console.table(data)
    }
  },

  /**
   * Group logs together (development only)
   */
  group(label: string): void {
    if (isDev) {
      console.group(label)
    }
  },

  groupCollapsed(label: string): void {
    if (isDev) {
      console.groupCollapsed(label)
    }
  },

  groupEnd(): void {
    if (isDev) {
      console.groupEnd()
    }
  },

  /**
   * Time operations (development only)
   */
  time(label: string): void {
    if (isDev) {
      console.time(label)
    }
  },

  timeEnd(label: string): void {
    if (isDev) {
      console.timeEnd(label)
    }
  }
}

/**
 * Performance logger for measuring execution time
 */
export class PerformanceLogger {
  private label: string
  private startTime: number

  constructor(label: string) {
    this.label = label
    this.startTime = isDev ? performance.now() : 0
  }

  end(): void {
    if (isDev) {
      const duration = performance.now() - this.startTime
      console.log(`[${this.label}] took ${duration.toFixed(2)}ms`)
    }
  }
}

/**
 * Conditional logger - only log if condition is true
 */
export function logIf(condition: boolean, ...args: unknown[]): void {
  if (isDev && condition) {
    console.log(...args)
  }
}

export default logger
