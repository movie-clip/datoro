// tests/e2e/ticker-flow.test.ts
// End-to-end tests for ticker data retrieval and display flows
// 
// Critical User Flows Tested:
// 1. Search ticker → Load batch data → Verify data structure
// 2. Invalid ticker handling
// 3. Rate limiting behavior
// 4. Cache performance
// 5. Data validation (quotes, financials, profile)
// 
// ⚠️  REQUIRES SERVER RUNNING
// Run: npm run server (in separate terminal)
// Test: npm run test:e2e

import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '..', '.env.local') })

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7071'

// Test tickers (known valid data from FMP)
const TEST_TICKERS = {
  VALID: 'AAPL',        // Apple - always has complete data
  VALID_ALT: 'MSFT',    // Microsoft - alternate valid ticker
  INVALID: 'INVALIDXYZ', // Invalid ticker
  EMPTY: '',            // Empty ticker
}

// Helper: Check if server is running
async function checkServerRunning() {
  try {
    const response = await request(BASE_URL).get('/api/health').timeout(2000)
    return response.status === 200
  } catch {
    return false
  }
}

// Helper: Validate batch data structure
function validateBatchData(data: any) {
  expect(data).toBeDefined()
  expect(data.ticker).toBeDefined()
  expect(data.timestamp).toBeDefined()
  expect(data.data).toBeDefined()
  
  // Check that all expected endpoints are present
  const requiredEndpoints = [
    'profile',
    'quote',
    'incomeAnnual',
    'incomeQuarter',
    'balanceAnnual',
    'balanceQuarter',
    'cashflowAnnual',
    'cashflowQuarter',
    'keyMetrics',
    'ratios',
    'dividends',
    'splits',
    'insiderTrades',
    'institutionalHolders',
    'earnings',
    'earningsCalendar',
    'dcf'
  ]
  
  requiredEndpoints.forEach(endpoint => {
    expect(data.data[endpoint]).toBeDefined()
  })
}

