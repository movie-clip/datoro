import logger from '../services/logger.js'
// server/routes/tickerRoutes.ts
// Ticker data endpoints - batch data fetching from FMP

/// <reference path="../types/express.d.ts" />

import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import type { TickerDataRequest, TickerDataResponse, ErrorResponse } from '../types/api.types.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { fmpLimiter, globalFmpLimiter, decrementGlobalFmpCounter } from '../middleware/rateLimiter.js'
import { getCacheService, CacheTTL } from '../services/cacheService.js'
import { resolveQuoteTtlSeconds } from '../services/quoteTtlPolicyService.js'
import { trackSearch, updateTickerCompanyName, trackApiRequest } from '../services/databaseService.js'
import { fetchTickerBatch, fetchTickerPriority, fetchTickerQuote } from '../services/batchDataService.js'

const router = express.Router()
const cache = getCacheService()

// Database health flag (shared from server.mjs - will be injected)
let isDatabaseAvailable = true

// API Version (injected from server.mjs)
// v2.7: Cache invalidation for price history fix (Nov 2025 - ensures 30-year data in production)
let API_VERSION = 'v2.7'
let FMP_API_KEY = ''

const quoteRefreshMetrics = {
  attempts: 0,
  success: 0,
  failures: 0
}

interface CachedBatchEntry {
  data: unknown
  etag: string
  cachedAt: string
}

interface PrefetchedBatchCache {
  data: unknown
  source: 'memory' | 'redis' | null
}

interface PrefetchedQuoteCache {
  data: unknown
  source: 'memory' | 'redis' | null
}

interface PrefetchedStaticCache {
  data: unknown
  source: 'memory' | 'redis' | null
}

function isCachedBatchEntry(value: unknown): value is CachedBatchEntry {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.etag === 'string' && typeof v.cachedAt === 'string' && 'data' in v
}

function buildLegacyEtag(value: unknown): string {
  if (value && typeof value === 'object') {
    const timestamp = (value as Record<string, unknown>).timestamp
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp)
      if (Number.isFinite(parsed)) return `legacy-${parsed}`
    }
  }

  return `legacy-${Date.now()}`
}

function normalizeTicker(ticker?: string): string {
  return (ticker ?? '').toUpperCase().trim()
}

async function precheckTickerCache(req: Request, _res: Response, next: NextFunction) {
  const { ticker } = req.params
  const mode = (req.query.mode as string) || 'full'
  const t = normalizeTicker(ticker)

  // Leave validation to route handler; only precheck valid-looking tickers.
  if (!t || !/^[A-Z0-9.]{1,10}$/.test(t)) {
    req.batchCacheHit = false
    return next()
  }

  const cacheKey = cache.generateKey('batch', t, mode, API_VERSION)
  const cached = await cache.get(cacheKey)

  ;(req as Request & { prefetchedBatchCache?: PrefetchedBatchCache }).prefetchedBatchCache = {
    data: cached.data,
    source: cached.source
  }
  req.batchCacheHit = cached.data !== null

  return next()
}

async function precheckQuoteCache(req: Request, _res: Response, next: NextFunction) {
  const { ticker } = req.params
  const t = normalizeTicker(ticker)

  if (!t || !/^[A-Z0-9.]{1,10}$/.test(t)) {
    req.batchCacheHit = false
    return next()
  }

  const cacheKey = cache.generateKey('quote', t)
  const cached = await cache.get(cacheKey)

  ;(req as Request & { prefetchedQuoteCache?: PrefetchedQuoteCache }).prefetchedQuoteCache = {
    data: cached.data,
    source: cached.source
  }
  req.batchCacheHit = cached.data !== null

  return next()
}

