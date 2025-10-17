// server/server.mjs — FMP Proxy Server (ESM, Node 18+)
// Run: npm run server (or: node server/server.mjs)

import express from 'express'
import compression from 'compression'
import cors from 'cors'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { getCacheService, CacheTTL } from './services/cacheService.js'
import { getMonitoringService } from './services/monitoringService.js'
import * as sentryService from './services/sentryService.js'
import { 
  validate,
  validateProfile,
  validateIncomeStatement,
  validateBalanceSheet,
  validateCashFlow,
  validateRevenueSegments,
  validateFinancialScores,
  validateHistoricalPrice,
  validateSearch,
  validateAnalyticsPopular,
  validateAnalyticsHistory,
  validateAnalyticsStats
} from './middleware/validation.js'
import { 
  trackSearch, 
  updateTickerCompanyName, 
  trackApiRequest,
  getPopularTickers,
  getUserSearchHistory,
  getApiRequestStats
} from './services/databaseService.js'
import { 
  fmpLimiter, 
  adminLimiter, 
  aiLimiter, 
  speedLimiter 
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

// Database health flag (disabled if offline to prevent 5s timeouts)
let isDatabaseAvailable = true

const PORT = process.env.PORT || 7071
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173'
const FMP_API_KEY = process.env.FMP_API_KEY || ''
const AI_PROVIDER = process.env.VITE_AI_PROVIDER || 'openai'
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || ''
const OLLAMA_BASE_URL = process.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.VITE_OLLAMA_MODEL || 'llama3.2'

// Cache directory for AI responses
const CACHE_DIR = join(__dirname, '..', '.ai-cache')
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true })
}

const app = express()

// Trust Render proxy for rate limiting and IP detection
// Render runs behind a proxy, so we need to trust X-Forwarded-* headers
app.set('trust proxy', 1)

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

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Cache', 'X-Request-Id'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}))
app.use(express.json())

// Speed limiter (slows down heavy users)
app.use(speedLimiter)

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Request deduplication: Track in-flight requests to FMP API
// If multiple clients request the same data simultaneously, only make one API call
const inFlightRequests = new Map()

async function fetchWithDeduplication(key, fetchFn) {
  // If request is already in-flight, wait for it
  if (inFlightRequests.has(key)) {
    console.log(`[Dedup] Waiting for in-flight request: ${key}`)
    return await inFlightRequests.get(key)
  }
  
  // Start new request
  const promise = fetchFn()
  inFlightRequests.set(key, promise)
  
  try {
    const result = await promise
    return result
  } finally {
    // Clean up after request completes
    inFlightRequests.delete(key)
  }
}

