import logger from '../services/logger.js'
/**
 * Macro Economic Data Routes
 * Endpoints for fetching macro economic indicators
 * 
 * Features:
 * - Multi-layer caching (memory + Redis)
 * - Rate limiting (FMP API protection)
 * - Request deduplication
 * - Secure API key handling
 */

import express from 'express'
import type { Request, Response } from 'express'
import { getCacheService } from '../services/cacheService.js'
import { REDIS_TTL } from '../config/constants.js'
import { fmpLimiter, globalFmpLimiter, decrementGlobalFmpCounter } from '../middleware/rateLimiter.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()
const FMP_BASE_URL = 'https://financialmodelingprep.com'
const cache = getCacheService()

// Dependencies injected from server.ts (secure pattern)
let FMP_API_KEY = ''

/**
 * Initialize route with dependencies
 * Matches pattern from tickerRoutes for consistency
 */
function initMacroRoutes(deps: { apiVersion?: string; fmpApiKey: string; isDatabaseAvailable?: boolean }) {
  FMP_API_KEY = deps.fmpApiKey

  // Request deduplication map (prevent duplicate API calls)
  const inFlightRequests = new Map<string, Promise<unknown>>()

  /**
   * Request deduplication helper
   * If multiple clients request same data, only make one API call
   */
  async function fetchWithDeduplication<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (inFlightRequests.has(key)) {
      logger.info(`[Macro] Dedup: Waiting for in-flight request: ${key}`)
      return await inFlightRequests.get(key) as T
    }
    
    const promise = fetchFn()
    inFlightRequests.set(key, promise as Promise<unknown>)
    
    try {
      const result = await promise
      return result
    } finally {
      inFlightRequests.delete(key)
    }
  }

  /**
   * Fetch with timeout helper
   */
  async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<globalThis.Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(id)
      return response
    } catch (error) {
      clearTimeout(id)
      throw error
    }
  }

/**
 * GET /api/macro/treasury
 * Fetch Treasury Rates (yield curve)
 * Cache: 1 hour (treasury rates update daily)
 */
router.get('/treasury', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query
  
  if (!from || !to) {
    return res.status(400).json({ error: 'Missing required parameters: from, to' })
  }
  
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'treasury', from as string, to as string)
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    // Decrement global FMP counter for cache hits
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] Treasury → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] Treasury → Fetching from FMP API`)
  
  // Use request deduplication
  const data = await fetchWithDeduplication(cacheKey, async () => {
    const url = `${FMP_BASE_URL}/api/v4/treasury?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    return await response.json()
  })
  
  // Cache for 7 days (historical treasury data doesn't change)
  await cache.set(cacheKey, data, REDIS_TTL.MACRO_HISTORICAL as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(data)
}))

/**
 * GET /api/macro/economic
 * Fetch Economic Indicator by name
 * Cache: 1 hour (economic data updates infrequently)
 */
router.get('/economic', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query
  
  if (!name) {
    return res.status(400).json({ error: 'Missing required parameter: name' })
  }
  
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'economic', name as string)
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] Economic/${name} → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] Economic/${name} → Fetching from FMP API`)
  
  const data = await fetchWithDeduplication(cacheKey, async () => {
    const url = `${FMP_BASE_URL}/api/v4/economic?name=${name}&apikey=${FMP_API_KEY}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    return await response.json()
  })
  
  // Cache for 7 days (economic indicators update monthly/quarterly)
  await cache.set(cacheKey, data, REDIS_TTL.MACRO_LONG as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(data)
}))

/**
 * GET /api/macro/spx
 * Fetch S&P 500 historical data
 * Cache: 8 hours (historical data changes infrequently)
 */
router.get('/spx', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query
  
  if (!from || !to) {
    return res.status(400).json({ error: 'Missing required parameters: from, to' })
  }
  
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'spx', from as string, to as string)
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] SPX → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] SPX → Fetching from FMP API`)
  
  const historical = await fetchWithDeduplication(cacheKey, async () => {
    const url = `${FMP_BASE_URL}/api/v3/historical-price-full/%5EGSPC?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    return (data as any).historical || []
  })
  
  // Cache for 7 days (historical price data doesn't change)
  await cache.set(cacheKey, historical, REDIS_TTL.MACRO_HISTORICAL as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(historical)
}))

/**
 * GET /api/macro/index-stats
 * Fetch price change stats for major indices (S&P 500, Dow Jones, Russell 2000)
 * Cache: 5 minutes (real-time quote data)
 * Uses quote endpoint which is more reliable than stock-price-change
 */