async function precheckStaticCache(req: Request, _res: Response, next: NextFunction) {
  const { ticker } = req.params
  const mode = (req.query.mode as string) || 'full'
  const t = normalizeTicker(ticker)

  if (!t || !/^[A-Z0-9.]{1,10}$/.test(t)) {
    req.batchCacheHit = false
    return next()
  }

  const cacheKey = cache.generateKey('batch-static', t, mode, API_VERSION)
  const cached = await cache.get(cacheKey)

  ;(req as Request & { prefetchedStaticCache?: PrefetchedStaticCache }).prefetchedStaticCache = {
    data: cached.data,
    source: cached.source
  }
  req.batchCacheHit = cached.data !== null

  return next()
}

export function toStaticBatchPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
  const { quote: _quote, ...staticData } = data

  return {
    ...payload,
    data: staticData,
    splitMode: 'static'
  }
}

export function shouldRefreshQuote(
  batchTimestampMs: number,
  cachedAtTimestampMs: number,
  hasQuoteArray: boolean,
  quoteTtlSeconds: number,
  nowMs: number = Date.now()
): boolean {
  if (!hasQuoteArray) return false

  const freshnessBaseTimestamp = Number.isFinite(batchTimestampMs)
    ? batchTimestampMs
    : cachedAtTimestampMs

  if (!Number.isFinite(freshnessBaseTimestamp)) return false

  const quoteAgeMs = nowMs - freshnessBaseTimestamp
  const quoteTtlMs = quoteTtlSeconds * 1000
  return quoteAgeMs > quoteTtlMs
}

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
router.get('/:ticker', precheckTickerCache, fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response<TickerDataResponse | ErrorResponse>) => {
  const startTime = Date.now()
  const { ticker } = req.params
  const mode = (req.query.mode as string) || 'full' // 'full' or 'priority'
  
  const t = normalizeTicker(ticker)
  
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
  logger.debug(`[Batch] ${t} (${mode}) → Checking cache (key: ${cacheKey})`)
  const prefetched = (req as Request & { prefetchedBatchCache?: PrefetchedBatchCache }).prefetchedBatchCache
  const cached = prefetched?.data !== undefined
    ? prefetched
    : await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`[Batch] ${t} (${mode}) → CACHE HIT (${cached.source})`)
    
    // Decrement global FMP counter for cache hits (not actual API calls)
    if (req.fmpCallTracked) {
      decrementGlobalFmpCounter(req)
    }
    
    res.setHeader('X-Cache', cached.source || 'unknown')
    
    // Normalize cache shape: always use wrapped envelope to avoid expensive ETag recompute on hot path.
    let cacheEntry: CachedBatchEntry
    let quoteRefreshed = false

    if (isCachedBatchEntry(cached.data)) {
      cacheEntry = cached.data
    } else {
      cacheEntry = {
        data: cached.data,
        etag: buildLegacyEtag(cached.data),
        cachedAt: new Date().toISOString()
      }

      // Migrate legacy cache format in background.
      cache.setFast(cacheKey, cacheEntry, CacheTTL.COMPANY_PROFILE)
    }

    // Keep dynamic quote data fresh while preserving long-lived static batch cache.
    // If cached batch is older than quote TTL, refresh quote only (cheap call) instead of full batch.
    const batchPayload = cacheEntry.data as any
    const batchTimestamp = batchPayload?.timestamp ? Date.parse(batchPayload.timestamp) : NaN
    const cachedAtTimestamp = Date.parse(cacheEntry.cachedAt)
    const hasQuoteArray = Array.isArray(batchPayload?.data?.quote)
    const nowMs = Date.now()
    const shouldRefresh = shouldRefreshQuote(
      batchTimestamp,
      cachedAtTimestamp,
      hasQuoteArray,
      resolveQuoteTtlSeconds(),
      nowMs
    )

    if (shouldRefresh) {
      quoteRefreshMetrics.attempts += 1
      const quoteCacheKey = cache.generateKey('quote', t)
      const quoteTtlSeconds = resolveQuoteTtlSeconds()
      const freshQuote = await cache.getOrFetch<unknown[] | null>(
        quoteCacheKey,
        () => fetchTickerQuote(t, FMP_API_KEY),
        quoteTtlSeconds
      )

      if (freshQuote && freshQuote.length > 0) {
        batchPayload.data.quote = freshQuote
        batchPayload.timestamp = new Date().toISOString()
        quoteRefreshed = true
        quoteRefreshMetrics.success += 1
        cacheEntry.cachedAt = new Date().toISOString()
        cacheEntry.etag = `quote-${Date.now().toString(36)}`

        // Write refreshed envelope back to cache asynchronously.
        cache.setFast(cacheKey, cacheEntry, CacheTTL.COMPANY_PROFILE)
      } else {
        quoteRefreshMetrics.failures += 1
        logger.warn(`[Batch] ${t} (${mode}) → Quote refresh failed (empty or null response)`)
      }
    }

    if (quoteRefreshed) {
      logger.info(`[Batch] ${t} (${mode}) → Quote refreshed from API (cache payload preserved)`, {
        quoteAgeMs: Number.isFinite(batchTimestamp) || Number.isFinite(cachedAtTimestamp)
          ? nowMs - (Number.isFinite(batchTimestamp) ? batchTimestamp : cachedAtTimestamp)
          : null,
        quoteRefreshMetrics
      })
    }

    const responseData: unknown = cacheEntry.data
    const dataHash = cacheEntry.etag
    
    // Version-aware ETag: prefix with API version to prevent stale 304s
    // When API_VERSION changes, all ETags become invalid automatically
    const etag = `"${API_VERSION}-${dataHash}"`
    
    // Check if client has same version (ETag match with version prefix)
    const clientEtag = req.headers['if-none-match']
    if (clientEtag === etag) {
      logger.debug(`[Batch] ${t} (${mode}) → 304 Not Modified (ETag match, version ${API_VERSION})`)
      res.setHeader('ETag', etag)
      res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
      res.setHeader('X-API-Version', API_VERSION)
      return res.status(304).end()
    }
    
    // Track in database (truly async - don't block response)
    if (isDatabaseAvailable) {
      setImmediate(() => {
        trackSearch(req.ip!, t, req.headers['user-agent'] || '', 'batch').catch((err: any) => {
          logger.error('[Database] Search tracking error:', err.message)
        })
      })
    }
    
    // Send cached data with version-aware ETag
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
    res.setHeader('X-API-Version', API_VERSION)
    return res.json(responseData as TickerDataResponse | ErrorResponse)
  }
  
  logger.info(`[Batch] ${t} (${mode}) → CACHE MISS - Fetching from FMP...`)
  
  // Coalesce concurrent misses so only one request fetches from FMP for the same key.
  const cachedEntry = await cache.getOrFetch<CachedBatchEntry>(
    cacheKey,
    async () => {
      const result = mode === 'priority'
        ? await fetchTickerPriority(t, FMP_API_KEY)
        : await fetchTickerBatch(t, FMP_API_KEY)

      return {
        data: result,
        etag: cache.generateETag(result),
        cachedAt: new Date().toISOString()
      }
    },
    CacheTTL.COMPANY_PROFILE
  )

  const result = cachedEntry.data as any
  const dataHash = cachedEntry.etag
  const etag = `"${API_VERSION}-${dataHash}"`
  logger.debug(`[Batch] ${t} (${mode}) → Cached with key: ${cacheKey}, TTL: ${CacheTTL.COMPANY_PROFILE}s`)
  
  res.setHeader('X-Cache', 'miss')
  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
  res.setHeader('X-API-Version', API_VERSION)
  
  logger.debug(`[Batch] ${t} (${mode}) → Fetched in ${result.fetchDuration}ms`)
  
  // Track in database (truly async - use setImmediate to not block response)
  if (isDatabaseAvailable) {
    setImmediate(() => {
      trackSearch(req.ip!, t, req.headers['user-agent'] || '', 'batch').catch((err: any) => {
        logger.error('[Database] Search tracking error:', err.message)
      })
      
      // Update company name if available
      if (result.data.profile && Array.isArray(result.data.profile) && result.data.profile[0]?.companyName) {
        updateTickerCompanyName(t, result.data.profile[0].companyName).catch((err: any) => {
          logger.error('[Database] Company name update error:', err.message)
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
        logger.error('[Database] API tracking error:', err.message)
      })
    })
  }
  
  res.json(result)
}))

