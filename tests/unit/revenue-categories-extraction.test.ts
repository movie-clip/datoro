/**
 * Unit test to verify Revenue Categories extraction works correctly
 * Tests both Product and Geographic categories with real data structure
 */

import { describe, it, expect } from 'vitest'
import { getProductCategoriesFromBatch, getGeographicCategoriesFromBatch } from '../../src/services/financials/batchChartService'
import type { BatchData } from '../../src/types/batch.types'

describe('Revenue Categories Extraction', () => {
  // Mock batch data that mirrors FMP API structure
  const mockBatchData: BatchData = {
    ticker: 'AAPL',
    timestamp: '2024-01-01T00:00:00Z',
    fetchDuration: 1000,
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
      ratiosQuarter: [],
      priceHistory: { symbol: 'AAPL', historical: [] },
      // Product categories - FMP structure: array of { "date": { "Category": value } }
      revenueSegments: [
        {
          "2023-09-30": {
            "iPhone": 200000000000,
            "Mac": 30000000000,
            "iPad": 25000000000,
            "Wearables, Home and Accessories": 40000000000,
            "Services": 85000000000
          }
        },
        {
          "2022-09-24": {
            "iPhone": 205000000000,
            "Mac": 40000000000,
            "iPad": 29000000000,
            "Wearables, Home and Accessories": 41000000000,
            "Services": 78000000000
          }
        }
      ],
      // Geographic categories - same structure
      revenueGeographicSegments: [
        {
          "2023-09-30": {
            "Americas": 169000000000,
            "Europe": 95000000000,
            "Greater China": 72000000000,
            "Japan": 25000000000,
            "Rest of Asia Pacific": 29000000000
          }
        },
        {
          "2022-09-24": {
            "Americas": 169000000000,
            "Europe": 101000000000,
            "Greater China": 74000000000,
            "Japan": 25000000000,
            "Rest of Asia Pacific": 24000000000
          }
        }
      ],
      revenueSegmentsBusiness: [],
      dividendHistory: { symbol: 'AAPL', historical: [] },
      stockSplit: { symbol: 'AAPL', historical: [] },
      earningsCalendar: [],
      financialScores: [],
      priceTargetSummary: [],
      priceTargetConsensus: [],
      insiderTrading: [],
      analystEstimates: [],
      upgrades: [],
      shareholderEquityGrowth: { symbol: 'AAPL', growth: [] },
      shareholderEquityQuarterGrowth: { symbol: 'AAPL', growth: [] },
      advancedDcf: []
    }
  } as any

  describe('Product Categories', () => {
    it('should extract product categories from valid batch data', () => {
      const result = getProductCategoriesFromBatch(mockBatchData)

      expect(result).toBeDefined()
      expect(result.segments).toHaveLength(5)
      expect(result.segments).toContain('iPhone')
      expect(result.segments).toContain('Mac')
      expect(result.segments).toContain('iPad')
      expect(result.segments).toContain('Wearables, Home and Accessories')
      expect(result.segments).toContain('Services')

      // Check series data
      expect(Object.keys(result.series)).toHaveLength(5)
      expect(result.series['iPhone']).toBeDefined()
      expect(result.series['iPhone']).toHaveLength(2) // 2 data points
      expect(result.series['iPhone']?.[0]).toHaveLength(2) // [timestamp, value]
    })

    it('should handle null batch data gracefully', () => {
      const result = getProductCategoriesFromBatch(null)

      expect(result).toBeDefined()
      expect(result.segments).toEqual([])
      expect(result.series).toEqual({})
    })

    it('should handle missing revenueSegments field', () => {
      // Use a completely different batch object with different timestamp to avoid cache hit
      const incompleteBatch = {
        ticker: 'TEST2',  // Different ticker
        timestamp: '2024-01-02T00:00:00Z',  // Different timestamp
        fetchDuration: 1000,
        data: {
          ...mockBatchData.data,
          revenueSegments: undefined
        }
      }

      const result = getProductCategoriesFromBatch(incompleteBatch as any)

      expect(result).toBeDefined()
      expect(result.segments).toEqual([])
      expect(result.series).toEqual({})
    })

    it('should handle empty revenueSegments array', () => {
      // Use different ticker and timestamp to avoid cache hit
      const emptyBatch = {
        ticker: 'TEST3',  // Different ticker
        timestamp: '2024-01-03T00:00:00Z',  // Different timestamp
        fetchDuration: 1000,
        data: {
          ...mockBatchData.data,
          revenueSegments: []
        }
      }

      const result = getProductCategoriesFromBatch(emptyBatch as any)

      expect(result).toBeDefined()
      expect(result.segments).toEqual([])
      expect(result.series).toEqual({})
    })
  })

  describe('Geographic Categories', () => {
    it('should extract geographic categories from valid batch data', () => {
      const result = getGeographicCategoriesFromBatch(mockBatchData)

      expect(result).toBeDefined()
      expect(result.segments).toHaveLength(5)
      expect(result.segments).toContain('Americas')
      expect(result.segments).toContain('Europe')
      expect(result.segments).toContain('Greater China')
      expect(result.segments).toContain('Japan')
      expect(result.segments).toContain('Rest of Asia Pacific')

      // Check series data
      expect(Object.keys(result.series)).toHaveLength(5)
      expect(result.series['Americas']).toBeDefined()
      expect(result.series['Americas']).toHaveLength(2) // 2 data points
      expect(result.series['Americas']?.[0]).toHaveLength(2) // [timestamp, value]
    })

    it('should handle null batch data gracefully', () => {
      const result = getGeographicCategoriesFromBatch(null)

      expect(result).toBeDefined()
      expect(result.segments).toEqual([])
      expect(result.series).toEqual({})
    })

    it('should handle missing revenueGeographicSegments field', () => {
      // Use different ticker and timestamp to avoid cache hit
      const incompleteBatch = {
        ticker: 'TEST4',  // Different ticker
        timestamp: '2024-01-04T00:00:00Z',  // Different timestamp
        fetchDuration: 1000,
        data: {
          ...mockBatchData.data,
          revenueGeographicSegments: undefined
        }
      }

      const result = getGeographicCategoriesFromBatch(incompleteBatch as any)

      expect(result).toBeDefined()
      expect(result.segments).toEqual([])
      expect(result.series).toEqual({})
    })
  })

  describe('Data Reactivity', () => {
    it('should return new object references on each call (for Vue reactivity)', () => {
      const result1 = getProductCategoriesFromBatch(mockBatchData)
      const result2 = getProductCategoriesFromBatch(mockBatchData)

      // Should be deep equal but different object references
      expect(result1).toEqual(result2)
      expect(result1).not.toBe(result2) // Different object reference
      expect(result1.segments).not.toBe(result2.segments) // Different array reference
      expect(result1.series).not.toBe(result2.series) // Different object reference
    })
  })
})
