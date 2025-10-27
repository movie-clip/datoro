// server/routes/analyticsRoutes.ts
// Analytics and database tracking endpoints

import express, { type Request, type Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { adminLimiter } from '../middleware/rateLimiter.js'
import { validate } from '../middleware/validation.js'
import { 
  validateAnalyticsPopular, 
  validateAnalyticsHistory, 
  validateAnalyticsStats 
} from '../middleware/validation.js'
import { 
  getPopularTickers, 
  getUserSearchHistory, 
  getApiRequestStats 
} from '../services/databaseService.js'

const router = express.Router()

/**
 * GET /api/analytics/popular
 * 
 * Get most searched tickers over specified time period
 * Features:
 * - Configurable time window (7 days default)
 * - Limit results (10 default, max 50)
 * - Aggregates search counts from database
 * 
 * @param {number} limit - Max results (default: 10, max: 50)
 * @param {number} days - Days to look back (default: 7)
 * @returns {Array} - Tickers sorted by search count
 */
router.get('/popular', validate(validateAnalyticsPopular), asyncHandler(async (req: Request, res: Response) => {
  const { limit, days } = req.query as { limit?: number; days?: number } // Already validated and converted by middleware
  const tickers = await getPopularTickers(limit, days)
  res.json({ success: true, data: tickers })
}))

/**
 * GET /api/analytics/history
 * 
 * Get current user's search history (by IP address)
 * Features:
 * - IP-based tracking (privacy-friendly)
 * - Configurable limit (10 default, max 50)
 * - Ordered by most recent first
 * 
 * @param {number} limit - Max results (default: 10, max: 50)
 * @returns {Array} - User's recent searches with timestamps
 */
router.get('/history', validate(validateAnalyticsHistory), asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.query as { limit?: number } // Already validated and converted by middleware
  const history = await getUserSearchHistory(req.ip!, limit)
  res.json({ success: true, data: history })
}))

/**
 * GET /api/analytics/stats
 * 
 * Get API request statistics over specified time period
 * Admin endpoint - protected by rate limiter
 * 
 * Features:
 * - Configurable time window (24 hours default)
 * - Request counts by endpoint
 * - Response time percentiles
 * - Error rates
 * 
 * @param {number} hours - Hours to look back (default: 24, max: 168)
 * @returns {Object} - Comprehensive API usage statistics
 */
router.get('/stats', adminLimiter, validate(validateAnalyticsStats), asyncHandler(async (req: Request, res: Response) => {
  const { hours } = req.query as { hours?: number } // Already validated and converted by middleware
  const stats = await getApiRequestStats(hours)
  res.json({ success: true, data: stats })
}))

export default router
