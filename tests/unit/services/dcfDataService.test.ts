import { describe, it, expect } from 'vitest'
import { getDcfDataFromBatch, validateDcfData, type CompanyDataForDcf } from '../../../src/services/dcf/dcfDataService'
import type { BatchData } from '../../../src/types'

// Helper to create mock batch data
function createMockBatchData(overrides?: Partial<BatchData>): BatchData {
  return {
    ticker: 'AAPL',
    timestamp: '2025-01-01T00:00:00.000Z',
    fetchDuration: 1000,
    data: {
      profile: [{
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        image: 'https://example.com/aapl.png',
        price: 150,
        beta: 1.2,
        volAvg: 50000000,
        mktCap: 2500000000000,
        lastDiv: 0.92,
        range: '120-180',
        changes: 1.5,
        currency: 'USD',
        cik: '0000320193',
        isin: 'US0378331005',
        cusip: '037833100',
        exchange: 'NASDAQ',
        exchangeShortName: 'NASDAQ',
        industry: 'Consumer Electronics',
        website: 'https://www.apple.com',
        description: 'Apple Inc. designs, manufactures, and markets smartphones',
        ceo: 'Tim Cook',
        sector: 'Technology',
        country: 'US',
        fullTimeEmployees: '164000',
        phone: '14089961010',
        address: 'One Apple Park Way',
        city: 'Cupertino',
        state: 'CA',
        zip: '95014',
        dcfDiff: 10,
        dcf: 160,
        ipoDate: '1980-12-12',
        defaultImage: false,
        isEtf: false,
        isActivelyTrading: true,
        isAdr: false,
        isFund: false
      }],
      quote: [{
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150,
        changesPercentage: 1.5,
        change: 2.2,
        dayLow: 148,
        dayHigh: 152,
        yearHigh: 180,
        yearLow: 120,
        marketCap: 2500000000000,
        priceAvg50: 145,
        priceAvg200: 140,
        exchange: 'NASDAQ',
        volume: 50000000,
        avgVolume: 48000000,
        open: 149,
        previousClose: 147.8,
        eps: 6.05,
        pe: 24.79,
        earningsAnnouncement: '2025-01-31T16:30:00.000+00:00',
        sharesOutstanding: 15204000000,
        timestamp: 1704067200
      }],
      cashflowAnnual: [
        {
          date: '2024-09-30',
          symbol: 'AAPL',
          reportedCurrency: 'USD',
          cik: '0000320193',
          fillingDate: '2024-11-01',
          acceptedDate: '2024-11-01 16:00:00',
          calendarYear: '2024',
          period: 'FY',
          netIncome: 93736000000,
          depreciationAndAmortization: 11519000000,
          deferredIncomeTax: 0,
          stockBasedCompensation: 10833000000,
          changeInWorkingCapital: -5590000000,
          accountsReceivables: -4059000000,
          inventory: 1318000000,
          accountsPayables: 6831000000,
          otherWorkingCapital: -9680000000,
          otherNonCashItems: 0,
          netCashProvidedByOperatingActivities: 110543000000,
          investmentsInPropertyPlantAndEquipment: -9447000000,
          acquisitionsNet: 0,
          purchasesOfInvestments: -46259000000,
          salesMaturitiesOfInvestments: 64073000000,
          otherInvestingActivites: 0,
          netCashUsedForInvestingActivites: 8367000000,
          debtRepayment: -11103000000,
          commonStockIssued: 0,
          commonStockRepurchased: -94949000000,
          dividendsPaid: -15025000000,
          otherFinancingActivites: 0,
          netCashUsedProvidedByFinancingActivities: -121077000000,
          effectOfForexChangesOnCash: 0,
          netChangeInCash: -2167000000,
          cashAtEndOfPeriod: 26077000000,
          cashAtBeginningOfPeriod: 28244000000,
          operatingCashFlow: 110543000000,
          capitalExpenditure: -9447000000,
          freeCashFlow: 101096000000,
          link: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-24-000123&xbrl_type=v',
          finalLink: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-24-000123&xbrl_type=v'
        },
        {
          date: '2023-09-30',
          symbol: 'AAPL',
          freeCashFlow: 99584000000,
          reportedCurrency: 'USD',
          cik: '0000320193',
          fillingDate: '2023-11-03',
          acceptedDate: '2023-11-03 16:00:00',
          calendarYear: '2023',
          period: 'FY',
          netIncome: 96995000000,
          depreciationAndAmortization: 11519000000,
          stockBasedCompensation: 10833000000,
          changeInWorkingCapital: 0,
          accountsReceivables: 0,
          inventory: 0,
          accountsPayables: 0,
          otherWorkingCapital: 0,
          otherNonCashItems: 0,
          netCashProvidedByOperatingActivities: 110543000000,
          investmentsInPropertyPlantAndEquipment: -10959000000,
          acquisitionsNet: 0,
          purchasesOfInvestments: 0,
          salesMaturitiesOfInvestments: 0,
          otherInvestingActivites: 0,
          netCashUsedForInvestingActivites: 0,
          debtRepayment: 0,
          commonStockIssued: 0,
          commonStockRepurchased: 0,
          dividendsPaid: 0,
          otherFinancingActivites: 0,
          netCashUsedProvidedByFinancingActivities: 0,
          effectOfForexChangesOnCash: 0,
          netChangeInCash: 0,
          cashAtEndOfPeriod: 0,
          cashAtBeginningOfPeriod: 0,
          operatingCashFlow: 110543000000,
          capitalExpenditure: -10959000000,
          link: '',
          finalLink: ''
        },
        {
          date: '2022-09-30',
          symbol: 'AAPL',
          freeCashFlow: 111443000000,
          reportedCurrency: 'USD',
          cik: '0000320193',
          fillingDate: '2022-10-28',
          acceptedDate: '2022-10-28 16:00:00',
          calendarYear: '2022',
          period: 'FY',
          netIncome: 99803000000,
          depreciationAndAmortization: 11104000000,
          stockBasedCompensation: 9038000000,
          changeInWorkingCapital: 0,
          accountsReceivables: 0,
          inventory: 0,
          accountsPayables: 0,
          otherWorkingCapital: 0,
          otherNonCashItems: 0,
          netCashProvidedByOperatingActivities: 122151000000,
          investmentsInPropertyPlantAndEquipment: -10708000000,
          acquisitionsNet: 0,
          purchasesOfInvestments: 0,
          salesMaturitiesOfInvestments: 0,
          otherInvestingActivites: 0,
          netCashUsedForInvestingActivites: 0,
          debtRepayment: 0,
          commonStockIssued: 0,
          commonStockRepurchased: 0,
          dividendsPaid: 0,
          otherFinancingActivites: 0,
          netCashUsedProvidedByFinancingActivities: 0,
          effectOfForexChangesOnCash: 0,
          netChangeInCash: 0,
          cashAtEndOfPeriod: 0,
          cashAtBeginningOfPeriod: 0,
          operatingCashFlow: 122151000000,
          capitalExpenditure: -10708000000,
          link: '',
          finalLink: ''
        },
        {
          date: '2021-09-25',
          symbol: 'AAPL',
          freeCashFlow: 92953000000,
          reportedCurrency: 'USD',
          cik: '0000320193',
          fillingDate: '2021-10-29',
          acceptedDate: '2021-10-29 16:00:00',
          calendarYear: '2021',
          period: 'FY',
          netIncome: 94680000000,
          depreciationAndAmortization: 11284000000,
          stockBasedCompensation: 7906000000,
          changeInWorkingCapital: 0,
          accountsReceivables: 0,
          inventory: 0,
          accountsPayables: 0,
          otherWorkingCapital: 0,
          otherNonCashItems: 0,
          netCashProvidedByOperatingActivities: 104038000000,
          investmentsInPropertyPlantAndEquipment: -11085000000,
          acquisitionsNet: 0,
          purchasesOfInvestments: 0,
          salesMaturitiesOfInvestments: 0,
          otherInvestingActivites: 0,
          netCashUsedForInvestingActivites: 0,
          debtRepayment: 0,
          commonStockIssued: 0,
          commonStockRepurchased: 0,
          dividendsPaid: 0,
          otherFinancingActivites: 0,
          netCashUsedProvidedByFinancingActivities: 0,
          effectOfForexChangesOnCash: 0,
          netChangeInCash: 0,
          cashAtEndOfPeriod: 0,
          cashAtBeginningOfPeriod: 0,
          operatingCashFlow: 104038000000,
          capitalExpenditure: -11085000000,
          link: '',
          finalLink: ''
        }
      ],
      balanceAnnual: [{
        date: '2024-09-30',
        symbol: 'AAPL',
        reportedCurrency: 'USD',
        cik: '0000320193',
        fillingDate: '2024-11-01',
        acceptedDate: '2024-11-01 16:00:00',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 29943000000,
        shortTermInvestments: 35228000000,
        cashAndShortTermInvestments: 65171000000,
        netReceivables: 65881000000,
        inventory: 6511000000,
        otherCurrentAssets: 14287000000,
        totalCurrentAssets: 151850000000,
        propertyPlantEquipmentNet: 43715000000,
        goodwill: 0,
        intangibleAssets: 0,
        goodwillAndIntangibleAssets: 0,
        longTermInvestments: 91478000000,
        taxAssets: 0,
        otherNonCurrentAssets: 78822000000,
        totalNonCurrentAssets: 213915000000,
        otherAssets: 0,
        totalAssets: 365765000000,
        accountPayables: 68960000000,
        shortTermDebt: 10912000000,
        taxPayables: 0,
        deferredRevenue: 8249000000,
        otherCurrentLiabilities: 71076000000,
        totalCurrentLiabilities: 159197000000,
        longTermDebt: 85750000000,
        deferredRevenueNonCurrent: 0,
        deferredTaxLiabilitiesNonCurrent: 0,
        otherNonCurrentLiabilities: 35380000000,
        totalNonCurrentLiabilities: 121130000000,
        otherLiabilities: 0,
        capitalLeaseObligations: 0,
        totalLiabilities: 280327000000,
        preferredStock: 0,
        commonStock: 82200000000,
        retainedEarnings: 18471000000,
        accumulatedOtherComprehensiveIncomeLoss: -15233000000,
        othertotalStockholdersEquity: 0,
        totalStockholdersEquity: 85438000000,
        totalEquity: 85438000000,
        totalLiabilitiesAndStockholdersEquity: 365765000000,
        minorityInterest: 0,
        totalLiabilitiesAndTotalEquity: 365765000000,
        totalInvestments: 126706000000,
        totalDebt: 96662000000,
        netDebt: 66719000000,
        link: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-24-000123&xbrl_type=v',
        finalLink: 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-24-000123&xbrl_type=v'
      }],
      incomeAnnual: [],
      incomeQuarter: [],
      balanceQuarter: [],
      cashflowQuarter: [],
      keyMetrics: [],
      ratiosAnnual: [],
      priceHistory: { symbol: 'AAPL', historical: [] },
      revenueSegments: [],
      dividendHistory: { symbol: 'AAPL', historical: [] },
      stockSplit: { symbol: 'AAPL', historical: [] },
      earningsCalendar: [],
      financialScores: [],
      priceTargetSummary: [],
      priceTargetConsensus: [],
      insiderTrading: [],
      advancedDcf: [],
      stockNews: [],
      stockPeers: [],
      earningsSurprises: []
    },
    ...overrides
  } as BatchData
}

