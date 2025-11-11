import { describe, it, expect, beforeEach } from 'vitest'
import { getProductCategoriesFromBatch } from '../../src/services/financials/batchChartService'
import type { BatchData } from '../../src/types'

describe('Memoization Reactivity Fix', () => {
  let mockBatchData: BatchData

  beforeEach(() => {
    // Create mock batch data with product revenue segments
    mockBatchData = {
      ticker: 'AAPL',
      timestamp: '2025-01-01T00:00:00Z',
      fetchDuration: 100,
      data: {
        profile: [],
        quote: [],
        incomeAnnual: [],
        incomeQuarter: [],
        balanceAnnual: [],
        balanceQuarter: [],
        cashflowAnnual: [],
        cashflowQuarter: [],
        keyMetrics: [],
        ratiosAnnual: [],
        priceHistory: { symbol: 'AAPL', historical: [] },
        revenueSegments: [
          {
            '2024-09-27': {
              'iPhone': 200000000000,
              'Mac': 30000000000,
              'iPad': 25000000000
            }
          },
          {
            '2024-06-28': {
              'iPhone': 180000000000,
              'Mac': 28000000000,
              'iPad': 22000000000
            }
          }
        ],
        dividendHistory: { symbol: 'AAPL', historical: [] },
        stockSplit: { symbol: 'AAPL', historical: [] },
        earningsCalendar: [],
        financialScores: [],
        priceTargetSummary: [],
        priceTargetConsensus: [],
        insiderTrading: [],
        revenueGeographicSegments: []
      }
    }
  })

  it('should return new object reference on each call to force Vue reactivity', () => {
    // Call the memoized function twice with the same batchData
    const result1 = getProductCategoriesFromBatch(mockBatchData)
    const result2 = getProductCategoriesFromBatch(mockBatchData)

    // The content should be the same
    expect(result1.segments).toEqual(result2.segments)
    expect(Object.keys(result1.series)).toEqual(Object.keys(result2.series))

    // But the object references should be DIFFERENT (deep clone)
    // This is critical for Vue reactivity to detect changes
    expect(result1).not.toBe(result2)
    expect(result1.segments).not.toBe(result2.segments)
    expect(result1.series).not.toBe(result2.series)

    // Check that the series arrays are also different references
    if (result1.series.iPhone && result2.series.iPhone) {
      expect(result1.series.iPhone).not.toBe(result2.series.iPhone)
      // But the content should be the same
      expect(result1.series.iPhone).toEqual(result2.series.iPhone)
    }
  })

  it('should parse product segments correctly', () => {
    const result = getProductCategoriesFromBatch(mockBatchData)

    expect(result.segments).toContain('iPad')
    expect(result.segments).toContain('iPhone')
    expect(result.segments).toContain('Mac')
    expect(result.segments.length).toBe(3)

    // Check series data
    expect(result.series.iPhone).toBeDefined()
    expect(result.series.iPhone?.length).toBe(2)
    // Data is sorted by date, so [0] is oldest (2024-06-28), [1] is newest (2024-09-27)
    expect(result.series.iPhone?.[1]?.[1]).toBe(200000000000) // Latest value (most recent date)
  })

  it('should handle null batchData', () => {
    const result = getProductCategoriesFromBatch(null)
    expect(result.segments).toEqual([])
    expect(result.series).toEqual({})
  })

  it('should handle empty revenueSegments', () => {
    const emptyBatchData = {
      ...mockBatchData,
      data: {
        ...mockBatchData.data,
        revenueSegments: [] as any[]
      }
    }
    const result = getProductCategoriesFromBatch(emptyBatchData as any)
    expect(result.segments).toEqual([])
    expect(result.series).toEqual({})
  })
})