router.get('/:ticker/static', precheckStaticCache, fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response<TickerDataResponse | ErrorResponse>) => {
  const { ticker } = req.params
  const mode = (req.query.mode as string) || 'full'
  const t = normalizeTicker(ticker)

  if (!t || !/^[A-Z0-9.]{1,10}$/.test(t)) {
    return res.status(400).json({
      error: {
        message: 'Invalid ticker format',
        code: 'E001',
        details: 'Ticker must be 1-10 characters (letters, numbers, dots)'
      }
    })
  }

  const staticCacheKey = cache.generateKey('batch-static', t, mode, API_VERSION)
  const prefetchedStatic = (req as Request & { prefetchedStaticCache?: PrefetchedStaticCache }).prefetchedStaticCache
  const staticCached = prefetchedStatic?.data !== undefined
    ? prefetchedStatic
    : await cache.get(staticCacheKey)
  if (staticCached.data) {
    if (req.fmpCallTracked) {
      decrementGlobalFmpCounter(req)
    }

    res.setHeader('X-Cache', staticCached.source || 'unknown')
    return res.json(staticCached.data as TickerDataResponse)
  }

  const staticPayload = await cache.getOrFetch<TickerDataResponse>(
    staticCacheKey,
    async () => {
      const full = mode === 'priority'
        ? await fetchTickerPriority(t, FMP_API_KEY, { includeQuote: false })
        : await fetchTickerBatch(t, FMP_API_KEY, { includeQuote: false })

      return toStaticBatchPayload(full)
    },
    CacheTTL.COMPANY_PROFILE
  )

  res.setHeader('X-Cache', 'miss')
  return res.json(staticPayload)
}))

