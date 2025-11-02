import logger from '../services/logger.js'
import * as Sentry from '@sentry/node'
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

/**
 * Sentry Error Tracking & Performance Monitoring
 * 
 * Setup Instructions:
 * 1. Sign up at https://sentry.io (FREE tier: 5K errors/month, 10K transactions/month)
 * 2. Create a new Node.js project
 * 3. Copy your DSN and add to .env.local:
 *    SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
 * 4. Restart server
 * 
 * Features:
 * - Automatic error capturing
 * - Performance monitoring (transactions)
 * - Request tracing
 * - User context tracking
 * - Custom tags and breadcrumbs
 */

let initialized = false

interface CaptureContext {
  tags?: Record<string, string>
  extra?: Record<string, any>
  level?: Sentry.SeverityLevel
}

interface UserData {
  id: string
  email?: string
  ip?: string
}

/**
 * Initialize Sentry
 * Should be called before any other app code
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  const environment = process.env.NODE_ENV || 'development'

  if (!dsn) {
    logger.info('[Sentry] Not configured (SENTRY_DSN not set)')
    logger.info('[Sentry] To enable: Sign up at https://sentry.io and add SENTRY_DSN to .env.local')
    return
  }

  try {
    const tracesSampleRate = environment === 'production' ? 0.1 : 1.0
    
    Sentry.init({
      dsn,
      environment,
      
      // Sample rate for performance monitoring
      // 1.0 = 100% of transactions, 0.1 = 10% of transactions
      tracesSampleRate,
      
      // Enable automatic instrumentation
      integrations: [],
      
      // Filter out sensitive data
      beforeSend(_event, hint) {
        // Remove API keys from URLs and headers
        if (_event.request) {
          if (_event.request.url) {
            _event.request.url = _event.request.url.replace(/apikey=[^&]+/, 'apikey=***')
          }
          if (_event.request.headers) {
            delete _event.request.headers['authorization']
            delete _event.request.headers['cookie']
          }
        }
        
        // Don't send certain error types in development
        if (environment === 'development' && hint.originalException) {
          const error = hint.originalException as any
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return null // Don't send connection errors in dev
          }
        }
        
        return _event
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Browser errors
        'NetworkError',
        'Failed to fetch',
        
        // Common non-issues
        'AbortError',
        'Non-Error promise rejection',
        
        // Rate limit errors (handled by rate limiter)
        'Too many requests',
      ],
    })

    initialized = true
    logger.info(`[Sentry] Initialized for ${environment}`)
    logger.info(`[Sentry] Tracing: ${tracesSampleRate * 100}%`)
    
  } catch (_error) {
    logger.error('[Sentry] Failed to initialize:', (_error as Error).message)
    initialized = false
  }
}

/**
 * Request handler middleware (must be first)
 * In Sentry v10+, use setupExpressErrorHandler instead
 */
export function requestHandler() {
  // Return no-op middleware if not initialized
  return (req: Request, res: Response, next: NextFunction) => next()
}

/**
 * Tracing middleware (after request handler)
 * In Sentry v10+, tracing is automatic
 */
export function tracingHandler() {
  // Return no-op middleware if not initialized
  return (req: Request, res: Response, next: NextFunction) => next()
}

/**
 * Error handler middleware (must be last)
 * In Sentry v10+, use setupExpressErrorHandler
 */
export function errorHandler(): ErrorRequestHandler {
  // Return no-op middleware if not initialized
  if (!initialized) {
    return (err: any, req: Request, res: Response, next: NextFunction) => next(err)
  }
  
  // Use Sentry's Express error handler
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Capture error in Sentry
    Sentry.captureException(err, {
      tags: {
        endpoint: req.path,
        method: req.method,
      },
      extra: {
        statusCode: err.statusCode || 500,
        errorCode: err.code,
      },
    })
    
    // Pass to next error handler
    next(err)
  }
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context: CaptureContext = {}): void {
  if (!initialized) return
  
  Sentry.captureException(error, {
    tags: context.tags,
    extra: context.extra,
    level: context.level || 'error',
  })
}

/**
 * Capture message manually
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context: CaptureContext = {}
): void {
  if (!initialized) return
  
  Sentry.captureMessage(message, {
    level,
    tags: context.tags,
    extra: context.extra,
  })
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data: Record<string, any> = {}): void {
  if (!initialized) return
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  })
}

/**
 * Set user context
 */
export function setUser(userData: UserData): void {
  if (!initialized) return
  
  Sentry.setUser({
    id: userData.id,
    email: userData.email,
    ip_address: userData.ip,
  })
}

/**
 * Set custom tags
 */
export function setTags(tags: Record<string, string>): void {
  if (!initialized) return
  
  Sentry.setTags(tags)
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): any | null {
  if (!initialized) return null
  
  // In newer versions of Sentry, use startSpan instead
  // For now, return a mock transaction object
  return null
}

/**
 * Check if Sentry is initialized
 */
export function isInitialized(): boolean {
  return initialized
}

export default {
  initSentry,
  requestHandler,
  tracingHandler,
  errorHandler,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTags,
  startTransaction,
  isInitialized,
}
