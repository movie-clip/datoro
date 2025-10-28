/**
 * Watchlist Service (Prisma Implementation)
 * 
 * Real database implementation for multi-watchlist feature.
 * Replaces MockWatchlistService after successful migration.
 */

import { getPrismaClient } from './databaseService.js'

const prisma = getPrismaClient()

// Type definitions (matching MockWatchlistService interface)

export interface Watchlist {
  id: string
  userId: string
  name: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WatchlistItem {
  id: string
  watchlistId: string
  ticker: string
  addedAt: Date
  displayOrder: number
}

export interface CreateWatchlistDto {
  userId: string
  name: string
  isDefault?: boolean
}

export interface UpdateWatchlistDto {
  name: string
}

export interface CreateWatchlistItemDto {
  watchlistId: string
  ticker: string
}

class WatchlistService {
  /**
   * Create a new watchlist
   */
  async createWatchlist(data: CreateWatchlistDto): Promise<Watchlist> {
    const watchlist = await prisma.watchlist.create({
      data: {
        userId: data.userId,
        name: data.name,
        isDefault: data.isDefault || false
      }
    })
    
    return watchlist
  }

  /**
   * Get all watchlists for a user
   */
  async getWatchlistsByUserId(userId: string): Promise<Watchlist[]> {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // Default first
        { createdAt: 'asc' }   // Then by creation date
      ]
    })
    
    return watchlists
  }

  /**
   * Get a specific watchlist by ID
   */
  async getWatchlistById(id: string): Promise<Watchlist | null> {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id }
    })
    
    return watchlist
  }

  /**
   * Update watchlist (rename)
   */
  async updateWatchlist(id: string, data: UpdateWatchlistDto): Promise<Watchlist | null> {
    try {
      const watchlist = await prisma.watchlist.update({
        where: { id },
        data: {
          name: data.name,
          updatedAt: new Date()
        }
      })
      
      return watchlist
    } catch (error) {
      return null
    }
  }

  /**
   * Delete watchlist and all its items
   */
  async deleteWatchlist(id: string): Promise<boolean> {
    try {
      // Check if watchlist exists
      const watchlist = await prisma.watchlist.findUnique({
        where: { id }
      })
      
      if (!watchlist) return false
      
      // Prisma will cascade delete all items due to onDelete: Cascade
      await prisma.watchlist.delete({
        where: { id }
      })
      
      return true
    } catch (error) {
      console.error('Error deleting watchlist:', error)
      return false
    }
  }

  /**
   * Get all items in a watchlist
   */
  async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    const items = await prisma.watchlistItem.findMany({
      where: { watchlistId },
      orderBy: { displayOrder: 'asc' }
    })
    
    return items.map(item => ({
      id: item.id,
      watchlistId: item.watchlistId,
      ticker: item.ticker,
      addedAt: item.addedAt,
      displayOrder: item.displayOrder
    }))
  }

  /**
   * Add item to watchlist
   */
  async addWatchlistItem(data: CreateWatchlistItemDto): Promise<WatchlistItem> {
    // Check if ticker already exists in this watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        watchlistId_ticker: {
          watchlistId: data.watchlistId,
          ticker: data.ticker
        }
      }
    })
    
    if (existing) {
      throw new Error('Ticker already in watchlist')
    }
    
    // Get current max displayOrder
    const maxOrder = await prisma.watchlistItem.aggregate({
      where: { watchlistId: data.watchlistId },
      _max: { displayOrder: true }
    })
    
    const newOrder = (maxOrder._max.displayOrder ?? -1) + 1
    
    // Create new item
    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId: data.watchlistId,
        ticker: data.ticker,
        displayOrder: newOrder
      }
    })
    
    // Return only the fields we need (exclude userId which is legacy)
    return {
      id: item.id,
      watchlistId: item.watchlistId,
      ticker: item.ticker,
      addedAt: item.addedAt,
      displayOrder: item.displayOrder
    }
  }

  /**
   * Remove item from watchlist
   */
  async removeWatchlistItem(watchlistId: string, ticker: string): Promise<boolean> {
    try {
      await prisma.watchlistItem.delete({
        where: {
          watchlistId_ticker: {
            watchlistId,
            ticker
          }
        }
      })
      
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Reorder items in watchlist
   */
  async reorderWatchlistItems(watchlistId: string, tickers: string[]): Promise<void> {
    // Use transaction to update all items atomically
    await prisma.$transaction(
      tickers.map((ticker, index) =>
        prisma.watchlistItem.updateMany({
          where: {
            watchlistId,
            ticker
          },
          data: {
            displayOrder: index
          }
        })
      )
    )
  }

  /**
   * Ensure user has a default watchlist
   * Creates one if it doesn't exist
   */
  async ensureDefaultWatchlist(userId: string): Promise<Watchlist> {
    // Check for existing default
    const defaultWatchlist = await prisma.watchlist.findFirst({
      where: {
        userId,
        isDefault: true
      }
    })
    
    if (defaultWatchlist) {
      return defaultWatchlist
    }
    
    // Create default watchlist
    return this.createWatchlist({
      userId,
      name: 'My Watchlist',
      isDefault: true
    })
  }

  /**
   * Verify watchlist belongs to user (authorization check)
   */
  async verifyWatchlistOwnership(watchlistId: string, userId: string): Promise<boolean> {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId }
    })
    
    return watchlist?.userId === userId
  }

  /**
   * Get stats (for debugging)
   */
  async getStats() {
    const totalWatchlists = await prisma.watchlist.count()
    const totalItems = await prisma.watchlistItem.count()
    
    const watchlistsByUser = await prisma.watchlist.groupBy({
      by: ['userId'],
      _count: { userId: true }
    })
    
    const stats: Record<string, number> = {}
    watchlistsByUser.forEach(group => {
      stats[group.userId] = group._count.userId
    })
    
    return {
      totalWatchlists,
      totalItems,
      watchlistsByUser: stats
    }
  }
}

// Export singleton instance
export const watchlistService = new WatchlistService()
