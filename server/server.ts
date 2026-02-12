// server/server.ts — FMP Proxy Server (ESM, Node 18+)
// Run: npm run server (or: node server/server.ts)

/// <reference path="./types/express.d.ts" />

import express, { type Express, type Request, type Response } from 'express'
import compression from 'compression'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getCacheService, CacheTTL } from './services/cacheService.js'
import { getMonitoringService } from './services/monitoringService.js'
import logger from './services/logger.js'
import * as sentryService from './services/sentryService.js'
import authRoutes from './routes/authRoutes.js'
import watchlistRoutes from './routes/watchlist.js'
import watchlistsRoutes from './routes/watchlists.js'
import watchlistItemsRoutes from './routes/watchlistItems.js'
import subscriptionRoutes from './routes/subscription.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import tickerRoutes, { initTickerRoutes } from './routes/tickerRoutes.js'
import searchRoutes, { initSearchRoutes } from './routes/searchRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import healthRoutes, { initHealthRoutes } from './routes/healthRoutes.js'
import adminRoutes, { initAdminRoutes } from './routes/adminRoutes.js'
import macroRoutes, { initMacroRoutes } from './routes/macro.js'
import feedbackRoutes, { initFeedbackRoutes } from './routes/feedback.js'
import newsRoutes, { initNewsRoutes } from './routes/newsRoutes.js'
import marketPerformanceRoutes from './routes/marketPerformance.js'
import { 
  validateProfile,
  validateIncomeStatement,
  validateBalanceSheet,
  validateCashFlow,
  validateRevenueSegments,
  validateFinancialScores,
  validateHistoricalPrice,
  validateSearch
} from './middleware/validation.js'
import { 
  trackSearch, 
  updateTickerCompanyName, 
  trackApiRequest,
  getPrismaClient
} from './services/databaseService.js'
import { 
  fmpLimiter, 
  speedLimiter,
  initializeRateLimiters
} from './middleware/rateLimiter.js'
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger
} from './middleware/errorHandler.js'
import { requestId } from './middleware/requestId.js'

// Load environment variables from .env first, then .env.local (overrides)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env') })
config({ path: join(__dirname, '..', '.env.local'), override: true })

// Initialize services
const cache = getCacheService()
const monitoring = getMonitoringService()

// Connect to Redis before registering routes so rate limiting is cluster-safe in production.
// If Redis is unavailable, CacheService will fall back to memory-only mode.
await cache.connect()

// Initialize rate limiters (Redis-backed when available)
initializeRateLimiters(cache.getRedisClient())

// API Version - increment when FMP endpoints change to auto-invalidate caches
// v2.3 - Added fmpDcf endpoint to batch data service
const API_VERSION = 'v2.12' // Price history fix - cache invalidation
const API_UPDATED = '2025-11-09T22:00:00Z'

// Database health flag (disabled if offline to prevent 5s timeouts)
let isDatabaseAvailable = true

const PORT = Number(process.env.PORT) || 7071
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173'
const FMP_API_KEY = process.env.FMP_API_KEY || ''

// Validate FMP API key on startup
if (!FMP_API_KEY) {
  logger.error('[FMP] CRITICAL: FMP_API_KEY environment variable is required')
  logger.error('[FMP] Server cannot start without FMP API key')
  logger.error('[FMP] Please add FMP_API_KEY to your .env file')
  throw new Error('FMP_API_KEY environment variable is required')
}

// Validate FMP key format (32 alphanumeric characters)
if (!/^[a-zA-Z0-9]{32}$/.test(FMP_API_KEY)) {
  logger.warn('[FMP] WARNING: FMP_API_KEY format looks invalid (expected 32 alphanumeric characters)')
  logger.warn(`[FMP] Key length: ${FMP_API_KEY.length} chars`)
  logger.warn('[FMP] API requests may fail. Please verify your FMP API key.')
}

const app: Express = express()

// Trust Render proxy for rate limiting and IP detection
// Render runs behind a proxy, so we need to trust X-Forwarded-* headers
app.set('trust proxy', 1)

// Enable Express strong ETags for automatic caching of static responses
app.set('etag', 'strong')

// Initialize Sentry FIRST (before any other middleware)
sentryService.initSentry()