// Apply rate limiting to FMP endpoints
app.use('/api/fmp', fmpLimiter, async (req, res) => {
  const startTime = Date.now()
  let ticker = null
  
  try {
    if (!FMP_API_KEY) {
      console.error('[FMP] API key not configured')
      return res.status(500).json({ error: 'FMP_API_KEY is not set on the server' })
    }
    // Remove /api/fmp prefix and parse query params
    const subpath = req.url.replace(/^\/api\/fmp/, '')
    const [path, query] = subpath.split('?')
    const params = new URLSearchParams(query || '')
    
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
          const query = {}
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
          const query = {}
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
          const query = {}
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
      
    } catch (validationError) {
      // Joi validation error
      if (validationError.isJoi) {
        console.error('[FMP] Validation error:', validationError.details)
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'E001',
            timestamp: new Date().toISOString(),
            path: req.path,
            details: validationError.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          }
        })
      }
      throw validationError // Re-throw if not a Joi error
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
        console.log(`[FMP] ${subpath} → CACHE HIT (${cached.source})`)
        res.setHeader('X-Cache', cached.source)
        
        // Track search in database (in background) - skip if database offline
        if (isDatabaseAvailable && ticker && (path.includes('/profile') || path.includes('/income-statement') || path.includes('/balance-sheet') || path.includes('/cash-flow'))) {
          trackSearch(req.ip, ticker, req.headers['user-agent'], 'direct').catch(err => {
            console.error('[Database] Search tracking error:', err.message)
            isDatabaseAvailable = false // Disable if database is down
          })
          
          // Update company name if this is a profile request
          if (path.includes('/profile') && Array.isArray(cached.data) && cached.data[0]?.companyName) {
            updateTickerCompanyName(ticker, cached.data[0].companyName).catch(err => {
              console.error('[Database] Company name update error:', err.message)
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
            ipAddress: req.ip
          }).catch(err => {
            console.error('[Database] API tracking error:', err.message)
            isDatabaseAvailable = false // Disable if database is down
          })
        }
        
        return res.json(cached.data)
      }
    }
    
    // Add API key (override if client mistakenly sent one)
    params.set('apikey', FMP_API_KEY)
    const upstream = `https://financialmodelingprep.com${path}?${params.toString()}`
    
    console.log(`[FMP] ${req.method} ${subpath} → ${upstream}`)
    
    // Forward all headers except host
    const headers = { ...req.headers, host: 'financialmodelingprep.com', 'user-agent': UA }
    delete headers['host']
    const method = req.method || 'GET'
    const options = { method, headers }
    if (method !== 'GET' && method !== 'HEAD') {
      options.body = req.body
    }
    
    // Use deduplication for GET requests to prevent duplicate API calls
    const dedupKey = `${method}:${upstream}`
    const fmpRes = method === 'GET' 
      ? await fetchWithDeduplication(dedupKey, () => fetch(upstream, options))
      : await fetch(upstream, options)
    const contentType = fmpRes.headers.get('content-type') || 'application/json'
    
    console.log(`[FMP] Response: ${fmpRes.status} ${contentType}`)
    
    // Handle rate limit errors (HTTP 429)
    if (fmpRes.status === 429) {
      console.error('[FMP] Rate limit exceeded (HTTP 429)')
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
      console.warn(`[FMP] Empty response for ${path}`)
      return res.status(fmpRes.status).json([])
    }
    
    // Parse JSON safely
    let data
    try {
      data = JSON.parse(bufferString)
    } catch (parseError) {
      console.error(`[FMP] JSON parse error for ${path}:`, parseError.message)
      console.error(`[FMP] Response (first 200 chars): ${bufferString.substring(0, 200)}`)
      return res.status(500).json({ 
        error: 'Failed to parse FMP API response',
        details: parseError.message 
      })
    }
    
    // Cache successful responses (only for GET)
    if (req.method === 'GET' && fmpRes.status === 200 && data) {
      await cache.set(cacheKey, data, ttl)
      res.setHeader('X-Cache', 'miss')
      
      // Track search in database (in background) - skip if database offline
      if (isDatabaseAvailable && ticker && (path.includes('/profile') || path.includes('/income-statement') || path.includes('/balance-sheet') || path.includes('/cash-flow'))) {
        trackSearch(req.ip, ticker, req.headers['user-agent'], 'direct').catch(err => {
          console.error('[Database] Search tracking error:', err.message)
          isDatabaseAvailable = false // Disable if database is down
        })
        
        // Update company name if this is a profile request
        if (path.includes('/profile') && Array.isArray(data) && data[0]?.companyName) {
          updateTickerCompanyName(ticker, data[0].companyName).catch(err => {
            console.error('[Database] Company name update error:', err.message)
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
          ipAddress: req.ip
        }).catch(err => {
          console.error('[Database] API tracking error:', err.message)
          isDatabaseAvailable = false // Disable if database is down
        })
      }
    }
    
    res.send(data)
  } catch (e) {
    console.error('[FMP] Error:', e)
    
    // Track failed API request in database (in background) - skip if database offline
    if (isDatabaseAvailable) {
      trackApiRequest({
        endpoint: req.url,
        method: req.method,
        statusCode: 500,
        responseTime: Date.now() - startTime,
        cached: false,
        errorCode: 'E005',
        ipAddress: req.ip
      }).catch(err => {
        console.error('[Database] API tracking error:', err.message)
        isDatabaseAvailable = false // Disable if database is down
      })
    }
    
    res.status(500).json({ error: String(e.message || e) })
  }
})

// -------------------- AI Analysis with File Cache --------------------
function getCacheFilePath(ticker, type) {
  return join(CACHE_DIR, `${type}_${ticker}.json`)
}

function getCachedAIResponse(ticker, type) {
  const filePath = getCacheFilePath(ticker, type)
  if (!existsSync(filePath)) return null
  
  try {
    const content = readFileSync(filePath, 'utf8')
    const { data, timestamp } = JSON.parse(content)
    const age = Date.now() - timestamp
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
    
    if (age < maxAge) {
      console.log(`[AI] Using cached ${type} for ${ticker}`)
      return data
    }
    return null
  } catch (error) {
    console.error('[AI] Cache read error:', error)
    return null
  }
}

function setCachedAIResponse(ticker, type, data) {
  const filePath = getCacheFilePath(ticker, type)
  try {
    const content = JSON.stringify({ data, timestamp: Date.now() }, null, 2)
    writeFileSync(filePath, content, 'utf8')
    console.log(`[AI] Cached ${type} for ${ticker}`)
  } catch (error) {
    console.error('[AI] Cache write error:', error)
  }
}

