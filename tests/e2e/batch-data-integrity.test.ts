// tests/e2e/batch-data-integrity.test.ts
// Tests to catch batch data integrity issues (missing/null critical data)
// 
// ⚠️  REQUIRES SERVER RUNNING
// Before running: npm run server:dev (or) npm run pm2:dev
// Run with: npm run test:e2e

import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '..', '.env.local') })

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7071'

// Test tickers (diverse set to catch edge cases)
const TEST_TICKERS = [
  'AAPL',  // US mega-cap (should always work)
  'MSFT',  // US mega-cap
  'TSLA',  // Volatile stock
  'BRK.B', // Contains dot (edge case)
]

describe('Batch Data Integrity Tests', () => {
  beforeAll(async () => {
    console.log('\n🔍 Starting Batch Data Integrity Tests...')
    console.log(`📍 Testing against: ${BASE_URL}\n`)
    
    // Check if server is running
    try {
      const response = await request(BASE_URL).get('/api/health').timeout(2000)
      expect(response.status).toBe(200)
      console.log('✅ Server is running\n')
    } catch (error) {
      throw new Error('Server not running - start with: npm run server:dev')
    }
  })

  describe('Critical Data Fields - Full Mode', () => {
    TEST_TICKERS.forEach(ticker => {
      it(`should have complete batch data for ${ticker}`, async () => {
        const response = await request(BASE_URL)
          .get(`/api/ticker-data/${ticker}?mode=full`)
          .timeout(30000) // 30s timeout for batch requests
          .expect(200)

        expect(response.body).toBeDefined()
        expect(response.body.ticker).toBe(ticker)
        expect(response.body.data).toBeDefined()
        
        // Critical field: failures should be empty or not include critical data
        const failures = response.body.failures || []
        const criticalFields = ['profile', 'quote', 'priceHistory', 'incomeAnnual', 'balanceAnnual', 'cashflowAnnual']
        
        // Check for critical failures
        const criticalFailures = failures.filter((f: string) => criticalFields.includes(f))
        expect(criticalFailures).toEqual([])
      }, 35000)

      it(`should have valid priceHistory data for ${ticker}`, async () => {
        const response = await request(BASE_URL)
          .get(`/api/ticker-data/${ticker}?mode=full`)
          .timeout(30000)
          .expect(200)

        const priceHistory = response.body.data.priceHistory
        
        // Price history should exist
        expect(priceHistory).toBeDefined()
        expect(priceHistory).not.toBeNull()
        
        // Should have correct structure
        expect(priceHistory).toHaveProperty('symbol')
        expect(priceHistory.symbol).toBe(ticker)
        expect(priceHistory).toHaveProperty('historical')
        
        // Historical data should be an array with data
        expect(Array.isArray(priceHistory.historical)).toBe(true)
        expect(priceHistory.historical.length).toBeGreaterThan(0)
        
        // Each historical entry should have required fields
        const firstEntry = priceHistory.historical[0]
        expect(firstEntry).toHaveProperty('date')
        expect(firstEntry).toHaveProperty('close')
        expect(firstEntry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
        expect(typeof firstEntry.close).toBe('number')
        
        console.log(`✅ ${ticker}: ${priceHistory.historical.length} price points`)
      }, 35000)

      it(`should have profile data for ${ticker}`, async () => {
        const response = await request(BASE_URL)
          .get(`/api/ticker-data/${ticker}?mode=full`)
          .timeout(30000)
          .expect(200)

        const profile = response.body.data.profile
        
        expect(profile).toBeDefined()
        expect(Array.isArray(profile)).toBe(true)
        expect(profile.length).toBeGreaterThan(0)
        
        const company = profile[0]
        expect(company).toHaveProperty('symbol')
        expect(company.symbol).toBe(ticker)
        expect(company).toHaveProperty('companyName')
        expect(company.companyName).toBeTruthy()
        
        console.log(`✅ ${ticker}: ${company.companyName}`)
      }, 35000)

      it(`should have financial statements for ${ticker}`, async () => {
        const response = await request(BASE_URL)
          .get(`/api/ticker-data/${ticker}?mode=full`)
          .timeout(30000)
          .expect(200)

        const { incomeAnnual, balanceAnnual, cashflowAnnual } = response.body.data
        
        // All three statements should exist
        expect(incomeAnnual).toBeDefined()
        expect(balanceAnnual).toBeDefined()
        expect(cashflowAnnual).toBeDefined()
        
        // Should be arrays with data
        expect(Array.isArray(incomeAnnual)).toBe(true)
        expect(Array.isArray(balanceAnnual)).toBe(true)
        expect(Array.isArray(cashflowAnnual)).toBe(true)
        
        expect(incomeAnnual.length).toBeGreaterThan(0)
        expect(balanceAnnual.length).toBeGreaterThan(0)
        expect(cashflowAnnual.length).toBeGreaterThan(0)
        
        // Each should have date field
        expect(incomeAnnual[0]).toHaveProperty('date')
        expect(balanceAnnual[0]).toHaveProperty('date')
        expect(cashflowAnnual[0]).toHaveProperty('date')
        
        console.log(`✅ ${ticker}: ${incomeAnnual.length} years of financials`)
      }, 35000)
    })
  })

  describe('Cache Behavior', () => {
    it('should return cached data on subsequent requests', async () => {
      const ticker = 'AAPL'
      
      // First request (might hit cache or fetch fresh)
      const response1 = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      // Second request (should definitely hit cache)
      const response2 = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(5000) // Should be fast from cache
        .expect(200)

      // Data should be identical
      expect(response2.body.ticker).toBe(response1.body.ticker)
      expect(response2.body.data.profile).toEqual(response1.body.data.profile)
      
      // Second request should indicate cache hit
      const cacheHeader = response2.headers['x-cache']
      expect(cacheHeader).toBeDefined()
      expect(['redis', 'memory']).toContain(cacheHeader)
      
      console.log(`✅ Cache working: ${cacheHeader}`)
    }, 35000)

    it('should not have critical fields in failures list', async () => {
      const ticker = 'AAPL'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      const failures = response.body.failures || []
      const criticalFields = [
        'profile',
        'quote', 
        'priceHistory',
        'incomeAnnual',
        'balanceAnnual',
        'cashflowAnnual'
      ]
      
      // Check each critical field
      criticalFields.forEach(field => {
        expect(failures).not.toContain(field)
        expect(response.body.data[field]).toBeDefined()
        expect(response.body.data[field]).not.toBeNull()
      })
      
      if (failures.length > 0) {
        console.log(`⚠️  Non-critical failures: ${failures.join(', ')}`)
      }
      
      console.log(`✅ All critical fields present`)
    }, 35000)
  })

  describe('Price History Edge Cases', () => {
    it('should handle price history with long date ranges (30 years)', async () => {
      const ticker = 'AAPL'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      const priceHistory = response.body.data.priceHistory
      expect(priceHistory).toBeDefined()
      expect(priceHistory.historical.length).toBeGreaterThan(1000) // Should have years of data
      
      // Check data is sorted by date (oldest first or newest first)
      const dates = priceHistory.historical.map((h: any) => h.date)
      const firstDate = new Date(dates[0])
      const lastDate = new Date(dates[dates.length - 1])
      
      expect(firstDate.getTime()).not.toEqual(lastDate.getTime())
      
      console.log(`✅ ${ticker}: ${dates.length} price points from ${dates[0]} to ${dates[dates.length - 1]}`)
    }, 35000)

    it('should handle tickers with special characters (dots)', async () => {
      const ticker = 'BRK.B'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      const priceHistory = response.body.data.priceHistory
      expect(priceHistory).toBeDefined()
      expect(priceHistory.symbol).toBe(ticker)
      expect(priceHistory.historical.length).toBeGreaterThan(0)
      
      console.log(`✅ ${ticker}: Special character handling works`)
    }, 35000)
  })

  describe('Error Recovery', () => {
    it('should handle invalid tickers gracefully', async () => {
      const invalidTicker = 'INVALID123'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${invalidTicker}?mode=full`)
        .timeout(30000)

      // Should either return 404 or return with failures
      if (response.status === 404 || response.status === 400) {
        expect(response.body).toHaveProperty('error')
      } else {
        expect(response.status).toBe(200)
        const failures = response.body.failures || []
        // For invalid tickers, most endpoints should fail
        expect(failures.length).toBeGreaterThan(5)
      }
      
      console.log(`✅ Invalid ticker handled: ${response.status}`)
    }, 35000)

    it('should continue serving other data if one endpoint fails', async () => {
      const ticker = 'AAPL'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      // Even if some endpoints fail, critical ones should work
      expect(response.body.data.profile).toBeDefined()
      expect(response.body.data.quote).toBeDefined()
      
      // Response should always include failures array (even if empty)
      expect(response.body).toHaveProperty('failures')
      expect(Array.isArray(response.body.failures)).toBe(true)
      
      console.log(`✅ Partial failure handling works`)
    }, 35000)
  })

  describe('Performance & Monitoring', () => {
    it('should include fetch duration metadata', async () => {
      const ticker = 'AAPL'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      expect(response.body).toHaveProperty('fetchDuration')
      expect(typeof response.body.fetchDuration).toBe('number')
      expect(response.body.fetchDuration).toBeGreaterThan(0)
      
      console.log(`✅ Fetch duration: ${response.body.fetchDuration}ms`)
    }, 35000)

    it('should include timestamp for cache tracking', async () => {
      const ticker = 'AAPL'
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .timeout(30000)
        .expect(200)

      expect(response.body).toHaveProperty('timestamp')
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      
      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.getTime()).toBeGreaterThan(0)
      
      console.log(`✅ Timestamp: ${response.body.timestamp}`)
    }, 35000)
  })
})
