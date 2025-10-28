/**
 * Watchlist Management Routes
 * 
 * Endpoints for managing multiple watchlists per user.
 * Uses Prisma-based WatchlistService with database persistence.
 * 
 * Endpoints:
 * - GET    /api/watchlists          - List all user's watchlists
 * - POST   /api/watchlists          - Create new watchlist
 * - PUT    /api/watchlists/:id      - Rename watchlist
 * - DELETE /api/watchlists/:id      - Delete watchlist
 */

import { Router, type Response } from 'express'
import type { Request } from 'express'
import { body, param, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js'
import { watchlistService } from '../services/watchlistService.js'
import logger from '../services/logger.js'

const router = Router()

/**
 * GET /api/watchlists
 * Get all watchlists for authenticated user
 */
router.get(
  '/watchlists',
  authenticate(),
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id
      
      // Ensure user has at least a default watchlist
      await watchlistService.ensureDefaultWatchlist(userId)
      
      // Get all user's watchlists
      const watchlists = await watchlistService.getWatchlistsByUserId(userId)
      
      res.json({
        success: true,
        data: {
          watchlists: watchlists.map(w => ({
            id: w.id,
            name: w.name,
            isDefault: w.isDefault,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt
          }))
        }
      })
    } catch (error: any) {
      logger.error('[Watchlists] Error fetching watchlists:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch watchlists',
        code: 'WATCHLIST_FETCH_ERROR'
      })
    }
  }
)

/**
 * POST /api/watchlists
 * Create a new watchlist
 */
router.post(
  '/watchlists',
  authenticate(),
  requireAuth,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Watchlist name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Watchlist name must be 1-50 characters')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
          code: 'VALIDATION_ERROR'
        })
        return
      }
      
      const userId = req.user.id
      const { name } = req.body
      
      // Check watchlist limit (max 5 per user)
      const existingWatchlists = await watchlistService.getWatchlistsByUserId(userId)
      if (existingWatchlists.length >= 5) {
        res.status(400).json({
          success: false,
          error: 'Maximum of 5 watchlists allowed per user',
          code: 'WATCHLIST_LIMIT_EXCEEDED'
        })
        return
      }
      
      // Create watchlist
      const watchlist = await watchlistService.createWatchlist({
        userId,
        name,
        isDefault: false
      })
      
      logger.info(`[Watchlists] Created watchlist "${name}" for user ${userId} (total: ${existingWatchlists.length + 1})`)
      
      res.status(201).json({
        success: true,
        data: {
          watchlist: {
            id: watchlist.id,
            name: watchlist.name,
            isDefault: watchlist.isDefault,
            createdAt: watchlist.createdAt,
            updatedAt: watchlist.updatedAt
          }
        }
      })
    } catch (error: any) {
      logger.error('[Watchlists] Error creating watchlist:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create watchlist',
        code: 'WATCHLIST_CREATE_ERROR'
      })
    }
  }
)

/**
 * PUT /api/watchlists/:id
 * Rename a watchlist
 */
router.put(
  '/watchlists/:id',
  authenticate(),
  requireAuth,
  [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Watchlist ID is required'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Watchlist name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Watchlist name must be 1-50 characters')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
          code: 'VALIDATION_ERROR'
        })
        return
      }
      
      const userId = req.user.id
      const { id } = req.params
      const { name } = req.body
      
      // Verify ownership
      const isOwner = await watchlistService.verifyWatchlistOwnership(id, userId)
      if (!isOwner) {
        res.status(404).json({
          success: false,
          error: 'Watchlist not found',
          code: 'WATCHLIST_NOT_FOUND'
        })
        return
      }
      
      // Update watchlist
      const watchlist = await watchlistService.updateWatchlist(id, { name })
      
      if (!watchlist) {
        res.status(404).json({
          success: false,
          error: 'Watchlist not found',
          code: 'WATCHLIST_NOT_FOUND'
        })
        return
      }
      
      logger.info(`[Watchlists] Renamed watchlist ${id} to "${name}"`)
      
      res.json({
        success: true,
        data: {
          watchlist: {
            id: watchlist.id,
            name: watchlist.name,
            isDefault: watchlist.isDefault,
            createdAt: watchlist.createdAt,
            updatedAt: watchlist.updatedAt
          }
        }
      })
    } catch (error: any) {
      logger.error('[Watchlists] Error updating watchlist:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update watchlist',
        code: 'WATCHLIST_UPDATE_ERROR'
      })
    }
  }
)

/**
 * DELETE /api/watchlists/:id
 * Delete a watchlist (and all its items)
 */
router.delete(
  '/watchlists/:id',
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
          errors: errors.array(),
          code: 'VALIDATION_ERROR'
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
          error: 'Watchlist not found',
          code: 'WATCHLIST_NOT_FOUND'
        })
        return
      }
      
      // Delete watchlist
      try {
        const deleted = await watchlistService.deleteWatchlist(id)
        
        if (!deleted) {
          res.status(404).json({
            success: false,
            error: 'Watchlist not found',
            code: 'WATCHLIST_NOT_FOUND'
          })
          return
        }
        
        logger.info(`[Watchlists] Deleted watchlist ${id}`)
        
        res.json({
          success: true,
          data: {
            message: 'Watchlist deleted successfully',
            watchlistId: id
          }
        })
      } catch (error: any) {
        if (error.message === 'Cannot delete default watchlist') {
          res.status(400).json({
            success: false,
            error: 'Cannot delete default watchlist',
            code: 'CANNOT_DELETE_DEFAULT'
          })
          return
        }
        throw error
      }
    } catch (error: any) {
      logger.error('[Watchlists] Error deleting watchlist:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete watchlist',
        code: 'WATCHLIST_DELETE_ERROR'
      })
    }
  }
)

export default router