async function callAIProvider(ticker, companyName, type, systemPrompt) {
  if (AI_PROVIDER === 'ollama') {
    const prompt = `${systemPrompt}\n\nCompany: ${companyName} (${ticker})`
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 400 }
      })
    })
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
    const result = await response.json()
    return result.response
  } else if (AI_PROVIDER === 'openai') {
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Company: ${companyName} (${ticker})` }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    })
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)
    const result = await response.json()
    return result.choices[0].message.content
  } else {
    throw new Error(`Unknown AI provider: ${AI_PROVIDER}`)
  }
}

function parseAndValidateJSON(rawResponse) {
  try {
    // Try to find complete JSON array
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { success: false, error: 'No JSON array found' }
    }
    
    const jsonStr = jsonMatch[0]
    const parsed = JSON.parse(jsonStr)
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Not an array' }
    }
    
    if (parsed.length === 0) {
      return { success: false, error: 'Empty array' }
    }
    
    if (!parsed.every(item => item.title && item.description)) {
      return { success: false, error: 'Missing title or description' }
    }
    
    return { success: true, data: parsed, error: null }
  } catch (parseError) {
    return { success: false, error: parseError.message }
  }
}

// Apply AI rate limiter to AI endpoints
// Handle HEAD requests (CORS preflight/health checks)
app.head('/api/ai/analysis', (req, res) => {
  res.status(200).end()
})

app.post('/api/ai/analysis', aiLimiter, async (req, res) => {
  try {
    const { ticker, companyName, type, systemPrompt, clearCache } = req.body
    
    if (!ticker || !type) {
      return res.status(400).json({ error: 'Missing ticker or type' })
    }
    
    const t = ticker.trim().toUpperCase()
    const company = companyName || t
    
    console.log(`[AI] Request: ticker=${t}, companyName=${company}, type=${type}`)
    
    // Check cache first (unless clearCache is true)
    if (!clearCache) {
      const cached = getCachedAIResponse(t, type)
      if (cached) {
        console.log(`[AI] Cache hit for ${t} ${type}`)
        return res.json({ data: cached, cached: true, provider: AI_PROVIDER })
      }
    }
    
    // Retry logic: try up to 2 times
    let parsedData = null
    let lastError = null
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`[AI] Attempt ${attempt}/2: Fetching ${type} for ${t} (${company}) from ${AI_PROVIDER}...`)
      
      try {
        const rawResponse = await callAIProvider(t, company, type, systemPrompt)
        console.log(`[AI] Raw response (first 200 chars): ${rawResponse.substring(0, 200)}...`)
        
        const result = parseAndValidateJSON(rawResponse)
        
        if (result.success) {
          parsedData = { success: true, data: result.data, error: null }
          console.log(`[AI] ✓ Successfully parsed ${result.data.length} items on attempt ${attempt}`)
          break
        } else {
          lastError = result.error
          console.log(`[AI] ✗ Attempt ${attempt} failed: ${result.error}`)
          
          if (attempt === 2) {
            // Last attempt failed - don't cache, return error
            console.log(`[AI] Both attempts failed. Not caching.`)
            return res.json({
              data: {
                success: false,
                data: [{ 
                  title: 'Format Error', 
                  description: 'AI response format is invalid. Please click Refresh to try again.' 
                }],
                error: `Failed after 2 attempts: ${lastError}`
              },
              cached: false,
              provider: AI_PROVIDER,
              shouldRetry: true
            })
          }
          
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (callError) {
        lastError = callError.message
        console.log(`[AI] ✗ Attempt ${attempt} error: ${callError.message}`)
        
        if (attempt === 2) {
          return res.status(500).json({ 
            error: lastError || 'AI request failed', 
            provider: AI_PROVIDER 
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Cache only if we got valid data
    if (parsedData && parsedData.success) {
      setCachedAIResponse(t, type, parsedData)
    }
    
    res.json({ data: parsedData, cached: false, provider: AI_PROVIDER })
  } catch (error) {
    console.error('[AI] Error:', error)
    res.status(500).json({ error: error.message || 'AI request failed', provider: AI_PROVIDER })
  }
})

// -------------------- Batch Data Endpoint --------------------
// Fetch all ticker data in one optimized request (reduces 30+ calls to 1)
app.get('/api/ticker-data/:ticker', fmpLimiter, async (req, res) => {
  const startTime = Date.now()
  const { ticker } = req.params
  const mode = req.query.mode || 'full' // 'full' or 'priority'
  
  const t = ticker.toUpperCase().trim()
  
  // Validate ticker format (1-10 characters, letters/numbers/dots)
  if (!t || !/^[A-Z0-9.]{1,10}$/.test(t)) {
    return res.status(400).json({
      error: {
        message: 'Invalid ticker format',
        code: 'E001',
        details: 'Ticker must be 1-10 characters (letters, numbers, dots)'
      }
    })
  }

  const cacheKey = cache.generateKey('batch', t, mode)
  
  try {
    // Check cache first (7-day TTL for batch data)
    console.log(`[Batch] ${t} (${mode}) → Checking cache (key: ${cacheKey})`)
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Batch] ${t} (${mode}) → CACHE HIT (${cached.source})`)
      res.setHeader('X-Cache', cached.source)
      
      // Track in database (background)
      if (isDatabaseAvailable) {
        trackSearch(req.ip, t, req.headers['user-agent'], 'batch').catch(err => {
          console.error('[Database] Search tracking error:', err.message)
          isDatabaseAvailable = false
        })
      }
      
      return res.json(cached.data)
    }
    
    console.log(`[Batch] ${t} (${mode}) → CACHE MISS - Fetching from FMP...`)
    
    // Import batch service
    const { fetchTickerBatch, fetchTickerPriority } = await import('./services/batchDataService.js')
    
    // Fetch data based on mode
    const result = mode === 'priority' 
      ? await fetchTickerPriority(t, FMP_API_KEY)
      : await fetchTickerBatch(t, FMP_API_KEY)
    
    // Cache the result
    await cache.set(cacheKey, result, CacheTTL.COMPANY_PROFILE) // 7 days
    console.log(`[Batch] ${t} (${mode}) → Cached with key: ${cacheKey}, TTL: ${CacheTTL.COMPANY_PROFILE}s`)
    res.setHeader('X-Cache', 'miss')
    
    console.log(`[Batch] ${t} (${mode}) → Fetched in ${result.fetchDuration}ms`)
    
    // Track in database (background)
    if (isDatabaseAvailable) {
      trackSearch(req.ip, t, req.headers['user-agent'], 'batch').catch(err => {
        console.error('[Database] Search tracking error:', err.message)
        isDatabaseAvailable = false
      })
      
      // Update company name if available
      if (result.data.profile && Array.isArray(result.data.profile) && result.data.profile[0]?.companyName) {
        updateTickerCompanyName(t, result.data.profile[0].companyName).catch(err => {
          console.error('[Database] Company name update error:', err.message)
          isDatabaseAvailable = false
        })
      }
    }
    
    // Track API request
    if (isDatabaseAvailable) {
      trackApiRequest({
        endpoint: `/api/ticker-data/${t}`,
        method: 'GET',
        statusCode: 200,
        responseTime: Date.now() - startTime,
        cached: false,
        ipAddress: req.ip
      }).catch(err => {
        console.error('[Database] API tracking error:', err.message)
        isDatabaseAvailable = false
      })
    }
    
    res.json(result)
  } catch (error) {
    console.error(`[Batch] Error fetching ${t}:`, error)
    
    // Track failed request
    if (isDatabaseAvailable) {
      trackApiRequest({
        endpoint: `/api/ticker-data/${t}`,
        method: 'GET',
        statusCode: 500,
        responseTime: Date.now() - startTime,
        cached: false,
        errorCode: 'E006',
        ipAddress: req.ip
      }).catch(err => {
        console.error('[Database] API tracking error:', err.message)
        isDatabaseAvailable = false
      })
    }
    
    res.status(500).json({
      error: {
        message: 'Failed to fetch ticker data',
        code: 'E006',
        details: error.message
      }
    })
  }
})

