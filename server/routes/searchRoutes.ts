// server/routes/searchRoutes.ts
// Search and discovery endpoints

import express, { type Request, type Response } from 'express'
import fetch from 'node-fetch'
import { asyncHandler } from '../utils/asyncHandler.js'
import { fmpLimiter } from '../middleware/rateLimiter.js'
import { getCacheService, CacheTTL } from '../services/cacheService.js'

const router = express.Router()
const cache = getCacheService()

// Dependencies injected from server.mjs
let FMP_API_KEY = ''
let API_VERSION = 'v2.6'

/**
 * Initialize search routes with dependencies
 */
export function initSearchRoutes(deps: { fmpApiKey: string; apiVersion: string }) {
  FMP_API_KEY = deps.fmpApiKey
  API_VERSION = deps.apiVersion
  return router
}

/**
 * GET /api/search
 * 
 * Search for stock tickers by symbol or name
 * Features:
 * - Long-term caching (7 days)
 * - Optimized result prioritization (exact matches first)
 * - Client-side caching (5 minutes)
 * - Timeout protection (5 seconds)
 * 
 * @param {string} query - Search query (1-10 characters)
 * @returns {Array} - Top 5 matching stocks with symbol, name, exchange
 */
router.get('/search', fmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now()
  const query = req.query.query as string | undefined
  
  // Validate query length (min 1 char, max 10)
  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      error: {
        message: 'Search query is required',
        code: 'E_SEARCH_001'
      }
    })
  }
  
  if (query.trim().length > 10) {
    return res.status(400).json({
      error: {
        message: 'Search query too long (max 10 characters)',
        code: 'E_SEARCH_003'
      }
    })
  }
  
  const searchQuery = query.trim().toUpperCase()
  
  // Generate cache key with namespace for easy invalidation
  const cacheKey = cache.generateKey('search', searchQuery, '')
  
  // Check multi-layer cache (memory + Redis)
  const cached = await cache.get(cacheKey)
  
  if (cached && cached.data) {
    const duration = Date.now() - startTime
    console.log(`[Search] Cache hit (${cached.source}) for "${searchQuery}" in ${duration}ms`)
    
    // Set cache headers for client-side caching
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 minutes client cache
      'X-Cache': 'HIT',
      'X-Cache-Source': cached.source
    })
    
    return res.json(cached.data)
  }
  
  // Fetch from FMP API with timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
  
  const fmpUrl = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(searchQuery)}&limit=10&apikey=${FMP_API_KEY}`
  
  const response = await fetch(fmpUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  
  clearTimeout(timeoutId)
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`)
  }
  
  const data = await response.json() as any[]
  
  // Optimize filtering and sorting with early termination
  const results: unknown[] = []
  const exactMatch: unknown[] = []
  const startsWithMatch: unknown[] = []
  const otherMatches: unknown[] = []
  
  // Single pass filtering and categorization
  for (const item of data || []) {
    if (!item.symbol || !item.name) continue
    
    const formatted = {
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchangeShortName || item.stockExchange || ''
    }
    
    if (item.symbol === searchQuery) {
      exactMatch.push(formatted)
    } else if (item.symbol.startsWith(searchQuery)) {
      startsWithMatch.push(formatted)
    } else {
      otherMatches.push(formatted)
    }
    
    // Early termination if we have enough results
    if (exactMatch.length + startsWithMatch.length >= 5) break
  }
  
  // Combine results in priority order
  results.push(...exactMatch)
  results.push(...startsWithMatch.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol)))
  results.push(...otherMatches.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol)))
  
  // Limit to 5 results
  const finalResults = results.slice(0, 5)
  
  // Cache for 7 days (search results are stable)
  await cache.set(cacheKey, finalResults, 7 * 24 * 60 * 60) // 7 days
  
  const duration = Date.now() - startTime
  console.log(`[Search] API call for "${searchQuery}" → ${finalResults.length} results in ${duration}ms`)
  
  // Set cache headers
  res.set({
    'Cache-Control': 'public, max-age=300',
    'X-Cache': 'MISS'
  })
  
  res.json(finalResults)
}))

/**
 * GET /api/deep-finder
 * 
 * Find stocks by distance from 200-day moving average (MA200)
 * Used for value screening - finds oversold/overbought stocks
 * 
 * Features:
 * - Batch quote fetching (single API call)
 * - Parallel historical data processing
 * - 5-minute caching
 * - Custom or default ticker lists
 * 
 * @param {string} tickers - Optional comma-separated list of tickers (max 50)
 * @returns {Object} - Stocks sorted by distance from MA200 (negative = below MA)
 */