// Sentry request handler (must be first middleware)
app.use(sentryService.requestHandler())
app.use(sentryService.tracingHandler())

// Request ID middleware (must be early for logging)
app.use(requestId())

// Security headers (helmet) - protect against common attacks
import { securityHeaders, customSecurityHeaders } from './middleware/security.js'
app.use(securityHeaders())
app.use(customSecurityHeaders)

// Request logging with monitoring (after request ID for correlation)
app.use(requestLogger(monitoring))

// Response compression (gzip/brotli) - 70-80% bandwidth reduction
app.use(compression({
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))

// CORS configuration (supports multiple origins for production)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [DEV_ORIGIN];

// Production safety check: Prevent silent CORS failures
if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  logger.error('[CORS] CRITICAL: ALLOWED_ORIGINS not set in production!')
  logger.error('[CORS] This will block all production requests.')
  logger.error('[CORS] Check Render dashboard environment variables.')
  logger.error(`[CORS] Currently falling back to DEV_ORIGIN: ${DEV_ORIGIN}`)
  // In production without ALLOWED_ORIGINS, use a sensible default
  if (!allowedOrigins.includes('https://datoro.onrender.com')) {
    allowedOrigins.push('https://datoro.onrender.com')
    logger.warn('[CORS] Auto-adding https://datoro.onrender.com as emergency fallback')
  }
}

logger.info(`[CORS] Allowed origins: ${JSON.stringify(allowedOrigins)}`)
logger.info(`[CORS] NODE_ENV: ${process.env.NODE_ENV}`)

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // In development, allow any origin (localhost, local network IPs, etc.)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`[CORS] Allowing development origin: ${origin}`);
      return callback(null, true);
    }
    
    // In production, check allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from origin: ${origin}`, { allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'If-None-Match', 'X-Admin-Key'],
  exposedHeaders: ['X-Cache', 'X-Request-Id', 'ETag'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}))

// Webhook routes MUST use raw body for Stripe signature verification
// Must be registered BEFORE express.json() middleware
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }))

// Body parser with size limits (prevent DoS attacks)
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser()) // Parse cookies for session management

// URL normalization middleware (SEO - prevents duplicate content)
import { urlNormalization, addCanonicalHeader } from './middleware/urlNormalization.js'
app.use(urlNormalization)
app.use(addCanonicalHeader)

// Speed limiter (slows down heavy users)
app.use(speedLimiter)

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ============================================
// FMP Proxy Allowlist (SECURITY)
// ============================================
// The /api/fmp proxy injects the server-side FMP API key.
// This must be strict allowlist to prevent abuse/quota exhaustion.
const FMP_PROXY_ALLOWED_METHODS = new Set(['GET', 'HEAD'])

// IMPORTANT: these patterns match the upstream path portion only (no query string).
// Keep them tight: no wildcards that allow arbitrary endpoints.
const FMP_PROXY_ALLOWED_PATHS: RegExp[] = [
  // v3 core
  /^\/api\/v3\/profile\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/quote\/[A-Za-z0-9%.,^-]{1,200}$/,
  /^\/api\/v3\/income-statement\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/balance-sheet-statement\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/cash-flow-statement\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/ratios\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/ratios-ttm\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/key-metrics\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/key-metrics-ttm\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/historical-price-full\/[A-Za-z0-9%.,^-]{1,200}$/,
  /^\/api\/v3\/historical-price-full\/(stock_dividend|stock_split)\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/discounted-cash-flow\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/levered-discounted-cash-flow\/[A-Za-z0-9.]{1,15}$/,
  /^\/api\/v3\/sector-performance$/,
  /^\/api\/v3\/search$/,

  // v4
  /^\/api\/v4\/treasury$/,
  /^\/api\/v4\/economic$/,
  /^\/api\/v4\/score$/,
  /^\/api\/v4\/revenue-product-segmentation$/,
  /^\/api\/v4\/revenue-geographic-segmentation$/,
  /^\/api\/v4\/price-target-summary$/,
  /^\/api\/v4\/price-target-consensus$/,
  /^\/api\/v4\/insider-trading$/,

  // stable
  /^\/stable\/insider-trading\/search$/,
  /^\/stable\/market-risk-premium$/,
]

function isAllowedFmpProxyPath(pathname: string): boolean {
  return FMP_PROXY_ALLOWED_PATHS.some((re) => re.test(pathname))
}

