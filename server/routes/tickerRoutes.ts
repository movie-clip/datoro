// server/routes/tickerRoutes.ts
// Ticker data endpoints - batch data fetching from FMP

import express, { type Request, type Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { fmpLimiter, globalFmpLimiter, decrementGlobalFmpCounter } from '../middleware/rateLimiter.js'
import { getCacheService, CacheTTL } from '../services/cacheService.js'
import { trackSearch, updateTickerCompanyName, trackApiRequest } from '../services/databaseService.js'

const router = express.Router()
const cache = getCacheService()

// Database health flag (shared from server.mjs - will be injected)
let isDatabaseAvailable = true

// API Version (injected from server.mjs)
let API_VERSION = 'v2.6'
let FMP_API_KEY = ''

/**
 * Initialize route with dependencies
 * @param {Object} deps - Dependencies to inject
 * @param {string} deps.apiVersion - Current API version
 * @param {string} deps.fmpApiKey - FMP API key
 * @param {boolean} deps.isDatabaseAvailable - Database health flag reference
 */
export function initTickerRoutes(deps: { apiVersion: string; fmpApiKey: string; isDatabaseAvailable: boolean }) {
  API_VERSION = deps.apiVersion
  FMP_API_KEY = deps.fmpApiKey
  isDatabaseAvailable = deps.isDatabaseAvailable
  return router
}

/**
 * GET /api/ticker-data/:ticker
 * 
 * Fetch comprehensive ticker data from FMP (batch endpoint)
 * Supports two modes:
 * - full: All 24 endpoints (default)
 * - priority: Only critical endpoints for faster response
 * 
 * Features:
 * - Multi-layer caching (memory + Redis, 7-day TTL)
 * - ETag support for bandwidth savings
 * - Version-aware cache invalidation
 * - Request deduplication
 * - Database tracking (async, non-blocking)
 * 
 * @param {string} ticker - Stock ticker symbol (1-10 chars, A-Z, 0-9, dots)
 * @param {string} mode - 'full' or 'priority' (default: 'full')
 */
router.get('/:ticker', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now()
  const { ticker } = req.params
  const mode = req.query.mode as string || 'full' // 'full' or 'priority'
  
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

  // Include API version in cache key to auto-invalidate on endpoint changes
  const cacheKey = cache.generateKey('batch', t, mode, API_VERSION)
  
  // Check cache first (7-day TTL for batch data)
  console.log(`[Batch] ${t} (${mode}) → Checking cache (key: ${cacheKey})`)
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    console.log(`[Batch] ${t} (${mode}) → CACHE HIT (${cached.source})`)
    
    // Decrement global FMP counter for cache hits (not actual API calls)
    if (req.fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    
    res.setHeader('X-Cache', cached.source || 'unknown')
    
    // Handle both old format (direct data) and new format (wrapped with etag)
    let responseData: any = cached.data
    let dataHash = ''
    
    // New format: { data: {...}, etag: '...', cachedAt: ... }
    if (cached.data.etag && cached.data.data) {
      dataHash = cached.data.etag
      responseData = cached.data.data
    } else {
      // Old format: direct data object - generate hash on the fly
      dataHash = cache.generateETag(cached.data)
    }
    
    // Version-aware ETag: prefix with API version to prevent stale 304s
    // When API_VERSION changes, all ETags become invalid automatically
    const etag = `"${API_VERSION}-${dataHash}"`
    
    // Check if client has same version (ETag match with version prefix)
    const clientEtag = req.headers['if-none-match']
    if (clientEtag === etag) {
      console.log(`[Batch] ${t} (${mode}) → 304 Not Modified (ETag match, version ${API_VERSION})`)
      res.setHeader('ETag', etag)
      res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
      res.setHeader('X-API-Version', API_VERSION)
      return res.status(304).end()
    }
    
    // Track in database (truly async - don't block response)
    if (isDatabaseAvailable) {
      setImmediate(() => {
        trackSearch(req.ip!, t, req.headers['user-agent'] || '', 'batch').catch((err: any) => {
          console.error('[Database] Search tracking error:', err.message)
        })
      })
    }
    
    // Send cached data with version-aware ETag
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
    res.setHeader('X-API-Version', API_VERSION)
    return res.json(responseData)
  }
  
  console.log(`[Batch] ${t} (${mode}) → CACHE MISS - Fetching from FMP...`)
  
  // Import batch service
  const { fetchTickerBatch, fetchTickerPriority } = await import('../services/batchDataService.js')
  
  // Fetch data based on mode
  const result = mode === 'priority' 
    ? await fetchTickerPriority(t, FMP_API_KEY)
    : await fetchTickerBatch(t, FMP_API_KEY)
  
  // Cache the result
  await cache.set(cacheKey, result, CacheTTL.COMPANY_PROFILE) // 7 days
  console.log(`[Batch] ${t} (${mode}) → Cached with key: ${cacheKey}, TTL: ${CacheTTL.COMPANY_PROFILE}s`)
  res.setHeader('X-Cache', 'miss')
  
  console.log(`[Batch] ${t} (${mode}) → Fetched in ${result.fetchDuration}ms`)
  
  // Track in database (truly async - use setImmediate to not block response)
  if (isDatabaseAvailable) {
    setImmediate(() => {
      trackSearch(req.ip!, t, req.headers['user-agent'] || '', 'batch').catch((err: any) => {
        console.error('[Database] Search tracking error:', err.message)
      })
      
      // Update company name if available
      if (result.data.profile && Array.isArray(result.data.profile) && result.data.profile[0]?.companyName) {
        updateTickerCompanyName(t, result.data.profile[0].companyName).catch((err: any) => {
          console.error('[Database] Company name update error:', err.message)
        })
      }
      
      // Track API request
      trackApiRequest({
        endpoint: `/api/ticker-data/${t}`,
        method: 'GET',
        statusCode: 200,
        responseTime: Date.now() - startTime,
        cached: false,
        ipAddress: req.ip!
      }).catch((err: any) => {
        console.error('[Database] API tracking error:', err.message)
      })
    })
  }
  
  // Generate version-aware ETag for fresh data
  const dataHash = cache.generateETag(result)
  const etag = `"${API_VERSION}-${dataHash}"`
  
  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
  res.setHeader('X-API-Version', API_VERSION)
  
  res.json(result)
}))

export default router
