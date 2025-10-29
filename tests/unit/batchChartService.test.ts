import { describe, it, expect } from 'vitest'
import { 
  getRevenueSeriesFromBatch,
  getNetIncomeSeriesFromBatch,
  getEpsSeriesFromBatch,
  getFcfSeriesFromBatch,
  getCashDebtSeriesFromBatch
} from '../../src/services/financials/batchChartService'
import type { BatchData } from '../../src/types'

describe('batchChartService - Quarterly Data', () => {
  const mockBatchData: BatchData = {
    ticker: 'AAPL',
    timestamp: new Date().toISOString(),
    fetchDuration: 1000,
    data: {
      profile: [],
      quote: [],
      incomeAnnual: [
        { date: '2023-09-30', revenue: 383285000000, netIncome: 96995000000, eps: 6.13, period: 'FY' } as any,
        { date: '2022-09-24', revenue: 394328000000, netIncome: 99803000000, eps: 6.15, period: 'FY' } as any
      ],
      incomeQuarter: [
        { date: '2024-06-29', revenue: 85777000000, netIncome: 21448000000, eps: 1.40, period: 'Q3' } as any,
        { date: '2024-03-30', revenue: 90753000000, netIncome: 23636000000, eps: 1.53, period: 'Q2' } as any,
        { date: '2023-12-30', revenue: 119575000000, netIncome: 33916000000, eps: 2.18, period: 'Q1' } as any,
        { date: '2023-09-30', revenue: 89498000000, netIncome: 22956000000, eps: 1.46, period: 'Q4' } as any
      ],
      balanceAnnual: [],
      balanceQuarter: [
        { date: '2024-06-29', cashAndCashEquivalents: 25565000000, totalDebt: 101304000000 } as any,
        { date: '2024-03-30', cashAndCashEquivalents: 32695000000, totalDebt: 104590000000 } as any,
        { date: '2023-12-30', cashAndCashEquivalents: 40760000000, totalDebt: 108040000000 } as any,
        { date: '2023-09-30', cashAndCashEquivalents: 29965000000, totalDebt: 123930000000 } as any
      ],
      cashflowAnnual: [],
      cashflowQuarter: [
        { date: '2024-06-29', freeCashFlow: 29264000000, stockBasedCompensation: 2934000000 } as any,
        { date: '2024-03-30', freeCashFlow: 22566000000, stockBasedCompensation: 2823000000 } as any,
        { date: '2023-12-30', freeCashFlow: 38703000000, stockBasedCompensation: 3425000000 } as any,
        { date: '2023-09-30', freeCashFlow: 22208000000, stockBasedCompensation: 2778000000 } as any
      ],
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
      insiderTrading: []
    }
  }

  describe('getRevenueSeriesFromBatch', () => {
    it('should return annual revenue data when period is annual', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData, 'annual')
      
      expect(result).toHaveLength(2)
      expect(result[0][1]).toBe(383285000000)
      expect(result[1][1]).toBe(394328000000)
    })

    it('should return quarterly revenue data when period is quarterly', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData, 'quarterly')
      
      expect(result).toHaveLength(4)
      expect(result[0][1]).toBe(85777000000)
      expect(result[1][1]).toBe(90753000000)
      expect(result[2][1]).toBe(119575000000)
      expect(result[3][1]).toBe(89498000000)
    })

    it('should return timestamps as numbers', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData, 'quarterly')
      
      expect(typeof result[0][0]).toBe('number')
      expect(result[0][0]).toBeGreaterThan(0)
    })
  })

  describe('getNetIncomeSeriesFromBatch', () => {
    it('should return annual net income when period is annual', () => {
      const result = getNetIncomeSeriesFromBatch(mockBatchData, 'annual')
      
      expect(result).toHaveLength(2)
      expect(result[0][1]).toBe(96995000000)
      expect(result[1][1]).toBe(99803000000)
    })

    it('should return quarterly net income when period is quarterly', () => {
      const result = getNetIncomeSeriesFromBatch(mockBatchData, 'quarterly')
      
      expect(result).toHaveLength(4)
      expect(result[0][1]).toBe(21448000000)
      expect(result[1][1]).toBe(23636000000)
    })
  })

  describe('getEpsSeriesFromBatch', () => {
    it('should return annual EPS when period is annual', () => {
      const result = getEpsSeriesFromBatch(mockBatchData, 'annual')
      
      expect(result).toHaveLength(2)
      expect(result[0][1]).toBe(6.13)
      expect(result[1][1]).toBe(6.15)
    })

    it('should return quarterly EPS when period is quarterly', () => {
      const result = getEpsSeriesFromBatch(mockBatchData, 'quarterly')
      
      expect(result).toHaveLength(4)
      expect(result[0][1]).toBe(1.40)
      expect(result[1][1]).toBe(1.53)
      expect(result[2][1]).toBe(2.18)
      expect(result[3][1]).toBe(1.46)
    })
  })

  describe('getFcfSeriesFromBatch', () => {
    it('should return quarterly FCF data points', () => {
      const result = getFcfSeriesFromBatch(mockBatchData, 'quarterly')
      
      expect(result).toHaveLength(4)
      expect(result[0].fcf).toBe(29264000000)
      expect(result[0].sbc).toBe(2934000000)
      expect(typeof result[0].date).toBe('number')
    })

    it('should handle missing data gracefully', () => {
      const emptyBatch = { ...mockBatchData, data: { ...mockBatchData.data, cashflowQuarter: [] } }
      const result = getFcfSeriesFromBatch(emptyBatch, 'quarterly')
      
      expect(result).toEqual([])
    })
  })

  describe('getCashDebtSeriesFromBatch', () => {
    it('should return quarterly cash and debt data', () => {
      const result = getCashDebtSeriesFromBatch(mockBatchData, 'quarterly')
      
      expect(result).toHaveLength(4)
      expect(result[0].cash).toBe(25565000000)
      expect(result[0].debt).toBe(101304000000)
      expect(typeof result[0].date).toBe('number')
    })

    it('should return annual cash and debt when period is annual', () => {
      const batchWithAnnual = {
        ...mockBatchData,
        data: {
          ...mockBatchData.data,
          balanceAnnual: [
            { date: '2023-09-30', cashAndCashEquivalents: 29965000000, totalDebt: 123930000000 } as any
          ]
        }
      }
      
      const result = getCashDebtSeriesFromBatch(batchWithAnnual, 'annual')
      
      expect(result).toHaveLength(1)
      expect(result[0].cash).toBe(29965000000)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null batch data', () => {
      expect(getRevenueSeriesFromBatch(null, 'quarterly')).toEqual([])
      expect(getNetIncomeSeriesFromBatch(null, 'annual')).toEqual([])
      expect(getEpsSeriesFromBatch(null, 'quarterly')).toEqual([])
    })

    it('should handle empty quarterly arrays', () => {
      const emptyBatch = {
        ...mockBatchData,
        data: {
          ...mockBatchData.data,
          incomeQuarter: []
        }
      }
      
      expect(getRevenueSeriesFromBatch(emptyBatch, 'quarterly')).toEqual([])
    })

    it('should default to annual when period is not specified', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData)
      
      expect(result).toHaveLength(2)
      expect(result[0][1]).toBe(383285000000) // Annual data
    })
  })
})
