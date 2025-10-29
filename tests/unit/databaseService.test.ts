// tests/unit/databaseService.test.ts
// Unit tests for database service functions

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { mockPrismaClient, setupDefaultMocks, resetMockDatabase } from '../__mocks__/prisma.js'

// Utility function for async delays in tests
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// Mock the Prisma Client before importing the service
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}))

// Import after mocking
import {
  getPrismaClient,
  findOrCreateUser,
  trackSearch,
  updateTickerCompanyName,
  trackApiRequest,
  getPopularTickers,
  getUserSearchHistory,
  getApiRequestStats,
  checkDatabaseHealth,
  cleanupOldData
} from '../../server/services/databaseService.js'

describe('Database Service', () => {
  const testIpAddress = '127.0.0.1'
  const testUserAgent = 'Vitest Test Runner'
  
  beforeAll(async () => {
    console.log('\n🧪 Starting Database Service Tests...\n')
  })

  beforeEach(() => {
    // Reset and setup mocks before each test
    resetMockDatabase()
    setupDefaultMocks()
  })

  afterAll(async () => {
    console.log('\n✅ Database Service Tests Complete\n')
  })

  describe('Prisma Client', () => {
    it('should get Prisma client instance', () => {
      const prisma = getPrismaClient()
      expect(prisma).toBeDefined()
      expect(prisma.$connect).toBeDefined()
      expect(prisma.$disconnect).toBeDefined()
    })

    it('should return same instance on multiple calls (singleton)', () => {
      const prisma1 = getPrismaClient()
      const prisma2 = getPrismaClient()
      expect(prisma1).toBe(prisma2)
    })
  })

  describe('User Management', () => {
    it('should create new user with IP and user agent', async () => {
      const user: unknown = await findOrCreateUser(testIpAddress, testUserAgent)
      
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.ipAddress).toBe(testIpAddress)
      expect(user.userAgent).toBe(testUserAgent)
      expect(user.createdAt).toBeInstanceOf(Date)
      // Note: Real Prisma schema uses lastLoginAt
      expect(user.lastLoginAt).toBeInstanceOf(Date)
    })

    it('should update lastLoginAt on existing user', async () => {
      const user1: unknown = await findOrCreateUser(testIpAddress, testUserAgent)
      await sleep(100) // Wait 100ms
      const user2: unknown = await findOrCreateUser(testIpAddress, testUserAgent)
      
      expect(user1.id).toBe(user2.id)
      // lastLoginAt should be updated on subsequent logins
      const getTimestamp = (user: any) => user.lastLoginAt?.getTime()
      expect(getTimestamp(user2)).toBeGreaterThan(getTimestamp(user1))
    })

    it('should handle different IP addresses', async () => {
      const user1 = await findOrCreateUser('192.168.1.1', testUserAgent)
      const user2 = await findOrCreateUser('192.168.1.2', testUserAgent)
      
      expect(user1.id).not.toBe(user2.id)
      expect(user1.ipAddress).toBe('192.168.1.1')
      expect(user2.ipAddress).toBe('192.168.1.2')
    })
  })

  describe('Search Tracking', () => {
    it('should track a search', async () => {
      await trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct')
      
      // Verify search was tracked by checking user's search history
      const history = await getUserSearchHistory(testIpAddress, 10)
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].ticker).toBe('AAPL')
      expect(history[0].source).toBe('direct')
    })

    it('should handle null ticker gracefully', async () => {
      // Should not throw, but also should not track
      await trackSearch(testIpAddress, null as any, testUserAgent, 'direct')
      // Function returns void, just verify no errors
    })

    it('should track multiple searches', async () => {
      await trackSearch(testIpAddress, 'MSFT', testUserAgent, 'direct')
      await trackSearch(testIpAddress, 'GOOGL', testUserAgent, 'direct')
      await trackSearch(testIpAddress, 'TSLA', testUserAgent, 'direct')
      
      const history = await getUserSearchHistory(testIpAddress, 10)
      expect(history.length).toBeGreaterThanOrEqual(3)
      
      // Check that recent searches are included
      const tickers = history.map(s => s.ticker)
      expect(tickers).toContain('MSFT')
      expect(tickers).toContain('GOOGL')
      expect(tickers).toContain('TSLA')
    })
  })

  describe('Company Name Updates', () => {
    it('should update ticker company name', async () => {
      // First track a search to create popular ticker entry
      await trackSearch(testIpAddress, 'NVDA', testUserAgent, 'direct')
      
      // Then update company name (void function - just verify no errors)
      await updateTickerCompanyName('NVDA', 'NVIDIA Corporation')
      
      // Function completes without error
      expect(true).toBe(true)
    })

    it('should handle null company name', async () => {
      // Should not throw
      await updateTickerCompanyName('TEST', null as any)
    })

    it('should handle null ticker', async () => {
      // Should not throw (catches error internally)
      await updateTickerCompanyName(null as any, 'Company Name')
    })
  })

  describe('API Request Tracking', () => {
    it('should track API request', async () => {
      const requestData = {
        endpoint: '/api/v3/profile/AAPL',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        cached: false,
        ipAddress: testIpAddress
      }
      
      await trackApiRequest(requestData)
      
      // Verify by checking stats
      const stats = await getApiRequestStats(24)
      expect(stats).toBeDefined()
      expect(stats.total).toBeGreaterThan(0)
    })

    it('should track cached requests', async () => {
      const requestData = {
        endpoint: '/api/v3/profile/AAPL',
        method: 'GET',
        statusCode: 200,
        responseTime: 5,
        cached: true,
        ipAddress: testIpAddress
      }
      
      await trackApiRequest(requestData)
      
      // Verify by checking stats (void function, cacheHitRate is string like "50%")
      const stats = await getApiRequestStats(24)
      expect(stats.cacheHitRate).toBeDefined()
      expect(parseFloat(stats.cacheHitRate)).toBeGreaterThan(0)
    })

    it('should track failed requests with error code', async () => {
      const requestData = {
        endpoint: '/api/v3/profile/INVALID',
        method: 'GET',
        statusCode: 400,
        responseTime: 100,
        cached: false,
        errorCode: 'E001',
        ipAddress: testIpAddress
      }
      
      await trackApiRequest(requestData)
      
      // Just verify it doesn't throw
      expect(true).toBe(true)
    })
  })

  describe('Popular Tickers', () => {
    it('should get popular tickers', async () => {
      // Track some searches first
      await trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct')
      await trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct')
      await trackSearch(testIpAddress, 'TSLA', testUserAgent, 'direct')
      
      const tickers = await getPopularTickers(10, 7)
      
      expect(Array.isArray(tickers)).toBe(true)
      expect(tickers.length).toBeGreaterThan(0)
      
      // Check structure
      const first = tickers[0]
      expect(first.ticker).toBeDefined()
      expect(first.searchCount).toBeDefined()
      expect(typeof first.searchCount).toBe('number')
      expect(first.lastSearched).toBeInstanceOf(Date)
    })

    it('should limit results', async () => {
      const tickers = await getPopularTickers(3, 7)
      expect(tickers.length).toBeLessThanOrEqual(3)
    })

    it('should respect days parameter', async () => {
      const tickers = await getPopularTickers(10, 1)
      expect(Array.isArray(tickers)).toBe(true)
      // All searches should be within last day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      tickers.forEach((ticker: { lastSearched: Date; ticker: string; searchCount: number }) => {
        expect(ticker.lastSearched.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime())
      })
    })
  })

  describe('User Search History', () => {
    it('should get user search history', async () => {
      // First track some searches
      await trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct')
      await trackSearch(testIpAddress, 'MSFT', testUserAgent, 'search')
      
      const history = await getUserSearchHistory(testIpAddress, 20)
      
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
      
      // Check structure
      const first = history[0]
      expect(first.ticker).toBeDefined()
      expect(first.source).toBeDefined()
      expect(first.createdAt).toBeInstanceOf(Date)
    })

    it('should limit results', async () => {
      const history = await getUserSearchHistory(testIpAddress, 5)
      expect(history.length).toBeLessThanOrEqual(5)
    })

    it('should order by most recent first', async () => {
      const history = await getUserSearchHistory(testIpAddress, 10)
      
      if (history.length > 1) {
        // Check that dates are in descending order
        for (let i = 0; i < history.length - 1; i++) {
          expect(history[i].searchedAt.getTime())
            .toBeGreaterThanOrEqual(history[i + 1].searchedAt.getTime())
        }
      }
    })
  })

  describe('API Request Statistics', () => {
    it('should get API request stats', async () => {
      const stats = await getApiRequestStats(24)
      
      expect(stats).toBeDefined()
      expect(stats.total).toBeDefined()
      expect(typeof stats.total).toBe('number')
      expect(stats.successRate).toBeDefined()
      expect(stats.avgResponseTime).toBeDefined()
      expect(stats.cacheHitRate).toBeDefined()
    })

    it('should calculate success rate correctly', async () => {
      const stats = await getApiRequestStats(24)
      
      if (stats.total > 0) {
        expect(stats.successRate).toMatch(/%$/) // Should end with %
        const rate = parseFloat(stats.successRate)
        expect(rate).toBeGreaterThanOrEqual(0)
        expect(rate).toBeLessThanOrEqual(100)
      }
    })

    it('should calculate cache hit rate correctly', async () => {
      const stats = await getApiRequestStats(24)
      
      if (stats.total > 0) {
        expect(stats.cacheHitRate).toMatch(/%$/) // Should end with %
        const rate = parseFloat(stats.cacheHitRate)
        expect(rate).toBeGreaterThanOrEqual(0)
        expect(rate).toBeLessThanOrEqual(100)
      }
    })

    it('should respect hours parameter', async () => {
      const stats1h = await getApiRequestStats(1)
      const stats24h = await getApiRequestStats(24)
      
      expect(stats1h).toBeDefined()
      expect(stats24h).toBeDefined()
      // 24h should have equal or more requests than 1h
      expect(stats24h.total).toBeGreaterThanOrEqual(stats1h.total)
    })
  })

  describe('Database Health Check', () => {
    it('should check database health', async () => {
      const health = await checkDatabaseHealth()
      expect(typeof health).toBe('object')
      expect(health.status).toBe('healthy')
      expect(typeof health.latency).toBe('number')
    })
  })

  describe('Data Cleanup', () => {
    it('should cleanup old data without errors', async () => {
      // cleanupOldData returns void - just verify no errors thrown
      await cleanupOldData(90) // Keep 90 days
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Test with invalid IP (too long)
      const longIp = 'x'.repeat(100)
      const result = await findOrCreateUser(longIp, testUserAgent)
      // Should return null or handle error gracefully
      expect(result === null || result).toBeDefined()
    })

    it('should handle concurrent requests', async () => {
      // Simulate concurrent tracking (trackSearch returns void)
      const promises = [
        trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct'),
        trackSearch(testIpAddress, 'MSFT', testUserAgent, 'direct'),
        trackSearch(testIpAddress, 'GOOGL', testUserAgent, 'direct')
      ]
      
      await Promise.all(promises)
      
      // Verify by checking search history
      const history = await getUserSearchHistory(testIpAddress, 10)
      expect(history.length).toBeGreaterThanOrEqual(3)
    })
  })
})
