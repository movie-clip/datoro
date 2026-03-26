import logger from '../services/logger.js'
/**
 * Watchlist Routes
 * Endpoints for managing user watchlists (add/remove/fetch tickers)
 */

/// <reference path="../types/express.d.ts" />

import express from 'express'
import type { Request, Response } from 'express'
import type {
  ErrorResponse
} from '../types/api.types.js'
import { randomUUID } from 'crypto'
import { authenticate } from '../middleware/auth.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getPrismaClient } from '../services/databaseService.js'
import { generalLimiter } from '../middleware/rateLimiter.js'
import { watchlistService } from '../services/watchlistService.js'

const router = express.Router()
const prisma = getPrismaClient()

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === code
}

// Watchlist response types (specific to this route)
interface WatchlistItem {
  ticker: string
  addedAt: Date
  displayOrder: number
}

interface WatchlistResponse {
  tickers: WatchlistItem[]
}

interface AddWatchlistResponse {
  success: boolean
  ticker: string
  addedAt: Date
}

interface DeleteWatchlistResponse {
  success: boolean
  ticker: string
}

interface ReorderWatchlistResponse {
  success: boolean
}

/**
 * GET /api/watchlist
 * Fetch user's watchlist with ticker details
 */
router.get('/watchlist', generalLimiter, authenticate(), requireAuth, async (req: Request, res: Response<WatchlistResponse | ErrorResponse>) => {
  try {
    // After requireAuth middleware, user is guaranteed to exist
    const userId = req.user!.id

    // Fetch watchlist items sorted by displayOrder, then by addedAt as fallback
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: [
        { displayOrder: 'asc' },
        { addedAt: 'desc' }
      ],
      select: {
        ticker: true,
        addedAt: true,
        displayOrder: true
      }
    })

    res.json({ tickers: watchlistItems })
  } catch (_error) {
    logger.error('Error fetching watchlist:', _error)
    res.status(500).json({ error: 'Failed to fetch watchlist' })
  }
})

/**
 * PUT /api/watchlist/reorder
 * Reorder watchlist items (update displayOrder)
 * NOTE: Must come BEFORE parameterized routes to avoid route conflicts
 */
router.put('/watchlist/reorder', generalLimiter, authenticate(), requireAuth, async (req: Request, res: Response<ReorderWatchlistResponse | ErrorResponse>) => {
  try {
    const userId = req.user!.id // After requireAuth, user is guaranteed
    const { tickers } = req.body as { tickers: string[] } // Array of tickers in new order

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Invalid request: tickers must be a non-empty array' })
    }

    // Validate and sanitize tickers (SQL injection protection)
    const sanitizedTickers = tickers.map(t => {
      const ticker = String(t).toUpperCase().trim()
      // Only allow alphanumeric characters (no special chars that could break SQL)
      if (!/^[A-Z0-9]{1,10}$/.test(ticker)) {
        throw new Error(`Invalid ticker format: ${ticker}`)
      }
      return ticker
    })

    // Build CASE statement for single bulk UPDATE (safe: validated alphanumeric only)
    // Example: WHEN 'AAPL' THEN 0 WHEN 'GOOGL' THEN 1 ...
    const caseStatements = sanitizedTickers
      .map((_ticker, _index) => `WHEN '${_ticker}' THEN ${_index}`)
      .join(' ')
    
    // Execute single bulk UPDATE using parameterized raw SQL (1 query vs N queries)
    // user_id and ticker list are parameterized ($1, $2, ...) to prevent SQL injection
    await prisma.$executeRawUnsafe(`
      UPDATE watchlist_items 
      SET display_order = CASE ticker ${caseStatements} END
      WHERE user_id = $1 
        AND ticker IN (${sanitizedTickers.map((__, _i) => `$${_i + 2}`).join(', ')})
    `, userId, ...sanitizedTickers)

    res.json({ success: true })
  } catch (_error: unknown) {
    logger.error('Error reordering watchlist:', _error)
    res.status(500).json({ error: getErrorMessage(_error) || 'Failed to reorder watchlist' })
  }
})

/**
 * POST /api/watchlist/:ticker
 * Add a ticker to user's watchlist
 */
router.post('/watchlist/:ticker', generalLimiter, authenticate(), requireAuth, async (req: Request, res: Response<AddWatchlistResponse | ErrorResponse>) => {
  try {
    const userId = req.user!.id // After requireAuth, user is guaranteed
    const ticker = req.params.ticker.toUpperCase().trim()

    // Validate ticker format (basic validation)
    if (!ticker || ticker.length > 10 || !/^[A-Z]+$/.test(ticker)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' })
    }

    // Ensure user has a default watchlist
    const defaultWatchlist = await watchlistService.ensureDefaultWatchlist(userId)

    // Create watchlist item (unique constraint will prevent duplicates)
    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        id: randomUUID(),
        watchlistId: defaultWatchlist.id,
        userId, // Still included for backward compatibility
        ticker
      }
    })

    res.json({ 
      success: true, 
      ticker: watchlistItem.ticker,
      addedAt: watchlistItem.addedAt
    })
  } catch (_error: unknown) {
    // Check for unique constraint violation (duplicate entry)
    if (hasErrorCode(_error, 'P2002')) {
      return res.status(409).json({ error: 'Ticker already in watchlist' })
    }

    logger.error('Error adding to watchlist:', _error)
    res.status(500).json({ error: 'Failed to add ticker to watchlist' })
  }
})

/**
 * DELETE /api/watchlist/:ticker
 * Remove a ticker from user's watchlist
 */
router.delete('/watchlist/:ticker', generalLimiter, authenticate(), requireAuth, async (req: Request, res: Response<DeleteWatchlistResponse | ErrorResponse>) => {
  try {
    const userId = req.user!.id // After requireAuth, user is guaranteed
    const ticker = req.params.ticker.toUpperCase().trim()

    // Delete the watchlist item
    await prisma.watchlistItem.deleteMany({
      where: {
        userId,
        ticker
      }
    })

    res.json({ success: true, ticker })
  } catch (_error) {
    logger.error('Error removing from watchlist:', _error)
    res.status(500).json({ error: 'Failed to remove ticker from watchlist' })
  }
})

export default router