describe('dcfDataService', () => {
  describe('getDcfDataFromBatch', () => {
    it('should extract DCF data from valid batch data', () => {
      const batchData = createMockBatchData()
      const result = getDcfDataFromBatch(batchData)

      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        currentPrice: 150,
        eps: 6.05,
        sharesOutstanding: 15204000000,
        currentFcf: 101096000000,
        cashAndEquivalents: 29943000000,
        totalDebt: 96662000000
      })
    })

    it('should calculate 3-year FCF CAGR correctly', () => {
      const batchData = createMockBatchData()
      const result = getDcfDataFromBatch(batchData)

      expect(result).not.toBeNull()
      // CAGR from 92953M (2021) to 101096M (2024) over 3 years
      // (101096 / 92953)^(1/3) - 1 = 0.028 = 2.8%
      expect(result!.historicalGrowthRate).toBeCloseTo(2.8, 1)
    })

    it('should include FCF history', () => {
      const batchData = createMockBatchData()
      const result = getDcfDataFromBatch(batchData)

      expect(result).not.toBeNull()
      expect(result!.fcfHistory).toHaveLength(4)
      expect(result!.fcfHistory[0]).toMatchObject({
        year: 2024,
        fcf: 101096000000
      })
    })

    it('should handle null batch data', () => {
      const result = getDcfDataFromBatch(null)
      expect(result).toBeNull()
    })

    it('should handle missing profile data', () => {
      const batchData = createMockBatchData()
      batchData.data.profile = []
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.companyName).toBe('Unknown Company')
      expect(result!.ticker).toBe('AAPL') // Falls back to batch ticker
      expect(result!.image).toBeNull()
    })

    it('should handle missing quote data', () => {
      const batchData = createMockBatchData()
      batchData.data.quote = []
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.currentPrice).toBe(0)
      expect(result!.eps).toBe(0)
    })

    it('should handle missing cashflow data', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual = []
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.currentFcf).toBe(0)
      expect(result!.fcfHistory).toHaveLength(0)
    })

    it('should handle missing balance sheet data', () => {
      const batchData = createMockBatchData()
      batchData.data.balanceAnnual = []
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.cashAndEquivalents).toBe(0)
      expect(result!.totalDebt).toBe(0)
    })

    it('should fallback to default growth rate if insufficient history', () => {
      const batchData = createMockBatchData()
      // Only 2 years of data (need 4 for 3-year CAGR)
      batchData.data.cashflowAnnual = batchData.data.cashflowAnnual!.slice(0, 2)
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.historicalGrowthRate).toBe(10) // Default
    })

    it('should extract shares from quote.sharesOutstanding', () => {
      const batchData = createMockBatchData()
      const result = getDcfDataFromBatch(batchData)

      expect(result).not.toBeNull()
      expect(result!.sharesOutstanding).toBe(15204000000)
    })

    it('should fallback to cashflow for shares if quote missing', () => {
      const batchData = createMockBatchData()
      batchData.data.quote = []
      batchData.data.cashflowAnnual![0]!.weightedAverageShsOut = 15000000000
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.sharesOutstanding).toBe(15000000000)
    })

    it('should use diluted shares as final fallback', () => {
      const batchData = createMockBatchData()
      batchData.data.quote = []
      delete batchData.data.cashflowAnnual![0]!.weightedAverageShsOut
      batchData.data.cashflowAnnual![0]!.weightedAverageShsOutDil = 15500000000
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.sharesOutstanding).toBe(15500000000)
    })

    it('should handle negative FCF growth', () => {
      const batchData = createMockBatchData()
      // Make oldest FCF higher than current (negative growth)
      batchData.data.cashflowAnnual![3]!.freeCashFlow = 120000000000
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.historicalGrowthRate).toBeLessThan(0)
    })

    it('should round growth rate to 1 decimal', () => {
      const batchData = createMockBatchData()
      const result = getDcfDataFromBatch(batchData)

      expect(result).not.toBeNull()
      expect(result!.historicalGrowthRate).toBe(
        Math.round(result!.historicalGrowthRate * 10) / 10
      )
    })

    it('should handle error in extraction gracefully', () => {
      const batchData = createMockBatchData()
      // Corrupt data to trigger error
      ;(batchData.data as any) = null
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).toBeNull()
    })

    it('should warn about suspicious shares outstanding', () => {
      const batchData = createMockBatchData()
      batchData.data.quote![0]!.sharesOutstanding = 500 // Too low
      
      const result = getDcfDataFromBatch(batchData)
      
      // Should still return data, but with warning logged
      expect(result).not.toBeNull()
      expect(result!.sharesOutstanding).toBe(500)
    })

    it('should preserve timestamp from batch data', () => {
      const batchData = createMockBatchData()
      batchData.timestamp = '2025-06-15T12:30:00.000Z'
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.lastUpdated).toBe('2025-06-15T12:30:00.000Z')
    })

    it('should handle zero or negative FCF values', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual![0]!.freeCashFlow = -5000000000 // Negative FCF
      
      const result = getDcfDataFromBatch(batchData)
      
      expect(result).not.toBeNull()
      expect(result!.currentFcf).toBe(-5000000000)
    })
  })

  describe('validateDcfData', () => {
    it('should validate complete batch data as valid', () => {
      const batchData = createMockBatchData()
      const result = validateDcfData(batchData)

      expect(result.valid).toBe(true)
      expect(result.missingFields).toHaveLength(0)
    })

    it('should reject null batch data', () => {
      const result = validateDcfData(null)

      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Batch data')
      expect(result.details.error).toBe('No batch data available')
    })

    it('should detect missing cash flow statements', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual = []
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Cash flow statements')
      expect(result.details.cashflow).toBe('No cash flow data')
    })

    it('should detect zero FCF', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual![0]!.freeCashFlow = 0
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Free cash flow values')
      expect(result.details.fcf).toBe('FCF is zero or missing')
    })

    it('should detect missing quote data', () => {
      const batchData = createMockBatchData()
      batchData.data.quote = []
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Stock quote')
      expect(result.details.quote).toBe('No quote data')
    })

    it('should detect zero or negative stock price', () => {
      const batchData = createMockBatchData()
      batchData.data.quote![0]!.price = 0
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Current stock price')
      expect(result.details.price).toBe('Price is zero or missing')
    })

    it('should detect missing shares outstanding', () => {
      const batchData = createMockBatchData()
      batchData.data.quote![0]!.sharesOutstanding = 0
      delete batchData.data.cashflowAnnual![0]!.weightedAverageShsOut
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Shares outstanding')
      expect(result.details.shares).toContain('No shares data')
    })

    it('should accept shares from cashflow if quote missing', () => {
      const batchData = createMockBatchData()
      batchData.data.quote![0]!.sharesOutstanding = 0
      batchData.data.cashflowAnnual![0]!.weightedAverageShsOut = 15000000000
      
      const result = validateDcfData(batchData)
      
      // Should be valid because cashflow has shares
      expect(result.valid).toBe(true)
    })

    it('should detect missing balance sheet', () => {
      const batchData = createMockBatchData()
      batchData.data.balanceAnnual = []
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('Balance sheet')
      expect(result.details.balance).toBe('No balance sheet data')
    })

    it('should accumulate multiple missing fields', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual = []
      batchData.data.quote = []
      batchData.data.balanceAnnual = []
      
      const result = validateDcfData(batchData)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields.length).toBeGreaterThanOrEqual(3)
      expect(result.missingFields).toContain('Cash flow statements')
      expect(result.missingFields).toContain('Stock quote')
      expect(result.missingFields).toContain('Balance sheet')
    })

    it('should provide detailed error information', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual![0]!.freeCashFlow = 0
      batchData.data.quote![0]!.price = 0
      
      const result = validateDcfData(batchData)
      
      expect(result.details).toHaveProperty('fcf')
      expect(result.details).toHaveProperty('price')
      expect(Object.keys(result.details).length).toBeGreaterThan(0)
    })

    it('should handle negative FCF as valid (unprofitable but has data)', () => {
      const batchData = createMockBatchData()
      batchData.data.cashflowAnnual![0]!.freeCashFlow = -1000000000
      
      const result = validateDcfData(batchData)
      
      // Negative FCF is still valid data (company burns cash)
      expect(result.valid).toBe(true)
    })

    it('should return empty missingFields for valid data', () => {
      const batchData = createMockBatchData()
      const result = validateDcfData(batchData)

      expect(result.missingFields).toEqual([])
    })
  })
})
