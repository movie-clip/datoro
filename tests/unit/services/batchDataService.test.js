/**
 * Unit Tests for Batch Data Service
 * 
 * Tests the core data fetching service that retrieves 17 FMP endpoints in parallel.
 * This is the backbone of the application (96.7% API reduction vs multi-call approach).
 * 
 * Coverage:
 * - fetchTickerBatch() - All 17 endpoints
 * - fetchTickerPriority() - 4 critical endpoints for quick load
 * - Error handling (timeout, 404, 500, network errors)
 * - Parallel fetching behavior
 * - Response structure validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { fetchTickerBatch, fetchTickerPriority } from '../../../server/services/batchDataService.js'

const FMP_BASE_URL = 'https://financialmodelingprep.com'
const TEST_API_KEY = 'test-api-key-123'
const TEST_TICKER = 'AAPL'

// Mock data fixtures
const mockProfile = [{
  symbol: 'AAPL',
  companyName: 'Apple Inc.',
  price: 150.25,
  beta: 1.2,
  mktCap: 2500000000000,
  lastDiv: 0.92,
  range: '120-180',
  changes: 2.5,
  currency: 'USD',
  cik: '0000320193',
  isin: 'US0378331005',
  exchange: 'NASDAQ',
  exchangeShortName: 'NASDAQ',
  industry: 'Consumer Electronics',
  website: 'https://www.apple.com',
  description: 'Apple Inc. designs, manufactures, and markets smartphones...',
  ceo: 'Timothy Cook',
  sector: 'Technology',
  country: 'US',
  fullTimeEmployees: '164000',
  phone: '14089961010',
  address: 'One Apple Park Way',
  city: 'Cupertino',
  state: 'CA',
  zip: '95014',
  image: 'https://financialmodelingprep.com/image-stock/AAPL.png',
  ipoDate: '1980-12-12',
  defaultImage: false,
  isEtf: false,
  isActivelyTrading: true,
  isAdr: false,
  isFund: false
}]

const mockQuote = [{
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150.25,
  changesPercentage: 1.69,
  change: 2.50,
  dayLow: 148.50,
  dayHigh: 151.20,
  yearHigh: 180.00,
  yearLow: 120.00,
  marketCap: 2500000000000,
  priceAvg50: 145.30,
  priceAvg200: 140.50,
  volume: 50000000,
  avgVolume: 55000000,
  open: 149.00,
  previousClose: 147.75,
  eps: 6.11,
  pe: 24.58,
  earningsAnnouncement: '2024-02-01T10:59:00.000+0000',
  sharesOutstanding: 16530000000,
  timestamp: 1704470400
}]

const mockIncomeStatement = [
  {
    date: '2023-09-30',
    symbol: 'AAPL',
    reportedCurrency: 'USD',
    cik: '0000320193',
    fillingDate: '2023-11-03',
    acceptedDate: '2023-11-02 18:01:14',
    calendarYear: '2023',
    period: 'FY',
    revenue: 383285000000,
    costOfRevenue: 214137000000,
    grossProfit: 169148000000,
    grossProfitRatio: 0.4414,
    researchAndDevelopmentExpenses: 29915000000,
    generalAndAdministrativeExpenses: 0,
    sellingAndMarketingExpenses: 0,
    sellingGeneralAndAdministrativeExpenses: 24932000000,
    otherExpenses: 382000000,
    operatingExpenses: 54847000000,
    costAndExpenses: 268984000000,
    interestIncome: 3750000000,
    interestExpense: 3933000000,
    depreciationAndAmortization: 11519000000,
    ebitda: 125820000000,
    ebitdaratio: 0.3283,
    operatingIncome: 114301000000,
    operatingIncomeRatio: 0.2982,
    totalOtherIncomeExpensesNet: -565000000,
    incomeBeforeTax: 113736000000,
    incomeBeforeTaxRatio: 0.2968,
    incomeTaxExpense: 16741000000,
    netIncome: 96995000000,
    netIncomeRatio: 0.2531,
    eps: 6.13,
    epsdiluted: 6.11,
    weightedAverageShsOut: 15812547000,
    weightedAverageShsOutDil: 15867440000,
    link: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-23-000106&xbrl_type=v',
    finalLink: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-23-000106&xbrl_type=v'
  }
]

const mockBalanceSheet = [
  {
    date: '2023-09-30',
    symbol: 'AAPL',
    reportedCurrency: 'USD',
    cik: '0000320193',
    fillingDate: '2023-11-03',
    acceptedDate: '2023-11-02 18:01:14',
    calendarYear: '2023',
    period: 'FY',
    cashAndCashEquivalents: 29965000000,
    shortTermInvestments: 31590000000,
    cashAndShortTermInvestments: 61555000000,
    netReceivables: 60932000000,
    inventory: 6331000000,
    otherCurrentAssets: 14695000000,
    totalCurrentAssets: 143566000000,
    propertyPlantEquipmentNet: 43715000000,
    goodwill: 0,
    intangibleAssets: 0,
    goodwillAndIntangibleAssets: 0,
    longTermInvestments: 100544000000,
    taxAssets: 0,
    otherNonCurrentAssets: 64758000000,
    totalNonCurrentAssets: 209017000000,
    otherAssets: 0,
    totalAssets: 352583000000
  }
]

const mockCashFlow = [
  {
    date: '2023-09-30',
    symbol: 'AAPL',
    reportedCurrency: 'USD',
    cik: '0000320193',
    fillingDate: '2023-11-03',
    acceptedDate: '2023-11-02 18:01:14',
    calendarYear: '2023',
    period: 'FY',
    netIncome: 96995000000,
    depreciationAndAmortization: 11519000000,
    deferredIncomeTax: 0,
    stockBasedCompensation: 10833000000,
    changeInWorkingCapital: -1688000000,
    accountsReceivables: -1688000000,
    inventory: -1618000000,
    accountsPayables: 1889000000,
    otherWorkingCapital: -4062000000,
    otherNonCashItems: 111000000,
    netCashProvidedByOperatingActivities: 110543000000,
    investmentsInPropertyPlantAndEquipment: -10959000000,
    acquisitionsNet: -33000000,
    purchasesOfInvestments: -29513000000,
    salesMaturitiesOfInvestments: 39686000000,
    otherInvestingActivites: -1337000000,
    netCashUsedForInvestingActivites: -2156000000,
    debtRepayment: -11151000000,
    commonStockIssued: 0,
    commonStockRepurchased: -77550000000,
    dividendsPaid: -14841000000,
    otherFinancingActivites: -3063000000,
    netCashUsedProvidedByFinancingActivities: -108488000000,
    effectOfForexChangesOnCash: 0,
    netChangeInCash: -101000000,
    cashAtEndOfPeriod: 29965000000,
    cashAtBeginningOfPeriod: 30066000000,
    operatingCashFlow: 110543000000,
    capitalExpenditure: -10959000000,
    freeCashFlow: 99584000000,
    link: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-23-000106&xbrl_type=v',
    finalLink: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-23-000106&xbrl_type=v'
  }
]

const mockRatios = [
  {
    symbol: 'AAPL',
    date: '2023-09-30',
    calendarYear: '2023',
    period: 'FY',
    currentRatio: 0.98,
    quickRatio: 0.94,
    cashRatio: 0.42,
    daysOfSalesOutstanding: 58.01,
    daysOfInventoryOutstanding: 10.78,
    operatingCycle: 68.79,
    daysOfPayablesOutstanding: 73.09,
    cashConversionCycle: -4.30,
    grossProfitMargin: 0.44,
    operatingProfitMargin: 0.30,
    pretaxProfitMargin: 0.30,
    netProfitMargin: 0.25,
    effectiveTaxRate: 0.15,
    returnOnAssets: 0.28,
    returnOnEquity: 1.72,
    returnOnCapitalEmployed: 0.51,
    netIncomePerEBT: 0.85,
    ebtPerEbit: 1.00,
    ebitPerRevenue: 0.30,
    debtRatio: 0.33,
    debtEquityRatio: 1.97,
    longTermDebtToCapitalization: 0.62,
    totalDebtToCapitalization: 0.66,
    interestCoverage: 29.05,
    cashFlowToDebtRatio: 1.03,
    companyEquityMultiplier: 6.18,
    receivablesTurnover: 6.29,
    payablesTurnover: 4.99,
    inventoryTurnover: 33.86,
    fixedAssetTurnover: 8.77,
    assetTurnover: 1.09,
    operatingCashFlowPerShare: 6.68,
    freeCashFlowPerShare: 6.02,
    cashPerShare: 1.81,
    payoutRatio: 0.15,
    operatingCashFlowSalesRatio: 0.29,
    freeCashFlowOperatingCashFlowRatio: 0.90,
    cashFlowCoverageRatios: 1.03,
    shortTermCoverageRatios: 7.24,
    capitalExpenditureCoverageRatio: 10.09,
    dividendPaidAndCapexCoverageRatio: 4.29,
    priceBookValueRatio: 42.19,
    priceToBookRatio: 42.19,
    priceToSalesRatio: 7.33,
    priceEarningsRatio: 28.97,
    priceToFreeCashFlowsRatio: 31.86,
    priceToOperatingCashFlowsRatio: 28.68,
    priceCashFlowRatio: 28.68,
    priceEarningsToGrowthRatio: 2.90,
    priceSalesRatio: 7.33,
    dividendYield: 0.0051,
    enterpriseValueMultiple: 29.03,
    priceFairValue: 42.19
  }
]

const mockKeyMetrics = [
  {
    symbol: 'AAPL',
    date: '2023-09-30',
    calendarYear: '2023',
    period: 'FY',
    revenuePerShare: 24.22,
    netIncomePerShare: 6.13,
    operatingCashFlowPerShare: 6.98,
    freeCashFlowPerShare: 6.32,
    cashPerShare: 1.89,
    bookValuePerShare: 3.70,
    tangibleBookValuePerShare: 3.70,
    shareholdersEquityPerShare: 3.70,
    interestDebtPerShare: 6.64,
    marketCap: 2917161820000,
    enterpriseValue: 2987066820000,
    peRatio: 30.10,
    priceToSalesRatio: 7.79,
    pocfratio: 27.05,
    pfcfRatio: 29.88,
    pbRatio: 51.04,
    ptbRatio: 51.04,
    evToSales: 8.02,
    enterpriseValueOverEBITDA: 23.91,
    evToOperatingCashFlow: 27.97,
    evToFreeCashFlow: 30.89,
    earningsYield: 0.0332,
    freeCashFlowYield: 0.0335,
    debtToEquity: 1.79,
    debtToAssets: 0.32,
    netDebtToEBITDA: 0.56,
    currentRatio: 0.99,
    interestCoverage: 29.05,
    incomeQuality: 1.14,
    dividendYield: 0.0049,
    payoutRatio: 0.15,
    salesGeneralAndAdministrativeToRevenue: 0.065,
    researchAndDevelopmentToRevenue: 0.078,
    intangiblesToTotalAssets: 0,
    capexToOperatingCashFlow: -0.099,
    capexToRevenue: -0.029,
    capexToDepreciation: -0.951,
    stockBasedCompensationToRevenue: 0.028,
    grahamNumber: 22.93,
    roic: 0.52,
    returnOnTangibleAssets: 0.30,
    grahamNetNet: -84.95,
    workingCapital: -1532000000,
    tangibleAssetValue: 58512000000,
    netCurrentAssetValue: -82788000000,
    investedCapital: 174996000000,
    averageReceivables: 57781500000,
    averagePPayables: 53896500000,
    averageInventory: 6514500000,
    daysSalesOutstanding: 58.96,
    daysPayablesOutstanding: 73.09,
    daysOfInventoryOnHand: 10.72,
    receivablesTurnover: 6.63,
    payablesTurnover: 4.99,
    inventoryTurnover: 34.03,
    roe: 1.72,
    capexPerShare: -0.69
  }
]

const mockPriceHistory = {
  symbol: 'AAPL',
  historical: [
    { date: '2024-01-02', open: 187.15, high: 188.44, low: 183.92, close: 185.64, volume: 82488000 },
    { date: '2024-01-03', open: 184.22, high: 185.88, low: 183.43, close: 184.25, volume: 58414000 },
    { date: '2024-01-04', open: 182.15, high: 182.93, low: 180.42, close: 181.91, volume: 71379000 }
  ]
}

describe('Batch Data Service', () => {
  beforeEach(() => {
    // Clean all nock interceptors before each test
    nock.cleanAll()
  })

  afterEach(() => {
    // Verify all nock interceptors were used
    if (!nock.isDone()) {
      console.warn('Not all nock interceptors were used:', nock.pendingMocks())
    }
    nock.cleanAll()
  })

  describe('fetchTickerBatch - Full Data (17 endpoints)', () => {
    it('should fetch all 17 endpoints successfully', async () => {
      // Mock all 17 FMP endpoints
      nock(FMP_BASE_URL)
        .get(`/api/v3/profile/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockProfile)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/quote/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockQuote)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/income-statement/${TEST_TICKER}`)
        .query({ period: 'annual', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockIncomeStatement)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/income-statement/${TEST_TICKER}`)
        .query({ period: 'quarter', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockIncomeStatement)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/balance-sheet-statement/${TEST_TICKER}`)
        .query({ period: 'annual', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockBalanceSheet)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/balance-sheet-statement/${TEST_TICKER}`)
        .query({ period: 'quarter', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockBalanceSheet)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/cash-flow-statement/${TEST_TICKER}`)
        .query({ period: 'annual', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockCashFlow)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/cash-flow-statement/${TEST_TICKER}`)
        .query({ period: 'quarter', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockCashFlow)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/ratios/${TEST_TICKER}`)
        .query({ period: 'annual', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockRatios)
        
      nock(FMP_BASE_URL)
        .get('/api/v4/key-metrics/AAPL')
        .query({ period: 'annual', limit: '20', apikey: TEST_API_KEY })
        .reply(200, mockKeyMetrics)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/historical-price-full/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockPriceHistory)
        
      // Mock remaining endpoints (can return empty or null)
      nock(FMP_BASE_URL)
        .get('/api/v4/revenue-product-segmentation')
        .query({ symbol: TEST_TICKER, structure: 'flat', apikey: TEST_API_KEY })
        .reply(200, [])
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/historical-price-full/stock_dividend/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, { historical: [] })
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/historical-price-full/stock_split/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, { historical: [] })
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/historical/earning_calendar/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, [])
        
      nock(FMP_BASE_URL)
        .get('/stable/financial-scores')
        .query({ symbol: TEST_TICKER, apikey: TEST_API_KEY })
        .reply(200, [])
        
      nock(FMP_BASE_URL)
        .get('/api/v4/insider-trading')
        .query({ symbol: TEST_TICKER, limit: '100', apikey: TEST_API_KEY })
        .reply(200, [])

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)

      // Verify response structure
      expect(result).toBeDefined()
      expect(result.ticker).toBe(TEST_TICKER)
      expect(result.timestamp).toBeDefined()
      expect(result.fetchDuration).toBeGreaterThan(0)
      expect(result.data).toBeDefined()

      // Verify all 17 endpoints are present
      expect(result.data.profile).toEqual(mockProfile)
      expect(result.data.quote).toEqual(mockQuote)
      expect(result.data.incomeAnnual).toEqual(mockIncomeStatement)
      expect(result.data.incomeQuarter).toEqual(mockIncomeStatement)
      expect(result.data.balanceAnnual).toEqual(mockBalanceSheet)
      expect(result.data.balanceQuarter).toEqual(mockBalanceSheet)
      expect(result.data.cashflowAnnual).toEqual(mockCashFlow)
      expect(result.data.cashflowQuarter).toEqual(mockCashFlow)
      expect(result.data.ratiosAnnual).toEqual(mockRatios)
      expect(result.data.keyMetrics).toEqual(mockKeyMetrics)
      expect(result.data.priceHistory).toEqual(mockPriceHistory)
      expect(result.data.revenueSegments).toEqual([])
      expect(result.data.dividendHistory).toBeDefined()
      expect(result.data.stockSplit).toBeDefined()
      expect(result.data.earningsCalendar).toEqual([])
      expect(result.data.financialScores).toEqual([])
      expect(result.data.insiderTrading).toEqual([])

      // All nock mocks should be consumed
      expect(nock.isDone()).toBe(true)
    }, 15000)

    it('should normalize ticker to uppercase', async () => {
      const lowerTicker = 'aapl'
      
      // Mock with uppercase ticker
      nock(FMP_BASE_URL)
        .get(`/api/v3/profile/AAPL`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockProfile)
      
      // Mock all other endpoints
      for (let i = 0; i < 16; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .reply(200, [])
      }

      const result = await fetchTickerBatch(lowerTicker, TEST_API_KEY)
      expect(result.ticker).toBe('AAPL')
    }, 15000)

    it('should handle individual endpoint failures gracefully', async () => {
      // Profile succeeds
      nock(FMP_BASE_URL)
        .get(`/api/v3/profile/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockProfile)
      
      // Quote fails with 404
      nock(FMP_BASE_URL)
        .get(`/api/v3/quote/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(404, { error: 'Not found' })
      
      // Income statement fails with 500
      nock(FMP_BASE_URL)
        .get(`/api/v3/income-statement/${TEST_TICKER}`)
        .query({ period: 'annual', limit: '20', apikey: TEST_API_KEY })
        .reply(500, { error: 'Internal server error' })
      
      // Mock remaining endpoints
      for (let i = 0; i < 14; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .reply(200, [])
      }

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)

      // Should still return a result
      expect(result).toBeDefined()
      expect(result.ticker).toBe(TEST_TICKER)
      
      // Profile should succeed
      expect(result.data.profile).toEqual(mockProfile)
      
      // Quote and incomeAnnual should be null
      expect(result.data.quote).toBeNull()
      expect(result.data.incomeAnnual).toBeNull()
    }, 15000)

    it('should handle network timeout errors', async () => {
      // Mock profile to timeout (delay > 10s)
      nock(FMP_BASE_URL)
        .get(`/api/v3/profile/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .delay(11000) // Longer than 10s timeout
        .reply(200, mockProfile)
      
      // Mock other endpoints to succeed quickly
      for (let i = 0; i < 16; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .reply(200, [])
      }

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)
      
      // Profile should be null due to timeout
      expect(result.data.profile).toBeNull()
      
      // Other endpoints should succeed
      expect(result.data.quote).toBeDefined()
    }, 20000)

    it('should fetch all endpoints in parallel', async () => {
      const startTime = Date.now()
      
      // Mock all endpoints with 100ms delay each
      for (let i = 0; i < 17; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .delay(100)
          .reply(200, [])
      }

      await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)
      
      const duration = Date.now() - startTime
      
      // If sequential, would take 17 * 100ms = 1700ms
      // In parallel, should take ~100ms (plus overhead)
      // Allow up to 500ms for overhead
      expect(duration).toBeLessThan(500)
    }, 15000)
  })

  describe('fetchTickerPriority - Quick Load (4 endpoints)', () => {
    it('should fetch 4 priority endpoints successfully', async () => {
      // Mock 4 critical endpoints
      nock(FMP_BASE_URL)
        .get(`/api/v3/profile/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockProfile)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/quote/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, mockQuote)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/income-statement/${TEST_TICKER}`)
        .query({ period: 'quarter', limit: '4', apikey: TEST_API_KEY })
        .reply(200, mockIncomeStatement)
        
      nock(FMP_BASE_URL)
        .get(`/api/v3/historical-price-full/${TEST_TICKER}`)
        .query(true) // Match any query params (includes 'from' date)
        .reply(200, mockPriceHistory)

      const result = await fetchTickerPriority(TEST_TICKER, TEST_API_KEY)

      expect(result).toBeDefined()
      expect(result.ticker).toBe(TEST_TICKER)
      expect(result.data.profile).toEqual(mockProfile)
      expect(result.data.quote).toEqual(mockQuote)
      expect(result.data.incomeQuarter).toEqual(mockIncomeStatement)
      expect(result.data.priceHistory).toEqual(mockPriceHistory)

      expect(nock.isDone()).toBe(true)
    }, 15000)

    it('should be faster than full batch', async () => {
      // Mock 4 endpoints with 50ms delay each
      for (let i = 0; i < 4; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .delay(50)
          .reply(200, [])
      }

      const startTime = Date.now()
      await fetchTickerPriority(TEST_TICKER, TEST_API_KEY)
      const duration = Date.now() - startTime

      // Should take ~50ms (parallel) + overhead
      // Allow up to 300ms
      expect(duration).toBeLessThan(300)
    }, 15000)
  })

  describe('Error Handling', () => {
    it('should handle completely failed requests', async () => {
      // Mock all endpoints to fail
      for (let i = 0; i < 17; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .replyWithError('Network error')
      }

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)
      
      expect(result).toBeDefined()
      expect(result.ticker).toBe(TEST_TICKER)
      
      // All endpoints should be null
      Object.values(result.data).forEach(value => {
        expect(value).toBeNull()
      })
    }, 15000)

    it('should handle malformed JSON responses', async () => {
      nock(FMP_BASE_URL)
        .get(`/api/v3/profile/${TEST_TICKER}`)
        .query({ apikey: TEST_API_KEY })
        .reply(200, 'Invalid JSON{{{')
      
      // Mock other endpoints
      for (let i = 0; i < 16; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .reply(200, [])
      }

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)
      
      // Profile should be null due to JSON parse error
      expect(result.data.profile).toBeNull()
      
      // Other endpoints should still work
      expect(result.data.quote).toBeDefined()
    }, 15000)
  })

  describe('Performance Metrics', () => {
    it('should include fetchDuration in result', async () => {
      // Mock all endpoints
      for (let i = 0; i < 17; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .reply(200, [])
      }

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)
      
      expect(result.fetchDuration).toBeDefined()
      expect(typeof result.fetchDuration).toBe('number')
      expect(result.fetchDuration).toBeGreaterThan(0)
      expect(result.fetchDuration).toBeLessThan(15000) // Should be < 15 seconds
    }, 15000)

    it('should include ISO timestamp', async () => {
      // Mock all endpoints
      for (let i = 0; i < 17; i++) {
        nock(FMP_BASE_URL)
          .persist()
          .get(/.*/)
          .query(true)
          .reply(200, [])
      }

      const result = await fetchTickerBatch(TEST_TICKER, TEST_API_KEY)
      
      expect(result.timestamp).toBeDefined()
      expect(() => new Date(result.timestamp)).not.toThrow()
      
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      const diffSeconds = (now - timestamp) / 1000
      
      expect(diffSeconds).toBeLessThan(5) // Should be within 5 seconds
    }, 15000)
  })
})