// Request deduplication: Track in-flight requests to FMP API
// If multiple clients request the same data simultaneously, only make one API call
const inFlightRequests = new Map<string, Promise<unknown>>()

async function fetchWithDeduplication<T = any>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // If request is already in-flight, wait for it
  if (inFlightRequests.has(key)) {
    logger.info(`[Dedup] Waiting for in-flight request: ${key}`)
    return await inFlightRequests.get(key)! as T
  }
  
  // Start new request
  const promise = fetchFn()
  inFlightRequests.set(key, promise as any)
  
  try {
    const result = await promise
    return result
  } finally {
    // Clean up after request completes
    inFlightRequests.delete(key)
  }
}

// ============================================
// Authentication Routes
// ============================================
app.use('/api/auth', authRoutes)

// ============================================
// Subscription & Payment Routes
// ============================================
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/webhooks', webhookRoutes)

// ============================================
// Watchlist Routes
// ============================================
app.use('/api', watchlistRoutes)         // Legacy: /api/watchlist
app.use('/api', watchlistsRoutes)        // New: /api/watchlists (CRUD)
app.use('/api', watchlistItemsRoutes)    // New: /api/watchlists/:id/items

// ============================================
// Initialize and Mount Route Modules
// ============================================

// Initialize routes with dependencies (shared state)
const routeDeps = {
  apiVersion: API_VERSION,
  fmpApiKey: FMP_API_KEY,
  isDatabaseAvailable
}

initTickerRoutes(routeDeps)
initSearchRoutes(routeDeps)
initHealthRoutes(routeDeps)
initAdminRoutes(routeDeps)
initMacroRoutes(routeDeps)
initFeedbackRoutes({ feedbackEmail: 'datoro.info@gmail.com' })
initNewsRoutes({ fmpApiKey: FMP_API_KEY })

// Mount routes
app.use('/api/ticker-data', tickerRoutes)
app.use('/api', searchRoutes)  // Mounts /api/search and /api/deep-finder
app.use('/api/analytics', analyticsRoutes)
app.use('/api/health', healthRoutes)
app.use('/api', adminRoutes)
app.use('/api/macro', macroRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/market', marketPerformanceRoutes)

// ============================================
// Root endpoint (for Render health checks)
// ============================================
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Datoro API',
    status: 'healthy',
    version: API_VERSION,
    timestamp: new Date().toISOString()
  })
})

// ============================================
// API Version Endpoint
// ============================================
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({
    version: API_VERSION,
    updated: API_UPDATED,
    cachePolicy: {
      redis: '7 days',
      client: '5 minutes',
      memory: '5 minutes'
    }
  })
})

// ============================================
// Company Icon Proxy Endpoint (optimized - no image caching)
// ============================================
app.get('/api/company-icon/:ticker', async (req: Request, res: Response) => {
  const { ticker } = req.params
  
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Invalid ticker' })
  }
  
  const upperTicker = ticker.toUpperCase().trim()
  
  // Only cache 404s in Redis (tiny metadata vs full images)
  const notFoundKey = `icon-404:${upperTicker}`
  const is404 = await cache.get(notFoundKey)
  
  if (is404.data === 'true') {
    return res.status(404).json({ error: 'Icon not found' })
  }
  
  try {
    // Proxy directly to FMP (let their CDN handle bandwidth)
    const iconUrl = `https://financialmodelingprep.com/image-stock/${upperTicker}.png`
    const response = await fetch(iconUrl)
    
    if (!response.ok) {
      // Cache 404s for 7 days to avoid repeated failed requests
      await cache.set(notFoundKey, 'true', 7 * 24 * 60 * 60) // 7 days
      return res.status(404).json({ error: 'Icon not found' })
    }
    
    // Stream image directly to client (don't store in Redis)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Set aggressive browser cache (30 days)
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000, immutable', // 30 days, immutable
      'X-Cache': 'PROXY'
    })
    res.send(buffer)
    
  } catch (_error: any) {
    logger.error(`[CompanyIcon] Error fetching icon for ${upperTicker}:`, _error.message)
    res.status(500).json({ error: 'Failed to fetch company icon' })
  }
})

