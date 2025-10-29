/**
 * Watchlist Items Routes (Multi-Watchlist Support)
 * 
 * Updated endpoints to support multiple watchlists per user.
 * Uses watchlistService for development (no DB changes yet).
 * 
 * Endpoints:
 * - GET    /api/watchlists/:id/items         - Get all items in a watchlist
 * - POST   /api/watchlists/:id/items/:ticker - Add ticker to watchlist
 * - DELETE /api/watchlists/:id/items/:ticker - Remove ticker from watchlist
 * - PUT    /api/watchlists/:id/reorder       - Reorder tickers in watchlist
 * 
 * 
 */

import { Router, type Response } from 'express'
import { body, param, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js'
import { generalLimiter } from '../middleware/rateLimiter.js'
import { watchlistService } from '../services/watchlistService.js'
import logger from '../services/logger.js'

const router = Router()

// Ticker validation regex (1-10 uppercase letters, optional dot and suffix for international tickers)
const TICKER_REGEX = /^[A-Z0-9]{1,10}(\.[A-Z]{1,5})?$/

/**
 * GET /api/watchlists/:id/items
 * Get all items in a specific watchlist
 */
router.get(
  '/watchlists/:id/items',
  generalLimiter,
  authenticate(),
  requireAuth,
  [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Watchlist ID is required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        })
        return
      }
      
      const userId = req.user.id
      const { id } = req.params
      
      // Verify ownership
      const isOwner = await watchlistService.verifyWatchlistOwnership(id, userId)
      if (!isOwner) {
        res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        })
        return
      }
      
      // Get items
      const items = await watchlistService.getWatchlistItems(id)
      
      res.json({
        success: true,
        data: {
          watchlistId: id,
          items: items.map(item => ({
            ticker: item.ticker,
            addedAt: item.addedAt,
            displayOrder: item.displayOrder
          }))
        }
      })
    } catch (_error: any) {
      logger.error('[Watchlist Items] Error fetching items:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch watchlist items'
      })
    }
  }
)

/**
 * POST /api/watchlists/:id/items/:ticker
 * Add ticker to watchlist
 */
router.post(
  '/watchlists/:id/items/:ticker',
  generalLimiter,
  authenticate(),
  requireAuth,
  [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Watchlist ID is required'),
    param('ticker')
      .trim()
      .toUpperCase()
      .notEmpty()
      .withMessage('Ticker is required')
      .matches(TICKER_REGEX)
      .withMessage('Invalid ticker symbol')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        })
        return
      }
      
      const userId = req.user.id
      const { id, ticker } = req.params
      
      // Verify ownership
      const isOwner = await watchlistService.verifyWatchlistOwnership(id, userId)
      if (!isOwner) {
        res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        })
        return
      }
      
      // Add item
      try {
        const item = await watchlistService.addWatchlistItem({
          watchlistId: id,
          ticker: ticker.toUpperCase()
        })
        
        logger.info(`[Watchlist Items] Added ${ticker} to watchlist ${id}`)
        
        res.status(201).json({
          success: true,
          data: {
            ticker: item.ticker,
            addedAt: item.addedAt,
            displayOrder: item.displayOrder
          }
        })
      } catch (_error: any) {
        if (error.message === 'Ticker already in watchlist') {
          res.status(409).json({
            success: false,
            error: 'Ticker already in watchlist'
          })
          return
        }
        throw error
      }
    } catch (_error: any) {
      logger.error('[Watchlist Items] Error adding item:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to add ticker to watchlist'
      })
    }
  }
)

/**
 * DELETE /api/watchlists/:id/items/:ticker
 * Remove ticker from watchlist
 */
router.delete(
  '/watchlists/:id/items/:ticker',
  generalLimiter,
  authenticate(),
  requireAuth,
  [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Watchlist ID is required'),
    param('ticker')
      .trim()
      .toUpperCase()
      .notEmpty()
      .withMessage('Ticker is required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        })
        return
      }
      
      const userId = req.user.id
      const { id, ticker } = req.params
      
      // Verify ownership
      const isOwner = await watchlistService.verifyWatchlistOwnership(id, userId)
      if (!isOwner) {
        res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        })
        return
      }
      
      // Remove item
      await watchlistService.removeWatchlistItem(id, ticker.toUpperCase())
      
      logger.info(`[Watchlist Items] Removed ${ticker} from watchlist ${id}`)
      
      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          removed: true
        }
      })
    } catch (_error: any) {
      logger.error('[Watchlist Items] Error removing item:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to remove ticker from watchlist'
      })
    }
  }
)

/**
 * PUT /api/watchlists/:id/reorder
 * Reorder tickers in watchlist
 */
router.put(
  '/watchlists/:id/reorder',
  generalLimiter,
  authenticate(),
  requireAuth,
  [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Watchlist ID is required'),
    body('tickers')
      .isArray()
      .withMessage('Tickers must be an array')
      .notEmpty()
      .withMessage('Tickers array cannot be empty')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        })
        return
      }
      
      const userId = req.user.id
      const { id } = req.params
      const { tickers } = req.body
      
      // Verify ownership
      const isOwner = await watchlistService.verifyWatchlistOwnership(id, userId)
      if (!isOwner) {
        res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        })
        return
      }
      
      // Validate all tickers are strings
      if (!Array.isArray(tickers) || !tickers.every(t => typeof t === 'string')) {
        res.status(400).json({
          success: false,
          error: 'Invalid tickers format'
        })
        return
      }
      
      // Reorder items
      await watchlistService.reorderWatchlistItems(id, tickers)
      
      logger.info(`[Watchlist Items] Reordered watchlist ${id}`)
      
      res.json({
        success: true,
        data: {
          tickers,
          reordered: true
        }
      })
    } catch (_error: any) {
      logger.error('[Watchlist Items] Error reordering items:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to reorder watchlist items'
      })
    }
  }
)

export default router