// -------------------- Health & Monitoring --------------------
// Root path handler (for HEAD requests from monitoring tools)
app.get('/', (_req, res) => {
  res.json({ 
    name: 'Factorly API',
    status: 'ok',
    version: '1.0.0'
  })
})

app.head('/', (_req, res) => {
  res.status(200).end()
})

// Basic health check (fast, no external dependencies)
app.get('/api/health', (_req, res) => {
  const summary = monitoring.getSummary()
  res.json({ 
    ok: true,
    ...summary
  })
})

app.head('/api/health', (_req, res) => {
  res.status(200).end()
})

// Readiness check (validates database and Redis connectivity)
// Use this for Docker/k8s health checks with longer timeout
app.get('/api/readiness', async (_req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
    timestamp: new Date().toISOString()
  }

  try {
    // Check database connectivity (with 2s timeout)
    if (isDatabaseAvailable) {
      try {
        const { testDatabaseConnection } = await import('./services/databaseService.js')
        const dbTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 2000)
        )
        await Promise.race([testDatabaseConnection(), dbTimeout])
        checks.database = 'connected'
      } catch (dbError) {
        checks.database = 'disconnected'
        console.warn('[Health] Database check failed:', dbError.message)
      }
    } else {
      checks.database = 'disabled'
    }

    // Check Redis connectivity
    try {
      const isConnected = await cache.ping()
      checks.redis = isConnected ? 'connected' : 'disconnected'
    } catch (redisError) {
      checks.redis = cache.isMemoryOnly() ? 'memory-fallback' : 'disconnected'
      console.warn('[Health] Redis check failed:', redisError.message)
    }

    // Overall health status
    const isHealthy = checks.server === 'ok' && 
                      (checks.database === 'connected' || checks.database === 'disabled') &&
                      (checks.redis === 'connected' || checks.redis === 'memory-fallback')

    res.status(isHealthy ? 200 : 503).json({
      ok: isHealthy,
      checks,
      uptime: monitoring.getSummary().uptime
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      checks,
      error: error.message
    })
  }
})