// Apply rate limiting to FMP endpoints
app.use('/api/fmp', fmpLimiter, async (req, res) => {
  const startTime = Date.now()
  let ticker = null
  
  try {
    if (!FMP_API_KEY) {
      logger.error('[FMP] API key not configured')
      return res.status(500).json({ error: 'FMP_API_KEY is not set on the server' })
    }
    // Remove /api/fmp prefix and parse query params
    const subpath = req.url.replace(/^\/api\/fmp/, '')
    const [path, query] = subpath.split('?')
    const params = new URLSearchParams(query || '')

    // Enforce allowlisted methods
    const method = (req.method || 'GET').toUpperCase()
    if (!FMP_PROXY_ALLOWED_METHODS.has(method)) {
      return res.status(405).json({
        error: {
          message: 'Method not allowed for FMP proxy',
          code: 'FMP_PROXY_METHOD_NOT_ALLOWED',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      })
    }

    // Basic safety checks against path tricks
    const lowerPath = String(path || '').toLowerCase()
    if (
      !path ||
      !path.startsWith('/') ||
      lowerPath.includes('..') ||
      lowerPath.includes('\\') ||
      lowerPath.includes('%2e') ||
      lowerPath.includes('%5c')
    ) {
      return res.status(400).json({
        error: {
          message: 'Invalid proxy path',
          code: 'FMP_PROXY_INVALID_PATH',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      })
    }

    // Enforce strict allowlist of upstream endpoints
    if (!isAllowedFmpProxyPath(path)) {
      logger.warn('[FMP] Proxy request blocked (not allowlisted)', {
        ip: req.ip,
        method,
        path
      })
      return res.status(403).json({
        error: {
          message: 'Endpoint not allowed via proxy',
          code: 'FMP_PROXY_DENIED',
          timestamp: new Date().toISOString(),
          path: req.path,
          details: 'This endpoint is not allowlisted by the server.'
        }
      })
    }

    // Cap common numeric params to reduce abuse
    if (params.has('limit')) {
      const raw = params.get('limit')
      const n = raw ? Number.parseInt(raw, 10) : NaN
      if (Number.isFinite(n)) {
        const capped = Math.max(1, Math.min(500, n))
        params.set('limit', String(capped))
      }
    }
    
    // ========== Inline Validation Based on Endpoint ==========
    try {
      // Profile endpoint: /api/v3/profile/:ticker
      if (path.includes('/profile/')) {
        const profileMatch = path.match(/\/profile\/([^/?]+)/)
        if (!profileMatch || !profileMatch[1]) {
          return res.status(400).json({
            error: {
              message: 'Validation failed',
              code: 'E001',
              timestamp: new Date().toISOString(),
              path: req.path,
              details: [{ field: 'ticker', message: 'Ticker is required in path', value: null }]
            }
          })
        }
        ticker = profileMatch[1]
        await validateProfile.params.validateAsync({ ticker })
      }
      
      // Income statement: /api/v3/income-statement/:ticker?period=annual&limit=10
      else if (path.includes('/income-statement/')) {
        const incomeMatch = path.match(/\/income-statement\/([^/?]+)/)
        if (!incomeMatch || !incomeMatch[1]) {
          return res.status(400).json({
            error: {
              message: 'Validation failed',
              code: 'E001',
              timestamp: new Date().toISOString(),
              path: req.path,
              details: [{ field: 'ticker', message: 'Ticker is required in path', value: null }]
            }
          })
        }
        ticker = incomeMatch[1]
        await validateIncomeStatement.params.validateAsync({ ticker })
        if (params.has('period') || params.has('limit')) {
          const query: any = {}
          if (params.has('period')) query.period = params.get('period')
          if (params.has('limit')) query.limit = params.get('limit')
          
          const validated = await validateIncomeStatement.query.validateAsync(query, { 
            stripUnknown: true, 
            convert: true 
          })
          // Update params with validated values
          if (validated.period) params.set('period', validated.period)
          if (validated.limit) params.set('limit', String(validated.limit))
        }
      }
      
      // Balance sheet: /api/v3/balance-sheet-statement/:ticker?period=annual&limit=10
      else if (path.includes('/balance-sheet')) {
        const balanceMatch = path.match(/\/balance-sheet[^/]*\/([^/?]+)/)
        if (!balanceMatch || !balanceMatch[1]) {
          return res.status(400).json({
            error: {
              message: 'Validation failed',
              code: 'E001',
              timestamp: new Date().toISOString(),
              path: req.path,
              details: [{ field: 'ticker', message: 'Ticker is required in path', value: null }]
            }
          })
        }
        ticker = balanceMatch[1]
        await validateBalanceSheet.params.validateAsync({ ticker })
        if (params.has('period') || params.has('limit')) {
          const query: any = {}
          if (params.has('period')) query.period = params.get('period')
          if (params.has('limit')) query.limit = params.get('limit')
          
          const validated = await validateBalanceSheet.query.validateAsync(query, {
            stripUnknown: true,
            convert: true
          })
          if (validated.period) params.set('period', validated.period)
          if (validated.limit) params.set('limit', String(validated.limit))
        }
      }
      
      // Cash flow: /api/v3/cash-flow-statement/:ticker?period=annual&limit=10
      else if (path.includes('/cash-flow')) {
        const cashflowMatch = path.match(/\/cash-flow[^/]*\/([^/?]+)/)
        if (!cashflowMatch || !cashflowMatch[1]) {
          return res.status(400).json({
            error: {
              message: 'Validation failed',
              code: 'E001',
              timestamp: new Date().toISOString(),
              path: req.path,
              details: [{ field: 'ticker', message: 'Ticker is required in path', value: null }]
            }
          })
        }
        ticker = cashflowMatch[1]
        await validateCashFlow.params.validateAsync({ ticker })
        if (params.has('period') || params.has('limit')) {
          const query: any = {}
          if (params.has('period')) query.period = params.get('period')
          if (params.has('limit')) query.limit = params.get('limit')
          
          const validated = await validateCashFlow.query.validateAsync(query, {
            stripUnknown: true,
            convert: true
          })
          if (validated.period) params.set('period', validated.period)
          if (validated.limit) params.set('limit', String(validated.limit))
        }
      }
      
      // Revenue segments: /api/v4/revenue-product-segmentation?symbol=AAPL&structure=flat
      else if (path.includes('/revenue-product-segmentation')) {
        const symbol = params.get('symbol')
        if (symbol) {
          await validateRevenueSegments.query.validateAsync({ symbol })
        }
      }
      
      // Financial scores (Altman Z-Score): /stable/financial-scores?symbol=AAPL
      else if (path.includes('/financial-scores')) {
        const symbol = params.get('symbol')
        if (!symbol) {
          return res.status(400).json({
            error: {
              message: 'Validation failed',
              code: 'E001',
              timestamp: new Date().toISOString(),
              path: req.path,
              details: [{ field: 'symbol', message: 'Symbol query parameter is required', value: null }]
            }
          })
        }
        ticker = symbol
        await validateFinancialScores.query.validateAsync({ symbol })
      }
      
      // Historical price: /api/v3/historical-price-full/:ticker?from=2023-01-01&to=2023-12-31
      else if (path.includes('/historical-price')) {
        const priceMatch = path.match(/\/historical-price[^/]*\/([^/?]+)/)
        if (!priceMatch || !priceMatch[1]) {
          return res.status(400).json({
            error: {
              message: 'Validation failed',
              code: 'E001',
              timestamp: new Date().toISOString(),
              path: req.path,
              details: [{ field: 'ticker', message: 'Ticker is required in path', value: null }]
            }
          })
        }
        ticker = priceMatch[1]
        await validateHistoricalPrice.params.validateAsync({ ticker })
        if (params.has('from') || params.has('to')) {
          const query = {
            from: params.get('from'),
            to: params.get('to'),
            timeseries: params.get('timeseries')
          }
          const validated = await validateHistoricalPrice.query.validateAsync(query, {
            stripUnknown: true,
            convert: true
          })
          // Update params with validated values
          Object.keys(validated).forEach(key => {
            if (validated[key]) params.set(key, String(validated[key]))
          })
        }
      }
      
      // Search endpoint: /api/v3/search?query=apple&limit=10
      else if (path.includes('/search')) {
        const query = {
          q: params.get('query') || params.get('q'),
          limit: params.get('limit')
        }
        const validated = await validateSearch.query.validateAsync(query, {
          stripUnknown: true,
          convert: true
        })
        if (validated.q) params.set('query', validated.q)
        if (validated.limit) params.set('limit', String(validated.limit))
      }
      
    } catch (_validationError: any) {
      // Joi validation error
      if (_validationError.isJoi) {
        logger.error('[FMP] Validation error:', _validationError.details)
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'E001',
            timestamp: new Date().toISOString(),
            path: req.path,
            details: _validationError.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          }
        })
      }
      
      throw _validationError // Re-throw if not a Joi error
    }
    // ========== End Validation ==========
    
    // Generate cache key (without API key in the key)
    const cacheKey = cache.generateKey('fmp', path, query || '')
    
    // Determine TTL based on endpoint (optimized for paid plan - 7 days for most data)
    let ttl = CacheTTL.INCOME_STATEMENT // Default 7 days
    if (path.includes('/quote') && !path.includes('/historical')) ttl = CacheTTL.QUOTE
    else if (path.includes('/historical-price')) ttl = CacheTTL.PRICE_HISTORY
    else if (path.includes('/profile')) ttl = CacheTTL.COMPANY_PROFILE
    else if (path.includes('/balance-sheet')) ttl = CacheTTL.BALANCE_SHEET
    else if (path.includes('/cash-flow')) ttl = CacheTTL.CASH_FLOW
    else if (path.includes('/income-statement')) ttl = CacheTTL.INCOME_STATEMENT
    else if (path.includes('/ratios')) ttl = CacheTTL.RATIOS
    else if (path.includes('/key-metrics')) ttl = CacheTTL.KEY_METRICS
    else if (path.includes('/financial-scores')) ttl = CacheTTL.FINANCIAL_SCORES
    else if (path.includes('/analyst-estimates')) ttl = CacheTTL.ANALYST_ESTIMATES
    else if (path.includes('/revenue-product-segmentation')) ttl = CacheTTL.REVENUE_SEGMENTS
    
    // Check cache first (only for GET requests)
    if (req.method === 'GET') {
      const cached = await cache.get(cacheKey)
      if (cached.data) {
        logger.info(`[FMP] ${subpath} → CACHE HIT (${cached.source})`)
        res.setHeader('X-Cache', cached.source || 'unknown')
        
        // Track search in database (in background) - skip if database offline
        if (isDatabaseAvailable && ticker && (path.includes('/profile') || path.includes('/income-statement') || path.includes('/balance-sheet') || path.includes('/cash-flow'))) {
          trackSearch(req.ip!, ticker, req.headers['user-agent'] || '', 'direct').catch((err: any) => {
            logger.error('[Database] Search tracking error:', err.message)
            isDatabaseAvailable = false // Disable if database is down
          })
          
          // Update company name if this is a profile request
          if (path.includes('/profile') && Array.isArray(cached.data) && cached.data[0]?.companyName) {
            updateTickerCompanyName(ticker, cached.data[0].companyName).catch((err: any) => {
              logger.error('[Database] Company name update error:', err.message)
              isDatabaseAvailable = false // Disable if database is down
            })
          }
        }
        
        // Track API request in database (in background) - skip if database offline
        if (isDatabaseAvailable) {
          trackApiRequest({
            endpoint: path,
            method: req.method,
            statusCode: 200,
            responseTime: Date.now() - startTime,
            cached: true,
            ipAddress: req.ip!
          }).catch((err: any) => {
            logger.error('[Database] API tracking error:', err.message)
            isDatabaseAvailable = false // Disable if database is down
          })
        }
        
        return res.json(cached.data)
      }
    }
    
    // Add API key (override if client mistakenly sent one)
    params.set('apikey', FMP_API_KEY)
    const upstream = `https://financialmodelingprep.com${path}?${params.toString()}`
    
    logger.info(`[FMP] ${req.method} ${subpath} → ${upstream}`)
    
    // Forward all headers except host
    const headers = { ...req.headers as any, host: 'financialmodelingprep.com', 'user-agent': UA }
    delete headers.host
    const options: any = { method, headers }
    if (method !== 'GET' && method !== 'HEAD') {
      options.body = req.body
    }
    
    // Use deduplication for GET requests to prevent duplicate API calls
    const dedupKey = `${method}:${upstream}`
    const fmpRes = method === 'GET' 
      ? await fetchWithDeduplication(dedupKey, () => fetch(upstream, options))
      : await fetch(upstream, options)
    const contentType = fmpRes.headers.get('content-type') || 'application/json'
    
    logger.info(`[FMP] Response: ${fmpRes.status} ${contentType}`)
    
    // Handle rate limit errors (HTTP 429)
    if (fmpRes.status === 429) {
      logger.error('[FMP] Rate limit exceeded (HTTP 429)')
      return res.status(429).json({
        error: {
          message: 'FMP API rate limit exceeded (300 requests/minute). Data is cached for 7 days to reduce API calls.',
          code: 'E429',
          retryAfter: '60 seconds',
          suggestion: 'Wait 1 minute for rate limit reset, or refresh to use cached data.',
          timestamp: new Date().toISOString()
        }
      })
    }
    
    res.status(fmpRes.status).type(contentType)
    const buf = await fmpRes.arrayBuffer()
    const bufferString = Buffer.from(buf).toString()
    
    // Handle empty responses
    if (!bufferString || bufferString.trim() === '') {
      logger.warn(`[FMP] Empty response for ${path}`)
      return res.status(fmpRes.status).json([])
    }
    
    // Parse JSON safely
    let data
    try {
      data = JSON.parse(bufferString)
    } catch (_parseError: any) {
      logger.error(`[FMP] JSON parse error for ${path}:`, _parseError.message)
      logger.error(`[FMP] Response (first 200 chars): ${bufferString.substring(0, 200)}`)
      return res.status(500).json({ 
        error: 'Failed to parse FMP API response',
        details: _parseError.message 
      })
    }
    
    // Cache successful responses (only for GET)
    if (req.method === 'GET' && fmpRes.status === 200 && data) {
      await cache.set(cacheKey, data, ttl)
      res.setHeader('X-Cache', 'miss')
      
      // Track search in database (in background) - skip if database offline
      if (isDatabaseAvailable && ticker && (path.includes('/profile') || path.includes('/income-statement') || path.includes('/balance-sheet') || path.includes('/cash-flow'))) {
        trackSearch(req.ip!, ticker, req.headers['user-agent'] || '', 'direct').catch((err: any) => {
          logger.error('[Database] Search tracking error:', err.message)
          isDatabaseAvailable = false // Disable if database is down
        })
        
        // Update company name if this is a profile request
        if (path.includes('/profile') && Array.isArray(data) && data[0]?.companyName) {
          updateTickerCompanyName(ticker, data[0].companyName).catch((err: any) => {
            logger.error('[Database] Company name update error:', err.message)
            isDatabaseAvailable = false // Disable if database is down
          })
        }
      }
      
      // Track API request in database (in background) - skip if database offline
      if (isDatabaseAvailable) {
        trackApiRequest({
          endpoint: path,
          method: req.method,
          statusCode: fmpRes.status,
          responseTime: Date.now() - startTime,
          cached: false,
          ipAddress: req.ip!
        }).catch((err: any) => {
          logger.error('[Database] API tracking error:', err.message)
          isDatabaseAvailable = false // Disable if database is down
        })
      }
    }
    
    res.send(data)
  } catch (_e: any) {
    logger.error('[FMP] Error:', _e)
    
    // Track failed API request in database (in background) - skip if database offline
    if (isDatabaseAvailable) {
      trackApiRequest({
        endpoint: req.url,
        method: req.method,
        statusCode: 500,
        responseTime: Date.now() - startTime,
        cached: false,
        errorCode: 'E005',
        ipAddress: req.ip!
      }).catch((err: any) => {
        logger.error('[Database] API tracking error:', err.message)
        isDatabaseAvailable = false // Disable if database is down
      })
    }
    
    res.status(500).json({ error: String(_e.message || _e) })
  }
})

