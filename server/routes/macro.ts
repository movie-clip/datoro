/**
 * Macro Economic Data Routes
 * Endpoints for fetching macro economic indicators
 */

import express from 'express'
import type { Request, Response } from 'express'
import { getCacheService } from '../services/cacheService.js'
import { REDIS_TTL } from '../config/constants.js'

const router = express.Router()
const FMP_BASE_URL = 'https://financialmodelingprep.com'
const fmpApiKey = process.env.FMP_API_KEY
const cache = getCacheService()

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<globalThis.Response> {
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
router.get('/treasury', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: from, to' })
    }
    
    // Generate cache key
    const cacheKey = cache.generateKey('macro', 'treasury', from as string, to as string)
    
    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Macro] Treasury → CACHE HIT (${cached.source})`)
      return res.json(cached.data)
    }
    
    console.log(`[Macro] Treasury → Fetching from FMP API`)
    const url = `${FMP_BASE_URL}/api/v4/treasury?from=${from}&to=${to}&apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache for 1 hour
    await cache.set(cacheKey, data, REDIS_TTL.DEFAULT)
    
    res.json(data)
  } catch (error: any) {
    console.error('[Macro] Treasury rates error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to fetch treasury rates' })
  }
})

/**
 * GET /api/macro/economic
 * Fetch Economic Indicator by name
 * Cache: 1 hour (economic data updates infrequently)
 */
router.get('/economic', async (req: Request, res: Response) => {
  try {
    const { name } = req.query
    
    if (!name) {
      return res.status(400).json({ error: 'Missing required parameter: name' })
    }
    
    // Generate cache key
    const cacheKey = cache.generateKey('macro', 'economic', name as string)
    
    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Macro] Economic/${name} → CACHE HIT (${cached.source})`)
      return res.json(cached.data)
    }
    
    console.log(`[Macro] Economic/${name} → Fetching from FMP API`)
    const url = `${FMP_BASE_URL}/api/v4/economic?name=${name}&apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache for 1 hour
    await cache.set(cacheKey, data, REDIS_TTL.DEFAULT)
    
    res.json(data)
  } catch (error: any) {
    console.error(`[Macro] Economic indicator (${req.query.name}) error:`, error.message)
    res.status(500).json({ error: error.message || 'Failed to fetch economic indicator' })
  }
})

/**
 * GET /api/macro/spx
 * Fetch S&P 500 historical data
 * Cache: 8 hours (historical data changes infrequently)
 */
router.get('/spx', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: from, to' })
    }
    
    // Generate cache key
    const cacheKey = cache.generateKey('macro', 'spx', from as string, to as string)
    
    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Macro] SPX → CACHE HIT (${cached.source})`)
      return res.json(cached.data)
    }
    
    console.log(`[Macro] SPX → Fetching from FMP API`)
    const url = `${FMP_BASE_URL}/api/v3/historical-price-full/%5EGSPC?from=${from}&to=${to}&apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    const historical = (data as any).historical || []
    
    // Cache for 8 hours (price history)
    await cache.set(cacheKey, historical, REDIS_TTL.PRICE_HISTORY as any)
    
    res.json(historical)
  } catch (error: any) {
    console.error('[Macro] SPX data error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to fetch SPX data' })
  }
})

/**
 * GET /api/macro/index-stats
 * Fetch price change stats for major indices (S&P 500, Dow Jones, Russell 2000)
 * Cache: 5 minutes (real-time quote data)
 * Uses quote endpoint which is more reliable than stock-price-change
 */
router.get('/index-stats', async (req: Request, res: Response) => {
  try {
    // Generate cache key
    const cacheKey = cache.generateKey('macro', 'index-stats')
    
    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Macro] Index Stats → CACHE HIT (${cached.source})`)
      return res.json(cached.data)
    }
    
    console.log(`[Macro] Index Stats → Fetching from FMP API`)
    const symbols = ['%5EGSPC', '%5EDJI', '%5ERUT'] // S&P 500, Dow Jones, Russell 2000 (URL encoded ^)
    
    // Use quote endpoint instead of stock-price-change for better reliability
    const requests = symbols.map(symbol => 
      fetchWithTimeout(
        `${FMP_BASE_URL}/api/v3/quote/${symbol}?apikey=${fmpApiKey}`,
        {},
        10000
      )
    )
    
    const responses = await Promise.all(requests)
    const data = await Promise.all(responses.map(async (r) => {
      if (!r.ok) {
        console.error(`[Macro] Index stats API error: ${r.statusText}`)
        return null
      }
      const json = await r.json()
      
      // Quote endpoint returns an array
      const quote = Array.isArray(json) ? json[0] : json
      
      // Check for FMP API error messages
      if (quote && typeof quote === 'object' && 'Error Message' in quote) {
        console.error('[Macro] FMP API Error:', quote['Error Message'])
        return null
      }
      
      // Transform quote data to match IndexStats interface
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
      console.warn('[Macro] Invalid index stats response:', quote)
      return null
    }))
    
    // Filter out failed requests
    const validData = data.filter(d => d !== null)
    
    if (validData.length === 0) {
      console.error('[Macro] No valid index stats data received')
      return res.json([])
    }
    
    console.log(`[Macro] Index Stats → Successfully fetched ${validData.length} indices`)
    
    // Cache for 5 minutes (quote data)
    await cache.set(cacheKey, validData, REDIS_TTL.QUOTE as any)
    
    res.json(validData)
  } catch (error: any) {
    console.error('[Macro] Index stats error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to fetch index stats' })
  }
})

/**
 * GET /api/macro/sectors
 * Fetch sector performance data
 * Cache: 5 minutes (sector performance updates frequently during trading hours)
 */
router.get('/sectors', async (req: Request, res: Response) => {
  try {
    // Generate cache key
    const cacheKey = cache.generateKey('macro', 'sectors')
    
    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Macro] Sectors → CACHE HIT (${cached.source})`)
      return res.json(cached.data)
    }
    
    console.log(`[Macro] Sectors → Fetching from FMP API`)
    const url = `${FMP_BASE_URL}/api/v3/sector-performance?apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache for 5 minutes
    await cache.set(cacheKey, data, REDIS_TTL.QUOTE as any)
    
    res.json(data)
  } catch (error: any) {
    console.error('[Macro] Sectors data error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to fetch sector data' })
  }
})

/**
 * GET /api/macro/risk-premium
 * Fetch market risk premium data for all countries
 * Cache: 7 days (risk premium data rarely changes)
 */
router.get('/risk-premium', async (req: Request, res: Response) => {
  try {
    // Generate cache key
    const cacheKey = cache.generateKey('macro', 'risk-premium')
    
    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached.data) {
      console.log(`[Macro] Risk Premium → CACHE HIT (${cached.source})`)
      return res.json(cached.data)
    }
    
    console.log(`[Macro] Risk Premium → Fetching from FMP API`)
    const url = `${FMP_BASE_URL}/stable/market-risk-premium?apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 10000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Validate data structure
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[Macro] Risk premium returned empty or invalid data')
      return res.json([])
    }
    
    // Cache for 7 days (data rarely changes)
    await cache.set(cacheKey, data, REDIS_TTL.FINANCIAL_STATEMENTS as any)
    
    res.json(data)
  } catch (error: any) {
    console.error('[Macro] Risk premium data error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to fetch risk premium data' })
  }
})

export default router