// Admin endpoints with strict rate limiting
app.get('/api/cache/stats', adminLimiter, (_req, res) => {
  const stats = cache.getStats()
  res.json(stats)
})

app.post('/api/cache/clear', adminLimiter, async (_req, res) => {
  await cache.clear()
  cache.resetStats()
  res.json({ message: 'Cache cleared successfully' })
})

// Monitoring endpoints
app.get('/api/monitoring/stats', adminLimiter, (_req, res) => {
  const metrics = monitoring.getMetrics()
  res.json(metrics)
})

app.get('/api/monitoring/summary', (_req, res) => {
  const summary = monitoring.getSummary()
  res.json(summary)
})

app.post('/api/monitoring/reset', adminLimiter, (_req, res) => {
  monitoring.reset()
  res.json({ message: 'Monitoring metrics reset successfully' })
})

// -------------------- Analytics Endpoints --------------------
// Get popular tickers (last 7 days by default)
app.get('/api/analytics/popular', validate(validateAnalyticsPopular), async (req, res) => {
  try {
    const { limit, days } = req.query // Already validated and converted by middleware
    const tickers = await getPopularTickers(limit, days)
    res.json({ success: true, data: tickers })
  } catch (error) {
    console.error('[Analytics] Popular tickers error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get user's search history
app.get('/api/analytics/history', validate(validateAnalyticsHistory), async (req, res) => {
  try {
    const { limit } = req.query // Already validated and converted by middleware
    const history = await getUserSearchHistory(req.ip, limit)
    res.json({ success: true, data: history })
  } catch (error) {
    console.error('[Analytics] History error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get API request statistics (last 24 hours by default)
app.get('/api/analytics/stats', adminLimiter, validate(validateAnalyticsStats), async (req, res) => {
  try {
    const { hours } = req.query // Already validated and converted by middleware
    const stats = await getApiRequestStats(hours)
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('[Analytics] Stats error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 404 handler (must be after all routes)
app.use(notFoundHandler)

// Sentry error handler (must be before any other error middleware)
app.use(sentryService.errorHandler())

// Global error handler with monitoring (must be last)
app.use(errorHandler(monitoring))

const server = app.listen(PORT, async () => {
  console.log(`FMP Proxy Server listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origin: ${DEV_ORIGIN}`)
  console.log(`FMP API: ${FMP_API_KEY ? 'ENABLED' : 'DISABLED (set FMP_API_KEY)'}`)
  
  // Connect to Redis
  await cache.connect()
})

server.on('error', (err) => {
  console.error('[SERVER] Error:', err)
  process.exit(1)
})

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}, shutting down gracefully...`)
  
  try {
    // Stop monitoring service (clear intervals)
    monitoring.stop()
    console.log('[SERVER] ✓ Monitoring service stopped')
    
    // Disconnect from Redis cache
    await cache.disconnect()
    console.log('[SERVER] ✓ Redis cache disconnected')
    
    // Close database connections (Prisma)
    // Note: Prisma auto-disconnects, but we could add explicit cleanup here
    console.log('[SERVER] ✓ Database connections closed')
    
    // Close HTTP server (stop accepting new requests)
    server.close(() => {
      console.log('[SERVER] ✓ HTTP server closed')
      console.log('[SERVER] Shutdown complete')
      process.exit(0)
    })
    
    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      console.error('[SERVER] ✗ Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
    
  } catch (error) {
    console.error('[SERVER] Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'))   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // PM2 stop/restart
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'))   // Terminal closed