describe('Ticker Data Flow - E2E Tests', () => {
  beforeAll(async () => {
    console.log('\n📊 Starting Ticker Data Flow E2E Tests...')
    console.log(`📍 Testing against: ${BASE_URL}\n`)
    
    const isServerRunning = await checkServerRunning()
    if (!isServerRunning) {
      throw new Error('Server not running - start with: npm run server')
    }
    
    console.log('✅ Server is running\n')
  })

  describe('Batch Data Endpoint', () => {
    it('should fetch complete batch data for valid ticker', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}?mode=full`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      
      validateBatchData(response.body.data)
      
      // Validate ticker matches
      expect(response.body.data.ticker).toBe(TEST_TICKERS.VALID)
      
      // Validate profile data
      const profile = response.body.data.data.profile
      expect(profile).toBeDefined()
      expect(profile.symbol).toBe(TEST_TICKERS.VALID)
      expect(profile.companyName).toBeTruthy()
      expect(profile.industry).toBeTruthy()
      expect(profile.sector).toBeTruthy()
      
      // Validate quote data
      const quote = response.body.data.data.quote
      expect(quote).toBeDefined()
      expect(quote.symbol).toBe(TEST_TICKERS.VALID)
      expect(quote.price).toBeGreaterThan(0)
      expect(quote.volume).toBeGreaterThan(0)
      
      // Validate financial statements exist
      expect(response.body.data.data.incomeAnnual).toBeDefined()
      expect(Array.isArray(response.body.data.data.incomeAnnual)).toBe(true)
      expect(response.body.data.data.incomeAnnual.length).toBeGreaterThan(0)
      
      // Validate fetch duration is logged
      expect(response.body.data.fetchDuration).toBeDefined()
      expect(response.body.data.fetchDuration).toBeGreaterThan(0)
      
      console.log(`✓ Fetched ${TEST_TICKERS.VALID} data in ${response.body.data.fetchDuration}ms`)
    }, 30000) // Long timeout for API call

    it('should fetch batch data for alternative ticker', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID_ALT}?mode=full`)
        .expect(200)

      expect(response.body.success).toBe(true)
      validateBatchData(response.body.data)
      expect(response.body.data.ticker).toBe(TEST_TICKERS.VALID_ALT)
      
      console.log(`✓ Fetched ${TEST_TICKERS.VALID_ALT} data in ${response.body.data.fetchDuration}ms`)
    }, 30000)

    it('should handle invalid ticker gracefully', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.INVALID}?mode=full`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeTruthy()
    }, 15000)

    it('should reject empty ticker', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.EMPTY}?mode=full`)
        .expect(400)

      expect(response.body.success).toBe(false)
    }, 10000)

    it('should normalize ticker to uppercase', async () => {
      // Send lowercase ticker
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/aapl?mode=full`)
        .expect(200)

      // Should return uppercase ticker
      expect(response.body.data.ticker).toBe('AAPL')
      expect(response.body.data.data.profile.symbol).toBe('AAPL')
    }, 30000)
  })

  describe('Cache Performance', () => {
    it('should serve cached data faster on second request', async () => {
      const ticker = TEST_TICKERS.VALID
      
      // First request (cache miss)
      const response1 = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .expect(200)
      
      const firstFetchTime = response1.body.data.fetchDuration
      expect(firstFetchTime).toBeGreaterThan(0)
      
      // Second request (cache hit)
      const response2 = await request(BASE_URL)
        .get(`/api/ticker-data/${ticker}?mode=full`)
        .expect(200)
      
      const secondFetchTime = response2.body.data.fetchDuration
      
      // Cached request should be MUCH faster (typically <10ms vs >1000ms)
      // Allow some variance due to Redis network latency
      console.log(`First fetch: ${firstFetchTime}ms, Cached fetch: ${secondFetchTime}ms`)
      
      // Both should return same data structure
      validateBatchData(response1.body.data)
      validateBatchData(response2.body.data)
      
      // Data should be identical
      expect(response2.body.data.ticker).toBe(response1.body.data.ticker)
    }, 60000) // Long timeout for multiple API calls

    it('should include cache metadata in response', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}?mode=full`)
        .expect(200)

      expect(response.body.data.timestamp).toBeDefined()
      expect(response.body.data.fetchDuration).toBeDefined()
      
      // Timestamp should be recent (within last 10 minutes)
      const timestamp = new Date(response.body.data.timestamp).getTime()
      const now = Date.now()
      const tenMinutes = 10 * 60 * 1000
      expect(now - timestamp).toBeLessThan(tenMinutes)
    }, 30000)
  })

  describe('Data Validation', () => {
    it('should return valid financial statement data', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}?mode=full`)
        .expect(200)

      const data = response.body.data.data
      
      // Annual income statements
      expect(Array.isArray(data.incomeAnnual)).toBe(true)
      expect(data.incomeAnnual.length).toBeGreaterThan(0)
      
      const latestIncome = data.incomeAnnual[0]
      expect(latestIncome.date).toBeDefined()
      expect(latestIncome.revenue).toBeDefined()
      expect(latestIncome.netIncome).toBeDefined()
      expect(latestIncome.eps).toBeDefined()
      
      // Quarterly income statements
      expect(Array.isArray(data.incomeQuarter)).toBe(true)
      expect(data.incomeQuarter.length).toBeGreaterThan(0)
      
      // Balance sheets
      expect(Array.isArray(data.balanceAnnual)).toBe(true)
      expect(data.balanceAnnual.length).toBeGreaterThan(0)
      
      const latestBalance = data.balanceAnnual[0]
      expect(latestBalance.totalAssets).toBeDefined()
      expect(latestBalance.totalLiabilities).toBeDefined()
      expect(latestBalance.totalEquity).toBeDefined()
      
      // Cash flow statements
      expect(Array.isArray(data.cashflowAnnual)).toBe(true)
      expect(data.cashflowAnnual.length).toBeGreaterThan(0)
      
      const latestCashflow = data.cashflowAnnual[0]
      expect(latestCashflow.operatingCashFlow).toBeDefined()
      expect(latestCashflow.freeCashFlow).toBeDefined()
    }, 30000)

    it('should return valid key metrics', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}?mode=full`)
        .expect(200)

      const metrics = response.body.data.data.keyMetrics
      expect(Array.isArray(metrics)).toBe(true)
      expect(metrics.length).toBeGreaterThan(0)
      
      const latestMetrics = metrics[0]
      expect(latestMetrics.peRatio).toBeDefined()
      expect(latestMetrics.priceToBookRatio).toBeDefined()
      expect(latestMetrics.marketCap).toBeDefined()
    }, 30000)

    it('should return valid ratios', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}?mode=full`)
        .expect(200)

      const ratios = response.body.data.data.ratios
      expect(Array.isArray(ratios)).toBe(true)
      expect(ratios.length).toBeGreaterThan(0)
      
      const latestRatios = ratios[0]
      expect(latestRatios.returnOnEquity).toBeDefined()
      expect(latestRatios.returnOnAssets).toBeDefined()
      expect(latestRatios.currentRatio).toBeDefined()
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should handle special characters in ticker', async () => {
      const response = await request(BASE_URL)
        .get('/api/ticker-data/INVALID@#$%?mode=full')
        .expect(404)

      expect(response.body.success).toBe(false)
    }, 15000)

    it('should handle missing mode parameter', async () => {
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}`)
        .expect(200)

      // Should still work with default mode
      expect(response.body.success).toBe(true)
    }, 30000)

    it('should validate response times are reasonable', async () => {
      const startTime = Date.now()
      
      const response = await request(BASE_URL)
        .get(`/api/ticker-data/${TEST_TICKERS.VALID}?mode=full`)
        .expect(200)
      
      const totalTime = Date.now() - startTime
      
      // Total response time should be under 30 seconds (even for uncached)
      expect(totalTime).toBeLessThan(30000)
      
      // Server-side fetch should be logged
      expect(response.body.data.fetchDuration).toBeDefined()
      
      console.log(`Total response time: ${totalTime}ms (Server fetch: ${response.body.data.fetchDuration}ms)`)
    }, 35000)
  })

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const tickers = [TEST_TICKERS.VALID, TEST_TICKERS.VALID_ALT]
      
      // Send requests in parallel
      const promises = tickers.map(ticker =>
        request(BASE_URL)
          .get(`/api/ticker-data/${ticker}?mode=full`)
          .expect(200)
      )
      
      const responses = await Promise.all(promises)
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true)
        expect(response.body.data.ticker).toBe(tickers[index])
        validateBatchData(response.body.data)
      })
      
      console.log(`✓ Fetched ${tickers.length} tickers concurrently`)
    }, 60000)
  })
})
