// src/utils/logger.js
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
  log(...args) {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log errors (always logged, even in production for error tracking)
   */
  error(...args) {
    console.error(...args)
  },

  /**
   * Log warnings (development only)
   */
  warn(...args) {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log debug information (development only)
   */
  debug(...args) {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * Log informational messages (development only)
   */
  info(...args) {
    if (isDev) {
      console.info(...args)
    }
  },

  /**
   * Log table data (development only)
   */
  table(data) {
    if (isDev) {
      console.table(data)
    }
  },

  /**
   * Group logs together (development only)
   */
  group(label) {
    if (isDev) {
      console.group(label)
    }
  },

  groupCollapsed(label) {
    if (isDev) {
      console.groupCollapsed(label)
    }
  },

  groupEnd() {
    if (isDev) {
      console.groupEnd()
    }
  },

  /**
   * Time operations (development only)
   */
  time(label) {
    if (isDev) {
      console.time(label)
    }
  },

  timeEnd(label) {
    if (isDev) {
      console.timeEnd(label)
    }
  }
}

/**
 * Performance logger for measuring execution time
 */
export class PerformanceLogger {
  constructor(label) {
    this.label = label
    this.startTime = isDev ? performance.now() : 0
  }

  end() {
    if (isDev) {
      const duration = performance.now() - this.startTime
      console.log(`[${this.label}] took ${duration.toFixed(2)}ms`)
    }
  }
}

/**
 * Conditional logger - only log if condition is true
 */
export function logIf(condition, ...args) {
  if (isDev && condition) {
    console.log(...args)
  }
}

export default logger
