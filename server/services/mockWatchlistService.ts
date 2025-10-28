/**
 * Mock Watchlist Service
 * 
 * Temporary in-memory implementation for multi-watchlist feature development.
 * This allows frontend/backend development without database migrations.
 * 
 * Structure matches future Prisma implementation for easy swap.
 * 
 * TODO: Replace with real Prisma queries after feature is complete (Task #14)
 */

import { v4 as uuidv4 } from 'uuid'

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
  position: number
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

// In-memory storage
const watchlists = new Map<string, Watchlist>()
const watchlistItems = new Map<string, WatchlistItem>()

// Mock cache (simulates Redis structure)
const mockCache = new Map<string, any>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: any
  expiresAt: number
}

// Cache helpers
function getCacheKey(userId: string, watchlistId?: string): string {
  return watchlistId 
    ? `watchlist:${userId}:${watchlistId}`
    : `watchlists:${userId}`
}

function setCache(key: string, data: any): void {
  mockCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  } as CacheEntry)
}

function getCache(key: string): any | null {
  const entry = mockCache.get(key) as CacheEntry | undefined
  if (!entry) return null
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    mockCache.delete(key)
    return null
  }
  
  return entry.data
}

function invalidateCache(userId: string, watchlistId?: string): void {
  // Invalidate specific watchlist cache
  if (watchlistId) {
    mockCache.delete(getCacheKey(userId, watchlistId))
  }
  
  // Always invalidate user's watchlist list
  mockCache.delete(getCacheKey(userId))
}

// Helper: Get all watchlists for a user
function getUserWatchlists(userId: string): Watchlist[] {
  return Array.from(watchlists.values())
    .filter(w => w.userId === userId)
    .sort((a, b) => {
      // Default watchlist first, then by createdAt
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
}

// Helper: Get all items for a watchlist
function getWatchlistItems(watchlistId: string): WatchlistItem[] {
  return Array.from(watchlistItems.values())
    .filter(item => item.watchlistId === watchlistId)
    .sort((a, b) => a.position - b.position)
}

class MockWatchlistService {
  /**
   * Create a new watchlist
   */
  async createWatchlist(data: CreateWatchlistDto): Promise<Watchlist> {
    const id = uuidv4()
    const now = new Date()
    
    const watchlist: Watchlist = {
      id,
      userId: data.userId,
      name: data.name,
      isDefault: data.isDefault || false,
      createdAt: now,
      updatedAt: now
    }
    
    watchlists.set(id, watchlist)
    return watchlist
  }

  /**
   * Get all watchlists for a user
   */
  async getWatchlistsByUserId(userId: string): Promise<Watchlist[]> {
    // Check cache first
    const cacheKey = getCacheKey(userId)
    const cached = getCache(cacheKey)
    if (cached) return cached
    
    // Get from storage
    const result = getUserWatchlists(userId)
    
    // Cache result
    setCache(cacheKey, result)
    
    return result
  }

  /**
   * Get a specific watchlist by ID
   */
  async getWatchlistById(id: string): Promise<Watchlist | null> {
    return watchlists.get(id) || null
  }

  /**
   * Update watchlist (rename)
   */
  async updateWatchlist(id: string, data: UpdateWatchlistDto): Promise<Watchlist | null> {
    const watchlist = watchlists.get(id)
    if (!watchlist) return null
    
    watchlist.name = data.name
    watchlist.updatedAt = new Date()
    
    watchlists.set(id, watchlist)
    
    // Invalidate cache
    invalidateCache(watchlist.userId, id)
    
    return watchlist
  }

  /**
   * Delete watchlist and all its items
   */
  async deleteWatchlist(id: string): Promise<boolean> {
    const watchlist = watchlists.get(id)
    if (!watchlist) return false
    
    // Don't allow deleting default watchlist
    if (watchlist.isDefault) {
      throw new Error('Cannot delete default watchlist')
    }
    
    // Delete all items in this watchlist
    const items = getWatchlistItems(id)
    items.forEach(item => watchlistItems.delete(item.id))
    
    // Delete the watchlist
    const deleted = watchlists.delete(id)
    
    // Invalidate cache
    if (deleted) {
      invalidateCache(watchlist.userId, id)
    }
    
    return deleted
  }

  /**
   * Get all items in a watchlist
   */
  async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    return getWatchlistItems(watchlistId)
  }

  /**
   * Add item to watchlist
   */
  async addWatchlistItem(data: CreateWatchlistItemDto): Promise<WatchlistItem> {
    const id = uuidv4()
    
    // Check if ticker already exists in this watchlist
    const existing = Array.from(watchlistItems.values()).find(
      item => item.watchlistId === data.watchlistId && item.ticker === data.ticker
    )
    
    if (existing) {
      throw new Error('Ticker already in watchlist')
    }
    
    // Get current max position
    const items = getWatchlistItems(data.watchlistId)
    const maxPosition = items.length > 0 ? Math.max(...items.map(i => i.position)) : -1
    
    const item: WatchlistItem = {
      id,
      watchlistId: data.watchlistId,
      ticker: data.ticker,
      addedAt: new Date(),
      position: maxPosition + 1
    }
    
    watchlistItems.set(id, item)
    
    // Invalidate cache
    const watchlist = watchlists.get(data.watchlistId)
    if (watchlist) {
      invalidateCache(watchlist.userId, data.watchlistId)
    }
    
    return item
  }

  /**
   * Remove item from watchlist
   */
  async removeWatchlistItem(watchlistId: string, ticker: string): Promise<boolean> {
    const item = Array.from(watchlistItems.values()).find(
      i => i.watchlistId === watchlistId && i.ticker === ticker
    )
    
    if (!item) return false
    
    const deleted = watchlistItems.delete(item.id)
    
    // Invalidate cache
    if (deleted) {
      const watchlist = watchlists.get(watchlistId)
      if (watchlist) {
        invalidateCache(watchlist.userId, watchlistId)
      }
    }
    
    return deleted
  }

  /**
   * Reorder items in watchlist
   */
  async reorderWatchlistItems(watchlistId: string, tickers: string[]): Promise<void> {
    const items = getWatchlistItems(watchlistId)
    
    // Update positions based on new order
    tickers.forEach((ticker, index) => {
      const item = items.find(i => i.ticker === ticker)
      if (item) {
        item.position = index
        watchlistItems.set(item.id, item)
      }
    })
  }

  /**
   * Ensure user has a default watchlist
   * Creates one if it doesn't exist
   */
  async ensureDefaultWatchlist(userId: string): Promise<Watchlist> {
    const userWatchlists = getUserWatchlists(userId)
    const defaultWatchlist = userWatchlists.find(w => w.isDefault)
    
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
    const watchlist = watchlists.get(watchlistId)
    return watchlist?.userId === userId
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    watchlists.clear()
    watchlistItems.clear()
    mockCache.clear()
  }

  /**
   * Get stats (for debugging)
   */
  getStats() {
    return {
      totalWatchlists: watchlists.size,
      totalItems: watchlistItems.size,
      watchlistsByUser: Array.from(watchlists.values()).reduce((acc, w) => {
        acc[w.userId] = (acc[w.userId] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}

// Export singleton instance
export const mockWatchlistService = new MockWatchlistService()
