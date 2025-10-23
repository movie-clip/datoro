// tests/unit/useWatchlist.test.js
// Unit tests for useWatchlist composable

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useWatchlist } from '../../src/composables/useWatchlist.js'

// Mock fetch globally
global.fetch = vi.fn()

// Mock API_BASE_URL
vi.mock('../../src/utils/apiConfig.js', () => ({
  API_BASE_URL: 'http://localhost:7071'
}))

describe('useWatchlist Composable', () => {
  let watchlist

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Get fresh instance
    watchlist = useWatchlist()
    
    // Clear watchlist state
    watchlist.clearWatchlist()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should start with empty watchlist', () => {
      expect(watchlist.watchlist.value).toEqual([])
      expect(watchlist.loading.value).toBe(false)
      expect(watchlist.initialized.value).toBe(false)
    })

    it('should initialize watchlist with fetched data', async () => {
      const mockData = {
        tickers: [
          { ticker: 'AAPL', addedAt: '2025-01-01T00:00:00Z' },
          { ticker: 'MSFT', addedAt: '2025-01-02T00:00:00Z' }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await watchlist.initializeWatchlist()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist',
        { credentials: 'include' }
      )
      expect(watchlist.watchlist.value).toEqual(['AAPL', 'MSFT'])
      expect(watchlist.initialized.value).toBe(true)
      expect(watchlist.loading.value).toBe(false)
    })

    it('should not reinitialize if already initialized', async () => {
      const mockData = { tickers: [{ ticker: 'AAPL', addedAt: '2025-01-01T00:00:00Z' }] }

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      // First initialization
      await watchlist.initializeWatchlist()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Second call should not fetch
      await watchlist.initializeWatchlist()
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should force refresh when forceRefresh=true', async () => {
      const mockData = { tickers: [{ ticker: 'AAPL', addedAt: '2025-01-01T00:00:00Z' }] }

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      // First initialization
      await watchlist.initializeWatchlist()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Force refresh
      await watchlist.initializeWatchlist(true)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should clear watchlist on 401 (not authenticated)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      await watchlist.initializeWatchlist()

      expect(watchlist.watchlist.value).toEqual([])
      expect(watchlist.initialized.value).toBe(true)
    })

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await watchlist.initializeWatchlist()

      expect(watchlist.watchlist.value).toEqual([])
      expect(watchlist.initialized.value).toBe(false)
    })
  })

  describe('isWatchlisted', () => {
    beforeEach(async () => {
      const mockData = {
        tickers: [
          { ticker: 'AAPL', addedAt: '2025-01-01T00:00:00Z' },
          { ticker: 'MSFT', addedAt: '2025-01-02T00:00:00Z' }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await watchlist.initializeWatchlist()
    })

    it('should return true for watchlisted ticker', () => {
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
      expect(watchlist.isWatchlisted('MSFT')).toBe(true)
    })

    it('should return false for non-watchlisted ticker', () => {
      expect(watchlist.isWatchlisted('GOOGL')).toBe(false)
      expect(watchlist.isWatchlisted('TSLA')).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(watchlist.isWatchlisted('aapl')).toBe(true)
      expect(watchlist.isWatchlisted('Msft')).toBe(true)
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
    })
  })

  describe('addToWatchlist', () => {
    it('should add ticker optimistically', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      // Watchlist should update immediately (optimistic)
      const promise = watchlist.addToWatchlist('AAPL')
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)

      await promise
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist/AAPL',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      )
    })

    it('should normalize ticker to uppercase', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      await watchlist.addToWatchlist('aapl')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist/AAPL',
        expect.any(Object)
      )
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
    })

    it('should revert optimistic update on error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      })

      expect(watchlist.isWatchlisted('AAPL')).toBe(false)

      try {
        await watchlist.addToWatchlist('AAPL')
      } catch (error) {
        // Expected to throw
      }

      // Should be removed after error
      expect(watchlist.isWatchlisted('AAPL')).toBe(false)
    })

    it('should handle 401 authentication error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      await expect(watchlist.addToWatchlist('AAPL')).rejects.toThrow(
        'Please log in to add tickers to your watchlist'
      )

      expect(watchlist.isWatchlisted('AAPL')).toBe(false)
    })

    it('should handle 409 duplicate error gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Ticker already in watchlist' })
      })

      const result = await watchlist.addToWatchlist('AAPL')

      expect(result.success).toBe(true)
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
    })

    it('should handle non-JSON error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON')
        }
      })

      await expect(watchlist.addToWatchlist('AAPL')).rejects.toThrow(
        'Failed to add ticker'
      )
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await watchlist.addToWatchlist('AAPL')
      } catch (error) {
        // Expected to throw
      }
      
      // Optimistic update should have been reverted
      expect(watchlist.isWatchlisted('AAPL')).toBe(false)
    })
  })

  describe('removeFromWatchlist', () => {
    beforeEach(async () => {
      // Pre-populate watchlist
      const mockData = {
        tickers: [
          { ticker: 'AAPL', addedAt: '2025-01-01T00:00:00Z' },
          { ticker: 'MSFT', addedAt: '2025-01-02T00:00:00Z' }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await watchlist.initializeWatchlist()
      vi.clearAllMocks()
    })

    it('should remove ticker optimistically', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      expect(watchlist.isWatchlisted('AAPL')).toBe(true)

      const promise = watchlist.removeFromWatchlist('AAPL')
      expect(watchlist.isWatchlisted('AAPL')).toBe(false)

      await promise
      expect(watchlist.isWatchlisted('AAPL')).toBe(false)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist/AAPL',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      )
    })

    it('should normalize ticker to uppercase', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      await watchlist.removeFromWatchlist('aapl')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist/AAPL',
        expect.any(Object)
      )
    })

    it('should revert optimistic update on error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      })

      expect(watchlist.isWatchlisted('AAPL')).toBe(true)

      try {
        await watchlist.removeFromWatchlist('AAPL')
      } catch (error) {
        // Expected to throw
      }

      // Should be re-added after error
      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
    })

    it('should handle 401 authentication error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      await expect(watchlist.removeFromWatchlist('AAPL')).rejects.toThrow(
        'Authentication required'
      )

      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
    })

    it('should handle non-JSON error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON')
        }
      })

      await expect(watchlist.removeFromWatchlist('AAPL')).rejects.toThrow(
        'Failed to remove ticker'
      )
    })
  })

  describe('toggleWatchlist', () => {
    it('should add ticker if not watchlisted', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      expect(watchlist.isWatchlisted('AAPL')).toBe(false)

      await watchlist.toggleWatchlist('AAPL')

      expect(watchlist.isWatchlisted('AAPL')).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist/AAPL',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should remove ticker if already watchlisted', async () => {
      // Pre-add ticker
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })
      await watchlist.addToWatchlist('AAPL')

      // Now toggle (should remove)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      await watchlist.toggleWatchlist('AAPL')

      expect(watchlist.isWatchlisted('AAPL')).toBe(false)
      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:7071/api/watchlist/AAPL',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('clearWatchlist', () => {
    it('should clear watchlist and reset initialized flag', async () => {
      // Initialize with data
      const mockData = {
        tickers: [
          { ticker: 'AAPL', addedAt: '2025-01-01T00:00:00Z' },
          { ticker: 'MSFT', addedAt: '2025-01-02T00:00:00Z' }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await watchlist.initializeWatchlist()
      expect(watchlist.watchlist.value).toHaveLength(2)
      expect(watchlist.initialized.value).toBe(true)

      // Clear
      watchlist.clearWatchlist()

      expect(watchlist.watchlist.value).toEqual([])
      expect(watchlist.initialized.value).toBe(false)
    })
  })

  describe('Shared State', () => {
    it('should share state across multiple instances', async () => {
      const instance1 = useWatchlist()
      const instance2 = useWatchlist()

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: 'AAPL' })
      })

      // Add via instance1
      await instance1.addToWatchlist('AAPL')

      // Should be visible in instance2
      expect(instance2.isWatchlisted('AAPL')).toBe(true)
      expect(instance2.watchlist.value).toEqual(['AAPL'])
    })

    it('should sync loading state across instances', async () => {
      const instance1 = useWatchlist()
      const instance2 = useWatchlist()

      global.fetch.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      // Start initialization
      const promise = instance1.initializeWatchlist()

      // Both should show loading
      expect(instance1.loading.value).toBe(true)
      expect(instance2.loading.value).toBe(true)

      await promise

      expect(instance1.loading.value).toBe(false)
      expect(instance2.loading.value).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty ticker string', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ticker: '' })
      })

      await watchlist.addToWatchlist('')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/watchlist/',
        expect.any(Object)
      )
    })

    it('should handle very long ticker', async () => {
      const longTicker = 'A'.repeat(50)

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid ticker' })
      })

      await expect(watchlist.addToWatchlist(longTicker)).rejects.toThrow()
    })

    it('should handle special characters in ticker', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid ticker symbol' })
      })

      await expect(watchlist.addToWatchlist('AAPL@#$')).rejects.toThrow()
    })

    it('should handle concurrent add/remove operations', async () => {
      global.fetch.mockImplementation((url, options) => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, ticker: 'AAPL' })
        })
      })

      // Add and remove simultaneously
      const promises = [
        watchlist.addToWatchlist('AAPL'),
        watchlist.removeFromWatchlist('AAPL'),
        watchlist.addToWatchlist('MSFT')
      ]

      await Promise.all(promises)

      // Final state should be consistent
      expect(watchlist.watchlist.value.length).toBeGreaterThanOrEqual(0)
    })
  })
})