// -------------------- Ticker Search Endpoint --------------------
// Search for tickers by symbol or company name
// ============================================================================
// SEO & Bot Routes (robots.txt, sitemap.xml, Google verification)
// ============================================================================

// Robots.txt - Tell search engines what to crawl
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain')
  res.send(`User-agent: *
Allow: /

# Disallow API routes
Disallow: /api/

# Sitemap location
Sitemap: https://datoro.onrender.com/sitemap.xml
`)
})

// Sitemap.xml - Help search engines discover pages (placeholder for now)
app.get('/sitemap.xml', (_req: Request, res: Response) => {
  res.type('application/xml')
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://datoro.onrender.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`)
})

// Google Search Console verification file
app.get('/googleda227c5410366f98.html', (_req: Request, res: Response) => {
  res.type('text/html')
  res.send('google-site-verification: googleda227c5410366f98.html')
})

// 404 handler (must be after all routes)
app.use(notFoundHandler)

// Sentry error handler (must be before any other error middleware)
app.use(sentryService.errorHandler())

// Global error handler with monitoring (must be last)
app.use(errorHandler(monitoring))

const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`FMP Proxy Server listening on http://0.0.0.0:${PORT}`)
  logger.info(`Access from network: http://<your-pc-ip>:${PORT}`)
  logger.info(`CORS allowed origin: ${DEV_ORIGIN}`)
  logger.info(`FMP API: ${FMP_API_KEY ? 'ENABLED' : 'DISABLED (set FMP_API_KEY)'}`)
  
  // Warm up database connection pool to prevent cold start delays
  // This prevents the first auth request from timing out after server restart
  logger.info('[Database] Warming up connection pool...')
  try {
    const prisma = getPrismaClient()
    // Simple query to establish connection
    await prisma.$queryRaw`SELECT 1`
    logger.info('[Database] ✓ Connection pool warmed up')
  } catch (_error: any) {
    logger.warn('[Database] ✗ Failed to warm up connection:', _error.message)
    logger.warn('[Database] First requests may be slower than usual')
  }
  
  // Schedule daily session cleanup (only on worker 0 or if not using PM2)
  if (!process.env.pm_id || process.env.pm_id === '0') {
    logger.info('[Auth] Scheduling daily session cleanup...')
    
    // Import cleanupExpiredSessions
    const { cleanupExpiredSessions } = await import('./services/authService.js')
    
    // Run cleanup daily at 3 AM
    const runCleanup = async () => {
      const now = new Date()
      const nextRun = new Date(now)
      nextRun.setHours(3, 0, 0, 0) // 3:00 AM
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1) // Tomorrow
      }
      
      const msUntilNextRun = nextRun.getTime() - now.getTime()
      
      setTimeout(async () => {
        logger.info('[Auth] Running scheduled session cleanup...')
        try {
          const count = await cleanupExpiredSessions()
          logger.info(`[Auth] ✓ Cleanup complete: ${count} expired sessions deleted`)
        } catch (_error: any) {
          logger.error('[Auth] ✗ Cleanup failed:', _error.message)
        }
        
        // Schedule next run (24 hours)
        setInterval(async () => {
          logger.info('[Auth] Running scheduled session cleanup...')
          try {
            const count = await cleanupExpiredSessions()
            logger.info(`[Auth] ✓ Cleanup complete: ${count} expired sessions deleted`)
          } catch (_error: any) {
            logger.error('[Auth] ✗ Cleanup failed:', _error.message)
          }
        }, 24 * 60 * 60 * 1000) // 24 hours
      }, msUntilNextRun)
      
      logger.info(`[Auth] Next cleanup scheduled for: ${nextRun.toLocaleString()}`)
    }
    
    runCleanup()
  }
})

server.on('error', (err: any) => {
  logger.error('[SERVER] Error:', err)
  process.exit(1)
})

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`\n[SERVER] Received ${signal}, shutting down gracefully...`)
  
  try {
    // Stop monitoring service (clear intervals)
    monitoring.stop()
    logger.info('[SERVER] ✓ Monitoring service stopped')
    
    // Disconnect from Redis cache
    await cache.disconnect()
    logger.info('[SERVER] ✓ Redis cache disconnected')
    
    // Close database connections (Prisma)
    // Note: Prisma auto-disconnects, but we could add explicit cleanup here
    logger.info('[SERVER] ✓ Database connections closed')
    
    // Close HTTP server (stop accepting new requests)
    server.close(() => {
      logger.info('[SERVER] ✓ HTTP server closed')
      logger.info('[SERVER] Shutdown complete')
      process.exit(0)
    })
    
    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('[SERVER] ✗ Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
    
  } catch (_error: any) {
    logger.error('[SERVER] Error during shutdown:', _error)
    process.exit(1)
  }
}

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'))   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // PM2 stop/restart
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'))   // Terminal closed

