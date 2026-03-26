// server/routes/newsRoutes.ts
// News endpoints - fetch stock news from FMP

/// <reference path="../types/express.d.ts" />

import express from 'express'
import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getCacheService } from '../services/cacheService.js'
import { REDIS_TTL } from '../config/constants.js'
import logger from '../services/logger.js'
import { fmpLimiter } from '../middleware/rateLimiter.js'
import { safeParseNewsResponse } from '../schemas/newsSchemas.js'

const router = express.Router()
const cache = getCacheService()

interface NewsItemLike {
  publishedDate?: string
  date?: string
}

let FMP_API_KEY = ''

/**
 * Validate URL to prevent malicious protocols
 * @param url - URL to validate
 * @returns true if URL is safe (http/https), false otherwise
 */
function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validate ticker format
 * Accepts: AAPL, MSFT, BRK.B, AUTO.L (up to 5 chars + optional .XX suffix)
 * @param ticker - Ticker symbol to validate
 * @returns true if valid format, false otherwise
 */
function isValidTicker(ticker: string): boolean {
  // Allow 1-5 uppercase letters, optional dot + 1-2 uppercase letters
  return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(ticker)
}

/**
 * Initialize route with dependencies
 * @param {Object} deps - Dependencies to inject
 * @param {string} deps.fmpApiKey - FMP API key
 */
export function initNewsRoutes(deps: { fmpApiKey: string }) {
  FMP_API_KEY = deps.fmpApiKey
  return router
}

/**
 * GET /api/news/:ticker
 * 
 * Fetch latest news for a ticker from FMP
 * 
 * Query Parameters:
 * - limit: Number of news items to return (default: 5, max: 20)
 * 
 * Features:
 * - Redis caching (1 hour TTL)
 * - Rate limiting (FMP limiter)
 * - Validates ticker format
 * - Graceful error handling
 * - Returns ticker-specific news only
 */
router.get(
  '/:ticker',
  fmpLimiter, // Rate limit FMP API calls
  asyncHandler(async (req: Request, res: Response) => {
    const { ticker } = req.params
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20) // Default 5, max 20

    // Validate ticker format
    if (!ticker || ticker.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Ticker symbol is required'
      })
    }

    const tickerUpper = ticker.toUpperCase()
    
    // Validate ticker format (prevent injection attacks)
    if (!isValidTicker(tickerUpper)) {
      logger.warn(`[newsRoutes] Invalid ticker format: ${tickerUpper}`)
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker format. Use uppercase letters (e.g., AAPL, BRK.B, AUTO.L)'
      })
    }

    const cacheKey = `news:${tickerUpper}:${limit}`

    try {
      // Check cache first (1 hour TTL)
      const cached = await cache.get(cacheKey)
      if (cached && cached.data) {
        logger.info(`[newsRoutes] Cache HIT for ${tickerUpper}`)
        
        // Set cache header for client-side caching
        res.set('X-Cache', 'HIT')
        res.set('Cache-Control', 'public, max-age=1800') // 30 minutes client cache
        
        return res.json(cached.data)
      }

      logger.info(`[newsRoutes] Cache MISS for ${tickerUpper} - fetching from FMP`)

      // Fetch ticker-specific news from FMP
      // Using stock-specific endpoint with proper filtering
      const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${tickerUpper}&limit=${limit}&apikey=${FMP_API_KEY}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Validate response structure with Zod
      const validatedData = safeParseNewsResponse(data)
      
      if (validatedData.length === 0 && Array.isArray(data) && data.length > 0) {
        logger.warn(`[newsRoutes] News data validation failed for ${tickerUpper}`)
      }

      // Filter to ensure we only get news that mentions this ticker in the symbol field
      const tickerNews = validatedData.filter((item) => {
            // Check if this news item is specifically about our ticker
            if (!item.symbol) return false
            
            // Validate URL to prevent malicious protocols (javascript:, data:, etc.)
            if (item.url && !isValidUrl(item.url)) {
              logger.warn(`[newsRoutes] Invalid URL detected for ${tickerUpper}: ${item.url}`)
              // Skip this news item
              return false
            }
            
            // Handle both single symbol and array of symbols
            if (typeof item.symbol === 'string') {
              return item.symbol === tickerUpper
            }
            
            // If symbols is an array, check if our ticker is in it
            if (Array.isArray(item.symbol)) {
              return item.symbol.includes(tickerUpper)
            }
            
            return false
          })

      // Sort by published date (most recent first)
      const sortedNews = tickerNews.sort((a: NewsItemLike, b: NewsItemLike) => {
        const dateA = new Date(a.publishedDate || a.date || 0).getTime()
        const dateB = new Date(b.publishedDate || b.date || 0).getTime()
        return dateB - dateA
      })

      // Limit results
      const limitedNews = sortedNews.slice(0, limit)

      // Cache for 1 hour
      await cache.set(cacheKey, limitedNews, REDIS_TTL.NEWS)

      logger.info(`[newsRoutes] Successfully fetched ${limitedNews.length} news items for ${tickerUpper}`)

      // Set cache headers
      res.set('X-Cache', 'MISS')
      res.set('Cache-Control', 'public, max-age=1800') // 30 minutes client cache

      res.json(limitedNews)
    } catch (error) {
      logger.error('[newsRoutes] Error fetching news:', error)

      // Return empty array instead of error to gracefully degrade
      res.status(200).json([])
    }
  })
)

export default router
