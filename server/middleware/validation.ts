import Joi from 'joi'
import type { Request, Response, NextFunction } from 'express'

/**
 * Input Validation Middleware using Joi
 * 
 * Validates request parameters, query strings, and body data
 * to prevent invalid data from reaching business logic.
 * 
 * Benefits:
 * - Security: Prevent injection attacks, malformed data
 * - Reliability: Catch errors early before API calls
 * - UX: Return clear validation errors to users
 * - Performance: Avoid unnecessary API calls with bad data
 */

// ============================================
// Common Validation Schemas
// ============================================

/**
 * Stock ticker validation
 * - 1-5 uppercase letters (e.g., AAPL, MSFT, BRK.B)
 * - Allows dots for class shares (e.g., BRK.B)
 */
const tickerSchema = Joi.string()
  .pattern(/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/)
  .required()
  .messages({
    'string.pattern.base': 'Ticker must be 1-5 uppercase letters (e.g., AAPL, MSFT, BRK.B)',
    'any.required': 'Ticker is required'
  });

/**
 * Period validation (annual/quarterly/quarter)
 * FMP API accepts both "quarterly" and "quarter" for quarterly data
 */
const periodSchema = Joi.string()
  .valid('annual', 'quarterly', 'quarter')
  .default('annual')
  .messages({
    'any.only': 'Period must be "annual", "quarterly", or "quarter"'
  });

/**
 * Limit validation (for paginated results)
 */
const limitSchema = Joi.number()
  .integer()
  .min(1)
  .max(100)
  .default(10)
  .messages({
    'number.base': 'Limit must be a number',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  });

/**
 * Date range validation
 */
const dateRangeSchema = Joi.object({
  from: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.format': 'From date must be in ISO format (YYYY-MM-DD)',
      'date.max': 'From date cannot be in the future'
    }),
  to: Joi.date()
    .iso()
    .max('now')
    .greater(Joi.ref('from'))
    .messages({
      'date.format': 'To date must be in ISO format (YYYY-MM-DD)',
      'date.max': 'To date cannot be in the future',
      'date.greater': 'To date must be after from date'
    })
});

// ============================================
// Route-Specific Validation Schemas
// ============================================

/**
 * Company profile validation
 * GET /api/fmp/api/v3/profile/:ticker
 */
export const validateProfile = {
  params: Joi.object({
    ticker: tickerSchema
  })
};

/**
 * Income statement validation
 * GET /api/fmp/api/v3/income-statement/:ticker?period=annual&limit=10
 */
export const validateIncomeStatement = {
  params: Joi.object({
    ticker: tickerSchema
  }),
  query: Joi.object({
    period: periodSchema,
    limit: limitSchema
  })
};

/**
 * Balance sheet validation
 * GET /api/fmp/api/v3/balance-sheet-statement/:ticker?period=annual&limit=10
 */
export const validateBalanceSheet = {
  params: Joi.object({
    ticker: tickerSchema
  }),
  query: Joi.object({
    period: periodSchema,
    limit: limitSchema
  })
};

/**
 * Cash flow validation
 * GET /api/fmp/api/v3/cash-flow-statement/:ticker?period=annual&limit=10
 */
export const validateCashFlow = {
  params: Joi.object({
    ticker: tickerSchema
  }),
  query: Joi.object({
    period: periodSchema,
    limit: limitSchema
  })
};

/**
 * Revenue segments validation
 * GET /api/fmp/api/v4/revenue-product-segmentation?symbol=AAPL&period=annual&structure=flat
 */
export const validateRevenueSegments = {
  query: Joi.object({
    symbol: tickerSchema,
    period: periodSchema,
    structure: Joi.string()
      .valid('flat', 'hierarchical')
      .default('flat')
      .messages({
        'any.only': 'Structure must be either "flat" or "hierarchical"'
      })
  })
};

/**
 * Financial scores validation (Altman Z-Score, Piotroski Score)
 * GET /api/fmp/stable/financial-scores?symbol=AAPL
 */
export const validateFinancialScores = {
  query: Joi.object({
    symbol: tickerSchema.messages({
      'any.required': 'Symbol parameter is required'
    })
  })
};

/**
 * Historical price validation
 * GET /api/fmp/api/v3/historical-price-full/:ticker?from=2020-01-01&to=2023-12-31
 */
export const validateHistoricalPrice = {
  params: Joi.object({
    ticker: tickerSchema
  }),
  query: Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    serietype: Joi.string().valid('line', 'candle').default('line').optional()
  })
};

/**
 * Search validation
 * GET /api/fmp/api/v3/search?query=apple&limit=10
 */
export const validateSearch = {
  query: Joi.object({
    query: Joi.string()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Search query must be at least 1 character',
        'string.max': 'Search query cannot exceed 50 characters',
        'any.required': 'Search query is required'
      }),
    limit: limitSchema,
    exchange: Joi.string()
      .valid('NASDAQ', 'NYSE', 'AMEX', 'ETF', 'MUTUAL_FUND', 'CRYPTO', 'FOREX', 'INDEX')
      .optional()
  })
};

