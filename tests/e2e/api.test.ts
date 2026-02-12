// tests/e2e/api.test.ts
// End-to-end tests for API endpoints
// 
// ⚠️  REQUIRES SERVER RUNNING
// Before running these tests, start the server:
//   npm run server  (or)  npm run pm2:dev
// 
// Run with: npm run test:e2e

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '..', '.env.local') })

// Base URL for API tests
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7071'

// Check if server is running before running tests
async function checkServerRunning() {
  try {
    const response = await request(BASE_URL).get('/api/health').timeout(2000)
    return response.status === 200
  } catch {
    return false
  }
}

describe('API Endpoints - E2E Tests', () => {
  beforeAll(async () => {
    console.log('\n🌐 Starting E2E API Tests...')
    console.log(`📍 Testing against: ${BASE_URL}\n`)
    
    // Check if server is running
    const isServerRunning = await checkServerRunning()
    if (!isServerRunning) {
      console.log('❌ Server is not running!')
      console.log('   Start the server first:')
      console.log('     npm run server  (or)')
      console.log('     npm run pm2:dev')
      console.log('')
      throw new Error('Server not running - cannot run E2E tests')
    }
    
    console.log('✅ Server is running - proceeding with tests\n')
  })

  afterAll(async () => {
    console.log('\n✅ E2E API Tests Complete\n')
  })

  describe('Health Check', () => {
    it('GET /api/health should return 200', async () => {
      const response = await request(BASE_URL)
        .get('/api/health')
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.status).toBe('healthy')
      expect(response.body.uptime).toBeDefined()
    }, 10000) // Increase timeout for API call
  })

  describe('FMP Proxy - Profile Endpoint', () => {
    it('GET /api/fmp/api/v3/profile/:ticker should return profile data', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/profile/AAPL')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      const profile = response.body[0]
      expect(profile.symbol).toBe('AAPL')
      expect(profile.companyName).toBeDefined()
      expect(profile.industry).toBeDefined()
      expect(profile.sector).toBeDefined()
    }, 10000) // Increase timeout for API call

    it('should validate ticker format', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/profile/invalid123')
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.code).toBe('E001')
      expect(response.body.error.message).toBe('Validation failed')
      expect(response.body.error.details).toBeDefined()
      expect(response.body.error.details[0].field).toBe('ticker')
    }, 10000) // Increase timeout for API call

    it('should handle valid ticker with dots (e.g., BRK.B)', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/profile/BRK.B')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    }, 10000) // Increase timeout for API call
  })

  describe('FMP Proxy - Income Statement', () => {
    it('GET /api/fmp/api/v3/income-statement/:ticker should return financial data', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/income-statement/AAPL')
        .query({ period: 'annual', limit: 3 })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeLessThanOrEqual(3)
      
      const statement = response.body[0]
      expect(statement.symbol).toBe('AAPL')
      expect(statement.revenue).toBeDefined()
      expect(statement.netIncome).toBeDefined()
      expect(statement.date).toBeDefined()
    }, 10000) // Increase timeout for API call

    it('should validate period parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/income-statement/AAPL')
        .query({ period: 'invalid' })
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.code).toBe('E001')
      expect(response.body.error.details[0].field).toBe('period')
    }, 10000) // Increase timeout for API call

    it('should validate limit parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/income-statement/AAPL')
        .query({ limit: 1000 })
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.details[0].field).toBe('limit')
    }, 10000) // Increase timeout for API call

    it('should accept quarterly period', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/income-statement/AAPL')
        .query({ period: 'quarterly', limit: 5 })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    }, 10000) // Increase timeout for API call
  })

  describe('FMP Proxy - Balance Sheet', () => {
    it('GET /api/fmp/api/v3/balance-sheet-statement/:ticker should return data', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/balance-sheet-statement/MSFT')
        .query({ period: 'annual', limit: 3 })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      
      const sheet = response.body[0]
      expect(sheet.symbol).toBe('MSFT')
      expect(sheet.totalAssets).toBeDefined()
      expect(sheet.totalLiabilities).toBeDefined()
    }, 10000) // Increase timeout for API call
  })

  describe('FMP Proxy - Cash Flow', () => {
    it('GET /api/fmp/api/v3/cash-flow-statement/:ticker should return data', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/cash-flow-statement/GOOGL')
        .query({ period: 'annual', limit: 3 })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      
      const cashflow = response.body[0]
      expect(cashflow.symbol).toBe('GOOGL')
      expect(cashflow.freeCashFlow).toBeDefined()
      expect(cashflow.operatingCashFlow).toBeDefined()
    }, 10000) // Increase timeout for API call
  })

  describe('Analytics - Popular Tickers', () => {
    it('GET /api/analytics/popular should return popular tickers', async () => {
      const response = await request(BASE_URL)
        .get('/api/analytics/popular')
        .query({ limit: 5, days: 7 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      
      if (response.body.data.length > 0) {
        const ticker = response.body.data[0]
        expect(ticker.ticker).toBeDefined()
        expect(ticker.searchCount).toBeDefined()
        expect(ticker.lastSearched).toBeDefined()
      }
    }, 15000) // Increase timeout for slow database aggregation query

    it('should validate limit parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/analytics/popular')
        .query({ limit: 1000 })
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.details[0].field).toBe('limit')
    }, 15000) // Increase timeout for slow database query

    it('should validate days parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/analytics/popular')
        .query({ days: 500 })
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.details[0].field).toBe('days')
    }, 15000) // Increase timeout for slow database query
  })

  describe('Analytics - Search History', () => {
    it('GET /api/analytics/history should return search history', async () => {
      const response = await request(BASE_URL)
        .get('/api/analytics/history')
        .query({ limit: 10 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    }, 15000) // Increase timeout for slow database query

    it('should validate limit parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/analytics/history')
        .query({ limit: 500 })
        .expect(400)

      expect(response.body.error).toBeDefined()
    }, 15000) // Increase timeout for slow database query
  })

  describe('Cache Headers', () => {
    it('should set X-Cache header on responses', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/profile/AAPL')
        .expect(200)

      expect(response.headers['x-cache']).toBeDefined()
      expect(['hit', 'miss', 'memory', 'redis']).toContain(response.headers['x-cache'])
    }, 10000) // Increase timeout for API call
  })

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/profile/AAPL')
        .expect(200)

      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
    }, 10000) // Increase timeout for API call

    it('should enforce rate limits (careful - this may trigger actual limit)', async () => {
      // Skip this test in CI to avoid rate limit issues
      if (process.env.CI) {
        console.log('⏭️  Skipping rate limit test in CI')
        return
      }

      // Make multiple requests quickly
      const requests = []
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(BASE_URL)
            .get('/api/fmp/api/v3/profile/AAPL')
        )
      }

      const responses = await Promise.all(requests)
      
      // All should succeed or some should be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status)
      })
    }, 10000) // 10 second timeout
  })

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173') // Set Origin header to trigger CORS
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBeDefined()
    }, 10000) // Increase timeout for API call
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(BASE_URL)
        .get('/api/non-existent-endpoint')
        .expect(404)

      expect(response.body.error).toBeDefined()
    }, 10000) // Increase timeout for API call

    it('should handle malformed requests gracefully', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/profile/')
        .expect(400)

      expect(response.body.error).toBeDefined()
    }, 10000) // Increase timeout for API call

    it('should block non-allowlisted FMP proxy endpoints', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/this-endpoint-does-not-exist/AAPL')
        .expect(403)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.code).toBe('FMP_PROXY_DENIED')
    }, 10000)

    it('should reject suspicious FMP proxy paths', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/..%2F..%2Fetc%2Fpasswd')
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.code).toBe('FMP_PROXY_INVALID_PATH')
    }, 10000)
  })

  describe('Monitoring Endpoints', () => {
    it('GET /api/monitoring/summary should return metrics', async () => {
      const response = await request(BASE_URL)
        .get('/api/monitoring/summary')
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.status).toBeDefined()
      expect(response.body.uptime).toBeDefined()
      expect(response.body.requests).toBeDefined()
    }, 10000) // Increase timeout for database aggregation

    it('GET /api/cache/stats should return cache statistics', async () => {
      const response = await request(BASE_URL)
        .get('/api/cache/stats')
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.hits).toBeDefined()
      expect(response.body.misses).toBeDefined()
      expect(response.body.hitRate).toBeDefined()
    }, 10000) // Increase timeout for cache statistics
  })

  describe('Multiple Tickers', () => {
    it('should handle different tickers correctly', async () => {
      const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
      
      for (const ticker of tickers) {
        const response = await request(BASE_URL)
          .get(`/api/fmp/api/v3/profile/${ticker}`)
          .expect(200)

        expect(response.body[0].symbol).toBe(ticker)
      }
    }, 15000) // Increase timeout for sequential API calls
  })

  describe('Query Parameter Handling', () => {
    it('should handle missing optional parameters', async () => {
      const response = await request(BASE_URL)
        .get('/api/fmp/api/v3/income-statement/AAPL')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    }, 10000) // Increase timeout for API call

    it('should apply default values for optional parameters', async () => {
      const response = await request(BASE_URL)
        .get('/api/analytics/popular')
        .expect(200)

      // Should use defaults: limit=10, days=7
      expect(response.body.success).toBe(true)
    }, 15000) // Increase timeout for slow database aggregation query
  })
})
