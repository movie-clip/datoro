// tests/e2e/dcf-data.test.ts
// End-to-end tests for DCF calculator data availability
// 
// Critical Data Flows Tested:
// 1. Verify DCF data is included in batch response
// 2. Validate financial data needed for DCF calculations
// 3. Test data extraction for revenue, FCF, EBITDA projections
// 4. Verify Advanced DCF model data structure
// 
// Note: DCF calculation logic is client-side (Vue components)
// These tests focus on API data availability for DCF features
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
const TEST_TICKER = 'AAPL' // Known ticker with complete financial data

// Helper: Check if server is running
async function checkServerRunning() {
  try {
    const response = await request(BASE_URL).get('/api/health').timeout(2000)
    return response.status === 200
  } catch {
    return false
  }
}

describe('DCF Data Availability - E2E Tests', () => {
  let batchData: any

  beforeAll(async () => {
    console.log('\n💰 Starting DCF Data Availability E2E Tests...')
    console.log(`📍 Testing against: ${BASE_URL}\n`)
    
    const isServerRunning = await checkServerRunning()
    if (!isServerRunning) {
      throw new Error('Server not running - start with: npm run server')
    }
    
    console.log('✅ Server is running')
    
    // Fetch batch data once for all tests
    const response = await request(BASE_URL)
      .get(`/api/ticker-data/${TEST_TICKER}?mode=full`)
      .expect(200)
    
    batchData = response.body.data
    console.log(`✅ Loaded ${TEST_TICKER} batch data\n`)
  })

  describe('DCF Data in Batch Response', () => {
    it('should include FMP DCF valuation data', () => {
      expect(batchData.data.dcf).toBeDefined()
      
      if (Array.isArray(batchData.data.dcf) && batchData.data.dcf.length > 0) {
        const dcfData = batchData.data.dcf[0]
        expect(dcfData.symbol).toBe(TEST_TICKER)
        expect(dcfData.date).toBeDefined()
        expect(dcfData.dcf).toBeDefined()
        console.log(`✓ FMP DCF value: $${dcfData.dcf}`)
      } else {
        console.log('⚠️  No DCF data available for this ticker')
      }
    })

    it('should include Advanced DCF model data', () => {
      expect(batchData.data.advancedDcf).toBeDefined()
      
      if (batchData.data.advancedDcf && !batchData.data.advancedDcf._error) {
        const advDcf = batchData.data.advancedDcf
        
        // Validate Advanced DCF structure
        expect(advDcf.symbol).toBe(TEST_TICKER)
        expect(advDcf.intrinsicValue).toBeDefined()
        expect(advDcf.currentPrice).toBeDefined()
        expect(advDcf.wacc).toBeDefined()
        expect(advDcf.terminalGrowthRate).toBeDefined()
        
        // Validate projections
        expect(Array.isArray(advDcf.projections)).toBe(true)
        expect(advDcf.projections.length).toBeGreaterThan(0)
        
        const firstProjection = advDcf.projections[0]
        expect(firstProjection.year).toBeDefined()
        expect(firstProjection.revenue).toBeDefined()
        expect(firstProjection.freeCashFlow).toBeDefined()
        
        console.log(`✓ Advanced DCF intrinsic value: $${advDcf.intrinsicValue}`)
        console.log(`✓ Current price: $${advDcf.currentPrice}`)
        console.log(`✓ Upside: ${advDcf.upside}%`)
      } else {
        console.log('⚠️  Advanced DCF not available for this ticker')
      }
    })
  })

  describe('Financial Data for DCF Calculations', () => {
    it('should have income statement data for revenue projections', () => {
      expect(batchData.data.incomeAnnual).toBeDefined()
      expect(Array.isArray(batchData.data.incomeAnnual)).toBe(true)
      expect(batchData.data.incomeAnnual.length).toBeGreaterThan(0)
      
      // Validate required fields for DCF
      const latestIncome = batchData.data.incomeAnnual[0]
      expect(latestIncome.date).toBeDefined()
      expect(latestIncome.revenue).toBeDefined()
      expect(latestIncome.revenue).toBeGreaterThan(0)
      expect(latestIncome.operatingIncome).toBeDefined()
      expect(latestIncome.netIncome).toBeDefined()
      
      console.log(`✓ Latest revenue: $${(latestIncome.revenue / 1e9).toFixed(2)}B`)
    })

    it('should have cash flow data for FCF projections', () => {
      expect(batchData.data.cashflowAnnual).toBeDefined()
      expect(Array.isArray(batchData.data.cashflowAnnual)).toBe(true)
      expect(batchData.data.cashflowAnnual.length).toBeGreaterThan(0)
      
      // Validate required fields for DCF
      const latestCashflow = batchData.data.cashflowAnnual[0]
      expect(latestCashflow.date).toBeDefined()
      expect(latestCashflow.operatingCashFlow).toBeDefined()
      expect(latestCashflow.freeCashFlow).toBeDefined()
      expect(latestCashflow.capitalExpenditure).toBeDefined()
      
      console.log(`✓ Latest FCF: $${(latestCashflow.freeCashFlow / 1e9).toFixed(2)}B`)
    })

    it('should have balance sheet data for enterprise value', () => {
      expect(batchData.data.balanceAnnual).toBeDefined()
      expect(Array.isArray(batchData.data.balanceAnnual)).toBe(true)
      expect(batchData.data.balanceAnnual.length).toBeGreaterThan(0)
      
      // Validate required fields for DCF
      const latestBalance = batchData.data.balanceAnnual[0]
      expect(latestBalance.date).toBeDefined()
      expect(latestBalance.totalAssets).toBeDefined()
      expect(latestBalance.totalDebt).toBeDefined()
      expect(latestBalance.cashAndCashEquivalents).toBeDefined()
      
      console.log(`✓ Total debt: $${(latestBalance.totalDebt / 1e9).toFixed(2)}B`)
      console.log(`✓ Cash: $${(latestBalance.cashAndCashEquivalents / 1e9).toFixed(2)}B`)
    })

    it('should have key metrics for discount rate calculation', () => {
      expect(batchData.data.keyMetrics).toBeDefined()
      expect(Array.isArray(batchData.data.keyMetrics)).toBe(true)
      expect(batchData.data.keyMetrics.length).toBeGreaterThan(0)
      
      // Validate required fields for WACC calculation
      const latestMetrics = batchData.data.keyMetrics[0]
      expect(latestMetrics.peRatio).toBeDefined()
      expect(latestMetrics.marketCap).toBeDefined()
      
      // Beta is often needed for cost of equity
      if (latestMetrics.beta !== undefined) {
        console.log(`✓ Beta: ${latestMetrics.beta}`)
      }
    })

    it('should have company profile for shares outstanding', () => {
      expect(batchData.data.profile).toBeDefined()
      const profile = batchData.data.profile
      
      expect(profile.symbol).toBe(TEST_TICKER)
      expect(profile.mktCap).toBeDefined()
      expect(profile.mktCap).toBeGreaterThan(0)
      
      // Shares outstanding needed for per-share intrinsic value
      if (profile.sharesOutstanding) {
        console.log(`✓ Shares outstanding: ${(profile.sharesOutstanding / 1e9).toFixed(2)}B`)
      }
    })

    it('should have current quote for valuation comparison', () => {
      expect(batchData.data.quote).toBeDefined()
      const quote = batchData.data.quote
      
      expect(quote.symbol).toBe(TEST_TICKER)
      expect(quote.price).toBeDefined()
      expect(quote.price).toBeGreaterThan(0)
      
      console.log(`✓ Current price: $${quote.price}`)
    })
  })

  describe('Data Quality for DCF', () => {
    it('should have sufficient historical data (5+ years)', () => {
      // DCF models typically need 5-10 years of historical data
      expect(batchData.data.incomeAnnual.length).toBeGreaterThanOrEqual(5)
      expect(batchData.data.cashflowAnnual.length).toBeGreaterThanOrEqual(5)
      expect(batchData.data.balanceAnnual.length).toBeGreaterThanOrEqual(5)
      
      console.log(`✓ Income statements: ${batchData.data.incomeAnnual.length} years`)
      console.log(`✓ Cash flow statements: ${batchData.data.cashflowAnnual.length} years`)
      console.log(`✓ Balance sheets: ${batchData.data.balanceAnnual.length} years`)
    })

    it('should have consistent date ordering (newest first)', () => {
      const incomeStatements = batchData.data.incomeAnnual
      
      if (incomeStatements.length >= 2) {
        const date1 = new Date(incomeStatements[0].date)
        const date2 = new Date(incomeStatements[1].date)
        
        // Newest should be first
        expect(date1.getTime()).toBeGreaterThan(date2.getTime())
        
        console.log(`✓ Data ordered newest first: ${incomeStatements[0].date}`)
      }
    })

    it('should have no null revenue in recent years', () => {
      const recentIncome = batchData.data.incomeAnnual.slice(0, 3)
      
      recentIncome.forEach((income: any) => {
        expect(income.revenue).toBeDefined()
        expect(income.revenue).not.toBe(null)
        expect(income.revenue).toBeGreaterThan(0)
      })
      
      console.log('✓ All recent revenue data is valid')
    })

    it('should have no null FCF in recent years', () => {
      const recentCashflow = batchData.data.cashflowAnnual.slice(0, 3)
      
      recentCashflow.forEach((cf: any) => {
        expect(cf.freeCashFlow).toBeDefined()
        expect(cf.freeCashFlow).not.toBe(null)
        // FCF can be negative, just check it's defined
      })
      
      console.log('✓ All recent FCF data is valid')
    })
  })

  describe('Growth Rate Calculation Data', () => {
    it('should be able to calculate revenue CAGR', () => {
      const statements = batchData.data.incomeAnnual
      
      if (statements.length >= 5) {
        const latest = statements[0].revenue
        const fiveYearsAgo = statements[4].revenue
        
        expect(latest).toBeGreaterThan(0)
        expect(fiveYearsAgo).toBeGreaterThan(0)
        
        const years = 4
        const cagr = (Math.pow(latest / fiveYearsAgo, 1 / years) - 1) * 100
        
        console.log(`✓ 5-year revenue CAGR: ${cagr.toFixed(2)}%`)
        expect(cagr).toBeDefined()
      }
    })

    it('should be able to calculate FCF growth rate', () => {
      const cashflows = batchData.data.cashflowAnnual
      
      if (cashflows.length >= 5) {
        const latest = cashflows[0].freeCashFlow
        const fiveYearsAgo = cashflows[4].freeCashFlow
        
        expect(latest).toBeDefined()
        expect(fiveYearsAgo).toBeDefined()
        
        if (latest > 0 && fiveYearsAgo > 0) {
          const years = 4
          const cagr = (Math.pow(latest / fiveYearsAgo, 1 / years) - 1) * 100
          
          console.log(`✓ 5-year FCF CAGR: ${cagr.toFixed(2)}%`)
        } else {
          console.log('⚠️  FCF was negative in some years')
        }
      }
    })
  })

  describe('Margin Data for Projections', () => {
    it('should have operating margin data', () => {
      const latestIncome = batchData.data.incomeAnnual[0]
      const operatingMargin = (latestIncome.operatingIncome / latestIncome.revenue) * 100
      
      expect(operatingMargin).toBeDefined()
      expect(Math.abs(operatingMargin)).toBeLessThan(100) // Sanity check
      
      console.log(`✓ Operating margin: ${operatingMargin.toFixed(2)}%`)
    })

    it('should have FCF margin data', () => {
      const latestIncome = batchData.data.incomeAnnual[0]
      const latestCashflow = batchData.data.cashflowAnnual[0]
      
      const fcfMargin = (latestCashflow.freeCashFlow / latestIncome.revenue) * 100
      
      expect(fcfMargin).toBeDefined()
      
      console.log(`✓ FCF margin: ${fcfMargin.toFixed(2)}%`)
    })
  })
})