router.get('/deep-finder', fmpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now()
  
  // Get tickers from query param (comma-separated) or use default list
  const tickersParam = req.query.tickers as string | undefined
  let stockList: string[]
  
  if (tickersParam) {
    // Use provided tickers (from watchlist)
    stockList = tickersParam
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0)
      .slice(0, 50) // Limit to 50 stocks max
  } else {
    // Fallback to default stock list (30 popular S&P 500 stocks)
    stockList = [
      'AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'TSLA', 'AVGO', 'ORCL', 'AMD', 'CRM',
      'JPM', 'BAC', 'WFC', 'GS', 'MS',
      'JNJ', 'UNH', 'LLY', 'PFE', 'ABBV',
      'AMZN', 'WMT', 'HD', 'MCD', 'NKE', 'SBUX',
      'XOM', 'CVX', 'BA', 'CAT'
    ]
  }
  
  // Include tickers in cache key for unique caching per ticker list
  const tickerKey = stockList.sort().join(',')
  const cacheKey = cache.generateKey('deep-finder', tickerKey, API_VERSION)
  
  // Check cache first (5-minute TTL for Deep Finder)
  console.log(`[DeepFinder] Checking cache for ${stockList.length} tickers (key: ${cacheKey})`)
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    console.log(`[DeepFinder] CACHE HIT (${cached.source})`)
    res.setHeader('X-Cache', cached.source || 'unknown')
    res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
    return res.json(cached.data)
  }
  
  console.log(`[DeepFinder] CACHE MISS - Fetching from FMP...`)
  
  if (!FMP_API_KEY) {
    console.error('[DeepFinder] API key not configured')
    return res.status(500).json({ error: 'FMP_API_KEY is not set on the server' })
  }
  
  // Fetch current quotes and 200-day MA in parallel
  const baseUrl = 'https://financialmodelingprep.com'
  
  // OPTIMIZATION: Batch fetch all quotes in a single API call
  const quotesUrl = `${baseUrl}/api/v3/quote/${stockList.join(',')}?apikey=${FMP_API_KEY}`
  const quotesMap = new Map<string, any>()
  
  try {
    const quotesRes = await fetch(quotesUrl)
    if (quotesRes.ok) {
      const quotesData = await quotesRes.json() as any[]
      quotesData.forEach((quote: any) => {
        if (quote && quote.symbol) {
          quotesMap.set(quote.symbol, quote)
        }
      })
      console.log(`[DeepFinder] Fetched ${quotesMap.size} quotes in batch`)
    }
  } catch (_error: any) {
    console.warn(`[DeepFinder] Batch quotes failed:`, _error.message)
  }
  
  // Fetch historical data for each stock (can't be batched)
  const results = await Promise.allSettled(
    stockList.map(async (ticker: string) => {
      try {
        // Get quote from batch fetch
        const quote = quotesMap.get(ticker)
        if (!quote || !quote.price) {
          console.warn(`[DeepFinder] No price data for ${ticker}`)
          return null
        }
        
        // Fetch historical prices (last 250 days to ensure 200 trading days)
        const toDate = new Date().toISOString().split('T')[0]
        const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const historyUrl = `${baseUrl}/api/v3/historical-price-full/${ticker}?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`
        const historyRes = await fetch(historyUrl)
        if (!historyRes.ok) {
          console.warn(`[DeepFinder] History failed for ${ticker}: ${historyRes.status}`)
          return null
        }
        const historyData = await historyRes.json() as any
        
        // Calculate MA200 from historical data
        const historical = historyData.historical || []
        if (historical.length < 200) {
          console.warn(`[DeepFinder] Insufficient data for ${ticker}: ${historical.length} days`)
          return null
        }
        
        // Get last 200 close prices
        const last200Prices = historical.slice(0, 200).map((h: any) => h.close)
        const ma200 = last200Prices.reduce((sum: number, price: number) => sum + price, 0) / 200
        
        // Calculate distance from MA200
        const distance = ((quote.price - ma200) / ma200) * 100
        
        return {
          ticker,
          name: quote.name || ticker,
          price: quote.price,
          ma200: parseFloat(ma200.toFixed(2)),
          distance: parseFloat(distance.toFixed(2)),
          change: quote.changesPercentage || 0
        }
      } catch (_error: any) {
        console.warn(`[DeepFinder] Error processing ${ticker}:`, _error.message)
        return null
      }
    })
  )
  
  // Filter out failures and sort by distance (most negative first)
  const validStocks = results
    .filter((r: any) => r.status === 'fulfilled' && r.value !== null)
    .map((r: any) => r.value)
    .sort((a: any, b: any) => a.distance - b.distance)
  
  const responseData = {
    stocks: validStocks,
    timestamp: new Date().toISOString(),
    fetchDuration: Date.now() - startTime,
    totalStocks: validStocks.length
  }
  
  // Cache for 5 minutes
  await cache.set(cacheKey, responseData, 5 * 60) // 5 minutes
  console.log(`[DeepFinder] Cached ${validStocks.length} stocks`)
  
  res.setHeader('X-Cache', 'MISS')
  res.setHeader('Cache-Control', 'private, max-age=300') // 5 min client cache
  res.json(responseData)
}))

export default router
