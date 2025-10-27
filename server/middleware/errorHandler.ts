/**
 * Centralized Error Handling Middleware
 * 
 * Provides consistent error responses and integrates with Sentry for tracking.
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
  var Sentry: any
}

// Custom error class
export class AppError extends Error {
  statusCode: number
  code: string
  details: any
  isOperational: boolean

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details: any = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true // Operational errors vs programming errors
    Error.captureStackTrace(this, this.constructor)
  }
}

// Predefined error codes
export const ErrorCodes = {
  // Client errors (4xx)
  INVALID_INPUT: 'E001',
  TICKER_NOT_FOUND: 'E002',
  MISSING_PARAMETER: 'E003',
  INVALID_PERIOD: 'E004',
  
  // API errors (4xx/5xx)
  API_RATE_LIMIT: 'E101',
  FMP_API_ERROR: 'E102',
  FMP_RATE_LIMIT: 'E103',
  API_TIMEOUT: 'E104',
  
  // Cache errors (5xx)
  CACHE_ERROR: 'E201',
  REDIS_CONNECTION_ERROR: 'E202',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'E500',
  SERVICE_UNAVAILABLE: 'E503',
};

// Error factory functions
export const createError = {
  invalidInput: (message: string, details?: any) => 
    new AppError(message, 400, ErrorCodes.INVALID_INPUT, details),
  
  tickerNotFound: (ticker: string) => 
    new AppError(`Ticker "${ticker}" not found`, 404, ErrorCodes.TICKER_NOT_FOUND, { ticker }),
  
  missingParameter: (param: string) => 
    new AppError(`Missing required parameter: ${param}`, 400, ErrorCodes.MISSING_PARAMETER, { param }),
  
  rateLimitExceeded: (message: string) => 
    new AppError(message, 429, ErrorCodes.API_RATE_LIMIT),
  
  fmpApiError: (message: string, statusCode?: number) => 
    new AppError(message, statusCode || 502, ErrorCodes.FMP_API_ERROR),
  
  cacheError: (message: string) => 
    new AppError(message, 500, ErrorCodes.CACHE_ERROR),
  
  internalError: (message: string) => 
    new AppError(message, 500, ErrorCodes.INTERNAL_ERROR),
};

/**
 * Global error handler middleware
 * Should be used as the last middleware in the Express app
 * Can accept monitoring service for tracking
 */
export function errorHandler(monitoringService: any = null): ErrorRequestHandler {
  return (err: any, req: Request, res: Response, _next: NextFunction) => {
    // Default to 500 if not specified
    const statusCode = err.statusCode || 500;
    const code = err.code || ErrorCodes.INTERNAL_ERROR;
    const isOperational = err.isOperational || false;

    // Track in monitoring service if provided
    if (monitoringService) {
      monitoringService.trackError(err, req);
    }

    // Log error with request ID (will be captured by Sentry if initialized)
    const logData = {
      requestId: req.id,
      message: err.message,
      code,
      path: req.path,
      method: req.method,
      ip: req.ip,
      isOperational
    };

    if (statusCode >= 500) {
      console.error('[ERROR]', {
        ...logData,
        stack: err.stack
      });
      
      // Add request ID to Sentry context
      if (req.id && global.Sentry) {
        global.Sentry.setTag('request_id', req.id);
      }
    } else {
      console.warn('[WARN]', logData);
    }

    // Don't leak error details in production for non-operational errors
    const isProd = process.env.NODE_ENV === 'production';
    const shouldHideDetails = isProd && !isOperational;

    // Build error response with request ID for debugging
    const errorResponse: any = {
      error: {
        message: shouldHideDetails ? 'Internal server error' : err.message,
        code,
        timestamp: new Date().toISOString(),
        path: req.path,
        requestId: req.id // Include request ID for support/debugging
      }
    };

    // Add details if available (and not in production for non-operational errors)
    if (err.details && !shouldHideDetails) {
      errorResponse.error.details = err.details;
    }

    // Add stack trace in development
    if (!isProd && err.stack) {
      errorResponse.error.stack = err.stack.split('\n').slice(0, 5); // First 5 lines
    }

    res.status(statusCode).json(errorResponse)
  }
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'E404',
    { method: req.method, path: req.path }
  );
  next(error);
}

/**
 * Async error wrapper - catches errors from async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request logger middleware
 * Can accept monitoring service for tracking
 */
export function requestLogger(monitoringService: any = null) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 500 ? 'error' : 
                       res.statusCode >= 400 ? 'warn' : 'info';
      
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      };

      // Track in monitoring service if provided
      if (monitoringService) {
        monitoringService.trackRequest(req, res, duration);
      }

      if (logLevel === 'error') {
        console.error('[REQUEST]', logData);
      } else if (logLevel === 'warn') {
        console.warn('[REQUEST]', logData);
      } else {
        console.log('[REQUEST]', logData);
      }
    });

    next();
  };
}

export default {
  AppError,
  ErrorCodes,
  createError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestLogger
};
