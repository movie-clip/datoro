/**
 * Watchlist Routes
 * Endpoints for managing user watchlists (add/remove/fetch tickers)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getPrismaClient } from '../services/databaseService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/watchlist
 * Fetch user's watchlist with ticker details
 */
router.get('/watchlist', authenticate(), async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch watchlist items sorted by most recently added
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      select: {
        ticker: true,
        addedAt: true
      }
    });

    res.json({ tickers: watchlistItems });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

/**
 * POST /api/watchlist/:ticker
 * Add ticker to user's watchlist
 */
router.post('/watchlist/:ticker', authenticate(), async (req, res) => {
  try {
    const userId = req.user.id;
    const ticker = req.params.ticker.toUpperCase().trim();

    // Validate ticker format (basic validation)
    if (!ticker || ticker.length > 10 || !/^[A-Z]+$/.test(ticker)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }

    // Create watchlist item (unique constraint will prevent duplicates)
    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        userId,
        ticker
      }
    });

    res.json({ 
      success: true, 
      ticker: watchlistItem.ticker,
      addedAt: watchlistItem.addedAt
    });
  } catch (error) {
    // Check for unique constraint violation (duplicate entry)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ticker already in watchlist' });
    }

    console.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add ticker to watchlist' });
  }
});

/**
 * DELETE /api/watchlist/:ticker
 * Remove ticker from user's watchlist
 */
router.delete('/watchlist/:ticker', authenticate(), async (req, res) => {
  try {
    const userId = req.user.id;
    const ticker = req.params.ticker.toUpperCase().trim();

    // Delete the watchlist item
    await prisma.watchlistItem.deleteMany({
      where: {
        userId,
        ticker
      }
    });

    res.json({ success: true, ticker });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove ticker from watchlist' });
  }
});

export default router;