router.get('/index-stats', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'index-stats')
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] Index Stats → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] Index Stats → Fetching from FMP API`)
  
  const validData = await fetchWithDeduplication(cacheKey, async () => {
    const symbols = ['%5EGSPC', '%5EDJI', '%5ERUT', '%5EHSI', '%5EGDAXI'] // S&P 500, Dow Jones, Russell 2000, Hang Seng, DAX (URL encoded ^)
    
    // Use batch quote endpoint - FMP supports comma-separated symbols (5 calls → 1 call)
    const symbolsParam = symbols.join(',')
    const response = await fetchWithTimeout(
      `${FMP_BASE_URL}/api/v3/quote/${symbolsParam}?apikey=${FMP_API_KEY}`,
      {},
      10000
    )
    
    if (!response.ok) {
      logger.error(`[Macro] Index stats API error: ${response.statusText}`)
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const json = await response.json()
    
    // Check for FMP API error messages
    if (json && typeof json === 'object' && 'Error Message' in json) {
      logger.error('[Macro] FMP API Error:', json['Error Message'])
      throw new Error(json['Error Message'] as string)
    }
    
    // Quote endpoint with multiple symbols returns an array of quotes
    const quotes = Array.isArray(json) ? json : [json]
    
    // Transform quote data to match IndexStats interface
    const data = quotes.map((quote: any) => {
      if (quote && typeof quote === 'object' && 'symbol' in quote && 'changesPercentage' in quote) {
        return {
          symbol: quote.symbol,
          '1D': quote.changesPercentage || 0,
          '5D': 0, // Not available in quote endpoint
          '1M': 0,
          '3M': 0,
          '6M': 0,
          ytd: 0,
          '1Y': 0,
          '3Y': 0,
          '5Y': 0,
          '10Y': 0,
          max: 0
        }
      }
      logger.warn('[Macro] Invalid index stats response:', quote)
      return null
    }).filter((d: any) => d !== null)
    
    if (data.length === 0) {
      logger.error('[Macro] No valid index stats data received')
      return []
    }
    
    logger.info(`[Macro] Index Stats → Successfully fetched ${data.length} indices in single batch call`)
    return data
  })
  
  // Cache for 15 minutes (reasonable delay for macro dashboard)
  await cache.set(cacheKey, validData, REDIS_TTL.MACRO_QUOTE as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(validData)
}))

/**
 * GET /api/macro/sectors
 * Fetch sector performance data
 * Cache: 5 minutes (sector performance updates frequently during trading hours)
 */
router.get('/sectors', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'sectors')
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] Sectors → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] Sectors → Fetching from FMP API`)
  
  const data = await fetchWithDeduplication(cacheKey, async () => {
    const url = `${FMP_BASE_URL}/api/v3/sector-performance?apikey=${FMP_API_KEY}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    return await response.json()
  })
  
  // Cache for 15 minutes (reasonable delay for macro dashboard)
  await cache.set(cacheKey, data, REDIS_TTL.MACRO_QUOTE as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(data)
}))

/**
 * GET /api/macro/risk-premium
 * Fetch market risk premium data for all countries
 * Cache: 7 days (risk premium data rarely changes)
 */
router.get('/risk-premium', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'risk-premium')
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] Risk Premium → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] Risk Premium → Fetching from FMP API`)
  
  const data = await fetchWithDeduplication(cacheKey, async () => {
    const url = `${FMP_BASE_URL}/stable/market-risk-premium?apikey=${FMP_API_KEY}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    return await response.json()
  })
  
  // Validate data structure
  if (!Array.isArray(data) || data.length === 0) {
    logger.warn('[Macro] Risk premium returned empty or invalid data')
    res.setHeader('X-Cache', 'miss')
    return res.json([])
  }
  
  // Cache for 1 hour (derived from treasury data)
  await cache.set(cacheKey, data, REDIS_TTL.MACRO_CALCULATED as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(data)
}))

/**
 * GET /api/macro/batch
 * Fetch ALL macro data in a single request (optimized)
 * Cache: 5 minutes (real-time data updates frequently)
 * 
 * This replaces 10+ individual API calls with 1 batch request
 */
router.get('/batch', fmpLimiter, globalFmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query
  const fromDate = from || getDateMonthsAgo(12)
  const toDate = to || getTodayDate()
  
  // Generate cache key
  const cacheKey = cache.generateKey('macro', 'batch', fromDate as string, toDate as string)
  
  // Check cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) {
      decrementGlobalFmpCounter()
    }
    logger.info(`[Macro] Batch → CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  logger.info(`[Macro] Batch → Fetching all data from FMP API`)
  const startTime = Date.now()
  
  // Fetch all data in parallel
  const data = await fetchWithDeduplication(cacheKey, async () => {
    const symbols = ['%5EGSPC', '%5EDJI', '%5ERUT', '%5EHSI', '%5EGDAXI'] // Index symbols: S&P 500, Dow Jones, Russell 2000, Hang Seng, DAX
    
    const [
      treasuryRes,
      fedFundsRes,
      consumerSentimentRes,
      retailSalesRes,
      inflationRes,
      unemploymentRes,
      indexQuotesRes,
      housingStartsRes
    ] = await Promise.allSettled([
      // Treasury rates
      fetchWithTimeout(`${FMP_BASE_URL}/api/v4/treasury?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`, {}, 10000),
      // Economic indicators (FMP does NOT support batch for these - must be separate calls)
      fetchWithTimeout(`${FMP_BASE_URL}/api/v4/economic?name=federalFunds&apikey=${FMP_API_KEY}`, {}, 10000),
      fetchWithTimeout(`${FMP_BASE_URL}/api/v4/economic?name=consumerSentiment&apikey=${FMP_API_KEY}`, {}, 10000),
      fetchWithTimeout(`${FMP_BASE_URL}/api/v4/economic?name=retailSales&apikey=${FMP_API_KEY}`, {}, 10000),
      fetchWithTimeout(`${FMP_BASE_URL}/api/v4/economic?name=inflation&apikey=${FMP_API_KEY}`, {}, 10000),
      fetchWithTimeout(`${FMP_BASE_URL}/api/v4/economic?name=unemploymentRate&apikey=${FMP_API_KEY}`, {}, 10000),
      // Index quotes - batch call for all 5 indices (optimized: 5 calls → 1 call)
      fetchWithTimeout(`${FMP_BASE_URL}/api/v3/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`, {}, 10000),
      // Housing starts - fetch full historical data from 1959 (earliest available) to match other economic indicators
      fetchWithTimeout(`${FMP_BASE_URL}/stable/economic-indicators?name=newPrivatelyOwnedHousingUnitsStartedTotalUnits&from=1959-01-01&to=${toDate}&apikey=${FMP_API_KEY}`, {}, 10000)
    ])
    
    // Process results
    const batchData: any = {
      treasuryRates: [],
      federalFunds: [],
      consumerSentiment: [],
      retailSales: [],
      inflation: [],
      unemploymentRate: [],
      indexStats: [],
      housingStarts: [],
      timestamp: new Date().toISOString()
    }
    
    // Treasury rates
    if (treasuryRes.status === 'fulfilled' && treasuryRes.value.ok) {
      batchData.treasuryRates = await treasuryRes.value.json()
    }
    
    // Economic indicators
    if (fedFundsRes.status === 'fulfilled' && fedFundsRes.value.ok) {
      batchData.federalFunds = await fedFundsRes.value.json()
    }
    if (consumerSentimentRes.status === 'fulfilled' && consumerSentimentRes.value.ok) {
      batchData.consumerSentiment = await consumerSentimentRes.value.json()
    }
    if (retailSalesRes.status === 'fulfilled' && retailSalesRes.value.ok) {
      batchData.retailSales = await retailSalesRes.value.json()
    }
    if (inflationRes.status === 'fulfilled' && inflationRes.value.ok) {
      batchData.inflation = await inflationRes.value.json()
    }
    if (unemploymentRes.status === 'fulfilled' && unemploymentRes.value.ok) {
      batchData.unemploymentRate = await unemploymentRes.value.json()
    }
    
    // Index stats (transform batch quotes to IndexStats format)
    if (indexQuotesRes.status === 'fulfilled' && indexQuotesRes.value.ok) {
      const json = await indexQuotesRes.value.json()
      const quotes = Array.isArray(json) ? json : [json]
      
      const indexStats = quotes.map((quote: any) => {
        if (quote && typeof quote === 'object' && 'symbol' in quote && 'changesPercentage' in quote) {
          return {
            symbol: quote.symbol,
            '1D': quote.changesPercentage || 0,
            '5D': 0,
            '1M': 0,
            '3M': 0,
            '6M': 0,
            ytd: 0,
            '1Y': 0,
            '3Y': 0,
            '5Y': 0,
            '10Y': 0,
            max: 0
          }
        }
        return null
      }).filter((q: any) => q !== null)
      
      batchData.indexStats = indexStats
    }
    
    // Housing Starts
    if (housingStartsRes.status === 'fulfilled' && housingStartsRes.value.ok) {
      const housingData = await housingStartsRes.value.json()
      logger.info('[Macro] Housing Starts response type:', typeof housingData, 'IsArray:', Array.isArray(housingData), 'Count:', Array.isArray(housingData) ? housingData.length : 0)
      // Stable endpoint returns array with 'name' field: [{name, date, value}, ...]
      // Transform to match EconomicIndicator interface: [{date, value}, ...]
      batchData.housingStarts = Array.isArray(housingData) 
        ? housingData.map((item: any) => ({ date: item.date, value: item.value }))
        : []
    } else {
      logger.info('[Macro] Housing Starts fetch failed. Status:', housingStartsRes.status, 
        housingStartsRes.status === 'rejected' ? housingStartsRes.reason : 
        (housingStartsRes.status === 'fulfilled' ? 'Response not OK' : 'Unknown'))
    }
    
    return batchData
  })
  
  const duration = Date.now() - startTime
  logger.info(`[Macro] Batch → Fetched all data in ${duration}ms (8 FMP API calls - removed SPX, sectors, risk premium)`)
  logger.info(`[Macro] Batch → housingStarts array length: ${data.housingStarts?.length || 0}`)
  
  // Cache for 15 minutes (balanced between freshness and performance)
  await cache.set(cacheKey, data, REDIS_TTL.MACRO_QUOTE as any)
  
  res.setHeader('X-Cache', 'miss')
  res.json(data)
}))

  return router
}

// Helper functions
function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0] || ''
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] || ''
}

// Export both router and initialization function for consistency with other routes
export { initMacroRoutes }
export default router