router.get('/:ticker/dynamic', precheckQuoteCache, fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response<{ ticker: string; timestamp: string; quote: unknown[] } | ErrorResponse>) => {
  const { ticker } = req.params
  const t = normalizeTicker(ticker)

  if (!t || !/^[A-Z0-9.]{1,10}$/.test(t)) {
    return res.status(400).json({
      error: {
        message: 'Invalid ticker format',
        code: 'E001',
        details: 'Ticker must be 1-10 characters (letters, numbers, dots)'
      }
    })
  }

  const quoteCacheKey = cache.generateKey('quote', t)
  const prefetchedQuote = (req as Request & { prefetchedQuoteCache?: PrefetchedQuoteCache }).prefetchedQuoteCache
  const quoteCached = prefetchedQuote?.data !== undefined
    ? prefetchedQuote
    : await cache.get(quoteCacheKey)

  if (Array.isArray(quoteCached.data)) {
    if (req.fmpCallTracked) {
      decrementGlobalFmpCounter(req)
    }

    res.setHeader('X-Cache', quoteCached.source || 'unknown')
    return res.json({
      ticker: t,
      timestamp: new Date().toISOString(),
      quote: quoteCached.data
    })
  }

  const quote = await cache.getOrFetch<unknown[] | null>(
    quoteCacheKey,
    () => fetchTickerQuote(t, FMP_API_KEY),
    resolveQuoteTtlSeconds()
  )

  if (!quote || quote.length === 0) {
    return res.status(502).json({
      error: {
        message: 'Failed to fetch quote data',
        code: 'E002',
        details: 'Quote endpoint returned empty response'
      }
    })
  }

  res.setHeader('X-Cache', 'miss')
  return res.json({
    ticker: t,
    timestamp: new Date().toISOString(),
    quote
  })
}))

export default router


