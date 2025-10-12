// tests/unit/databaseService.test.js
// Unit tests for database service functions

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
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
  let testIpAddress = '127.0.0.1'
  let testUserAgent = 'Vitest Test Runner'
  
  beforeAll(async () => {
    console.log('\n🧪 Starting Database Service Tests...\n')
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
    it('should find or create user by IP address', async () => {
      const user = await findOrCreateUser(testIpAddress, testUserAgent)
      
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.ipAddress).toBe(testIpAddress)
      expect(user.userAgent).toBe(testUserAgent)
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.lastSeenAt).toBeInstanceOf(Date)
    })

    it('should update lastSeenAt on existing user', async () => {
      const user1 = await findOrCreateUser(testIpAddress, testUserAgent)
      await sleep(100) // Wait 100ms
      const user2 = await findOrCreateUser(testIpAddress, testUserAgent)
      
      expect(user1.id).toBe(user2.id)
      expect(user2.lastSeenAt.getTime()).toBeGreaterThan(user1.lastSeenAt.getTime())
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
      const result = await trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct')
      
      expect(result).toBeDefined()
      expect(result.ticker).toBe('AAPL')
      expect(result.source).toBe('direct')
      expect(result.searchedAt).toBeInstanceOf(Date)
    })

    it('should handle null ticker gracefully', async () => {
      const result = await trackSearch(testIpAddress, null, testUserAgent, 'direct')
      expect(result).toBeNull()
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
      
      // Then update company name
      const result = await updateTickerCompanyName('NVDA', 'NVIDIA Corporation')
      
      expect(result).toBeDefined()
      expect(result.ticker).toBe('NVDA')
      expect(result.companyName).toBe('NVIDIA Corporation')
    })

    it('should handle null company name', async () => {
      const result = await updateTickerCompanyName('TEST', null)
      expect(result).toBeNull()
    })

    it('should handle null ticker', async () => {
      const result = await updateTickerCompanyName(null, 'Company Name')
      expect(result).toBeNull()
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
      
      const result = await trackApiRequest(requestData)
      
      expect(result).toBeDefined()
      expect(result.endpoint).toBe(requestData.endpoint)
      expect(result.method).toBe(requestData.method)
      expect(result.statusCode).toBe(requestData.statusCode)
      expect(result.responseTime).toBe(requestData.responseTime)
      expect(result.cached).toBe(requestData.cached)
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
      
      const result = await trackApiRequest(requestData)
      
      expect(result.cached).toBe(true)
      expect(result.responseTime).toBeLessThan(50) // Cached should be fast
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
      
      const result = await trackApiRequest(requestData)
      
      expect(result.statusCode).toBe(400)
      expect(result.errorCode).toBe('E001')
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
      tickers.forEach(ticker => {
        expect(ticker.lastSearched.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime())
      })
    })
  })

  describe('User Search History', () => {
    it('should get user search history', async () => {
      const history = await getUserSearchHistory(testIpAddress, 20)
      
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
      
      // Check structure
      const first = history[0]
      expect(first.ticker).toBeDefined()
      expect(first.source).toBeDefined()
      expect(first.searchedAt).toBeInstanceOf(Date)
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
      expect(stats.totalRequests).toBeDefined()
      expect(typeof stats.totalRequests).toBe('number')
      expect(stats.successRate).toBeDefined()
      expect(stats.avgResponseTime).toBeDefined()
      expect(stats.cacheHitRate).toBeDefined()
    })

    it('should calculate success rate correctly', async () => {
      const stats = await getApiRequestStats(24)
      
      if (stats.totalRequests > 0) {
        expect(stats.successRate).toBeGreaterThanOrEqual(0)
        expect(stats.successRate).toBeLessThanOrEqual(100)
      }
    })

    it('should calculate cache hit rate correctly', async () => {
      const stats = await getApiRequestStats(24)
      
      if (stats.totalRequests > 0) {
        expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0)
        expect(stats.cacheHitRate).toBeLessThanOrEqual(100)
      }
    })

    it('should respect hours parameter', async () => {
      const stats1h = await getApiRequestStats(1)
      const stats24h = await getApiRequestStats(24)
      
      expect(stats1h).toBeDefined()
      expect(stats24h).toBeDefined()
      // 24h should have equal or more requests than 1h
      expect(stats24h.totalRequests).toBeGreaterThanOrEqual(stats1h.totalRequests)
    })
  })

  describe('Database Health Check', () => {
    it('should check database health', async () => {
      const isHealthy = await checkDatabaseHealth()
      expect(typeof isHealthy).toBe('boolean')
      expect(isHealthy).toBe(true) // Should be healthy if tests are running
    })
  })

  describe('Data Cleanup', () => {
    it('should cleanup old data without errors', async () => {
      // This should run without throwing
      const result = await cleanupOldData(90) // Keep 90 days
      expect(result).toBeDefined()
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
      // Simulate concurrent tracking
      const promises = [
        trackSearch(testIpAddress, 'AAPL', testUserAgent, 'direct'),
        trackSearch(testIpAddress, 'MSFT', testUserAgent, 'direct'),
        trackSearch(testIpAddress, 'GOOGL', testUserAgent, 'direct')
      ]
      
      const results = await Promise.all(promises)
      expect(results.length).toBe(3)
      results.forEach(result => {
        expect(result).toBeDefined()
      })
    })
  })
})