/**
 * AI analysis validation
 * POST /api/ai/analyze
 */
export const validateAIAnalysis = {
  body: Joi.object({
    ticker: tickerSchema,
    type: Joi.string()
      .valid('summary', 'detailed', 'comparison')
      .required()
      .messages({
        'any.only': 'Analysis type must be: summary, detailed, or comparison',
        'any.required': 'Analysis type is required'
      }),
    compareTo: Joi.when('type', {
      is: 'comparison',
      then: Joi.string().pattern(/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/).required(),
      otherwise: Joi.forbidden()
    })
  })
};

// ============================================
// Validation Middleware Factory
// ============================================

interface ValidationSchema {
  params?: Joi.ObjectSchema
  query?: Joi.ObjectSchema
  body?: Joi.ObjectSchema
}

/**
 * Creates validation middleware for a route
 * 
 * @param {Object} schema - Joi validation schema
 * @param {Object} schema.params - Validation for req.params
 * @param {Object} schema.query - Validation for req.query
 * @param {Object} schema.body - Validation for req.body
 * @returns {Function} Express middleware
 * 
 * @example
 * app.get('/api/profile/:ticker', 
 *   validate(validateProfile),
 *   (__req, __res) => { ... }
 * );
 */
export function validate(schema: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params
      if (schema.params) {
        req.params = await schema.params.validateAsync(req.params, {
          abortEarly: false, // Get all errors, not just first
          stripUnknown: true, // Remove unknown fields
          convert: true // Type coercion (e.g., "123" -> 123)
        });
      }

      // Validate query
      if (schema.query) {
        const validatedQuery = await schema.query.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        // Replace req.query (Express makes it read-only, so we override)
        Object.defineProperty(req, 'query', {
          value: validatedQuery,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }

      // Validate body
      if (schema.body) {
        req.body = await schema.body.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
      }

      next();
    } catch (_error: unknown) {
      // Joi validation error
      if (typeof _error === 'object' && _error !== null && 'isJoi' in _error) {
        const joiError = _error as unknown as {
          details: Array<{ path: Array<string | number>; message: string; type: string }>
        }

        return res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'E001',
            timestamp: new Date().toISOString(),
            path: req.path,
            details: joiError.details.map((detail) => ({
              field: detail.path.join('.'),
              message: detail.message,
              type: detail.type
            }))
          }
        });
      }

      // Other errors
      next(_error);
    }
  };
}

/**
 * Sanitize string inputs to prevent XSS
 */
export function sanitizeString<T>(str: T): T | string {
  // Handle null/undefined - return empty string for safety
  if (str === null || str === undefined) {
    return '';
  }
  
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove <script> tags
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, etc.)
    .replace(/alert/gi, '') // Remove 'alert' keyword (XSS vector)
    .trim();
}

/**
 * Validate and sanitize ticker
 * Used in services that bypass middleware
 */
export function validateTicker(ticker: unknown): string {
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker is required and must be a string');
  }

  const cleaned = ticker.toUpperCase().trim();
  
  if (!/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(cleaned)) {
    throw new Error('Invalid ticker format. Must be 1-5 uppercase letters (e.g., AAPL, MSFT)');
  }

  return cleaned;
}

/**
 * Validate period parameter
 */
export function validatePeriod(period: unknown): string {
  if (!period) return 'annual'; // Default
  if (typeof period !== 'string') {
    throw new Error('Period must be a string')
  }
  
  const cleaned = period.toLowerCase().trim();
  
  if (!['annual', 'quarterly'].includes(cleaned)) {
    throw new Error('Period must be "annual" or "quarterly"');
  }

  return cleaned;
}

/**
 * Analytics - Popular Tickers
 * GET /api/analytics/popular?limit=10&days=7
 */
export const validateAnalyticsPopular = {
  query: Joi.object({
    limit: limitSchema.optional(),
    days: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(7)
      .messages({
        'number.base': 'Days must be a number',
        'number.min': 'Days must be at least 1',
        'number.max': 'Days cannot exceed 365'
      })
  })
};

/**
 * Analytics - User Search History
 * GET /api/analytics/history?limit=20
 */
export const validateAnalyticsHistory = {
  query: Joi.object({
    limit: limitSchema.optional()
  })
};

/**
 * Analytics - API Request Stats
 * GET /api/analytics/stats?hours=24
 */
export const validateAnalyticsStats = {
  query: Joi.object({
    hours: Joi.number()
      .integer()
      .min(1)
      .max(720) // Max 30 days
      .default(24)
      .messages({
        'number.base': 'Hours must be a number',
        'number.min': 'Hours must be at least 1',
        'number.max': 'Hours cannot exceed 720 (30 days)'
      })
  })
};

// ============================================
// Export All Schemas
// ============================================

export const schemas = {
  ticker: tickerSchema,
  period: periodSchema,
  limit: limitSchema,
  dateRange: dateRangeSchema
};
