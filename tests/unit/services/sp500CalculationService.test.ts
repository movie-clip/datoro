// tests/unit/services/sp500CalculationService.test.ts
// Unit tests for S&P 500 calculation service

import { describe, it, expect } from 'vitest'
import {
  convertToChartFormat,
  calculatePerformance,
  calculateDataZoomIndices,
  getDataZoomDetails,
  formatDate,
  validatePriceData,
  isChronological,
  type PriceDataPoint
} from '../../../src/services/market/sp500CalculationService'

describe('sp500CalculationService', () => {
  // Sample test data - mimics FMP API response
  const sampleFMPData = [
    { date: '2020-01-01', close: 3000, open: 2990, high: 3010, low: 2985, volume: 1000000 },
    { date: '2020-06-01', close: 3200, open: 3190, high: 3220, low: 3180, volume: 1100000 },
    { date: '2021-01-01', close: 3600, open: 3590, high: 3620, low: 3580, volume: 1200000 },
    { date: '2021-06-01', close: 4000, open: 3990, high: 4020, low: 3980, volume: 1300000 },
    { date: '2022-01-01', close: 4500, open: 4490, high: 4520, low: 4480, volume: 1400000 }
  ]

  const samplePriceData: PriceDataPoint[] = [
    { timestamp: new Date('2020-01-01').getTime(), price: 3000 },
    { timestamp: new Date('2020-06-01').getTime(), price: 3200 },
    { timestamp: new Date('2021-01-01').getTime(), price: 3600 },
    { timestamp: new Date('2021-06-01').getTime(), price: 4000 },
    { timestamp: new Date('2022-01-01').getTime(), price: 4500 }
  ]

  describe('convertToChartFormat', () => {
    it('should convert FMP data to chart format', () => {
      const result = convertToChartFormat(sampleFMPData)
      
      expect(result).toHaveLength(5)
      expect(result[0]).toMatchObject({
        price: 3000
      })
      expect(result[0]!.timestamp).toBe(new Date('2020-01-01').getTime())
    })

    it('should handle empty array', () => {
      const result = convertToChartFormat([])
      expect(result).toEqual([])
    })

    it('should preserve chronological order', () => {
      const result = convertToChartFormat(sampleFMPData)
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.timestamp).toBeGreaterThanOrEqual(result[i - 1]!.timestamp)
      }
    })
  })

  describe('calculatePerformance', () => {
    it('should calculate positive performance correctly', () => {
      // From 3000 to 4500 = 50% gain
      const result = calculatePerformance(samplePriceData, 0, 4)
      
      expect(result).toBeTruthy()
      expect(result?.performance).toBeCloseTo(50, 2)
      expect(result?.startPrice).toBe(3000)
      expect(result?.endPrice).toBe(4500)
    })

    it('should calculate negative performance correctly', () => {
      // From 4500 to 3000 = -33.33% loss
      const result = calculatePerformance(samplePriceData, 4, 0)
      
      expect(result).toBeTruthy()
      expect(result?.performance).toBeCloseTo(-33.33, 2)
    })

    it('should return null for empty data', () => {
      const result = calculatePerformance([], 0, 0)
      expect(result).toBeNull()
    })

    it('should return null for out-of-bounds indices', () => {
      const result1 = calculatePerformance(samplePriceData, -1, 2)
      const result2 = calculatePerformance(samplePriceData, 0, 10)
      
      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })

    it('should handle same start and end index', () => {
      const result = calculatePerformance(samplePriceData, 2, 2)
      
      expect(result).toBeTruthy()
      expect(result?.performance).toBe(0)
    })

    it('should include correct dates in result', () => {
      const result = calculatePerformance(samplePriceData, 1, 3)
      
      expect(result?.startDate).toBe('2020-06-01')
      expect(result?.endDate).toBe('2021-06-01')
      expect(result?.startPrice).toBe(3200)
      expect(result?.endPrice).toBe(4000)
    })
  })

  describe('calculateDataZoomIndices', () => {
    it('should calculate indices for full range', () => {
      const result = calculateDataZoomIndices(0, 100, 1000)
      
      expect(result.startIdx).toBe(0)
      expect(result.endIdx).toBe(999)
    })

    it('should calculate indices for partial range', () => {
      const result = calculateDataZoomIndices(25, 75, 1000)
      
      expect(result.startIdx).toBe(250)
      expect(result.endIdx).toBe(749)
    })

    it('should handle edge cases', () => {
      const result = calculateDataZoomIndices(0, 1, 1000)
      
      expect(result.startIdx).toBe(0)
      expect(result.endIdx).toBe(9)
    })

    it('should clamp indices to valid range', () => {
      const result = calculateDataZoomIndices(0, 100, 10)
      
      expect(result.startIdx).toBe(0)
      expect(result.endIdx).toBe(9)
    })

    it('should clamp negative and out-of-range values', () => {
      // The service clamps values rather than returning null
      const result1 = calculateDataZoomIndices(-10, 100, 1000) // Clamps -10 to 0
      const result2 = calculateDataZoomIndices(0, 150, 1000) // Clamps 150 to 100
      const result3 = calculateDataZoomIndices(75, 25, 1000) // Inverted range (allowed)
      
      expect(result1?.startIdx).toBe(0) // Clamped from negative
      expect(result2?.endIdx).toBe(999) // Clamped from >100
      expect(result3?.startIdx).toBeGreaterThan(result3?.endIdx!) // Inverted allowed (for negative %)
    })
  })

  describe('getDataZoomDetails', () => {
    it('should return complete details for valid range', () => {
      const result = getDataZoomDetails(samplePriceData, 0, 100)
      
      expect(result).toBeTruthy()
      expect(result?.startIdx).toBe(0)
      expect(result?.endIdx).toBe(4)
      expect(result?.startDate).toBe('2020-01-01')
      expect(result?.endDate).toBe('2022-01-01')
      expect(result?.startPrice).toBe(3000)
      expect(result?.endPrice).toBe(4500)
    })

    it('should clamp out-of-range percentages', () => {
      // When zoom range is >100, it clamps to max index
      const result = getDataZoomDetails(samplePriceData, 150, 200)
      expect(result).toBeTruthy()
      expect(result?.startIdx).toBe(4) // Clamped to last index
      expect(result?.endIdx).toBe(4)
    })

    it('should handle middle range correctly', () => {
      const result = getDataZoomDetails(samplePriceData, 40, 80)
      
      expect(result).toBeTruthy()
      // With 5 data points, 40% = idx 2, 80% = idx 3
      expect(result?.startIdx).toBe(2)
      expect(result?.endIdx).toBe(3)
      expect(result?.startPrice).toBe(3600)
      expect(result?.endPrice).toBe(4000)
    })
  })

  describe('formatDate', () => {
    it('should format ISO date to US locale', () => {
      const result = formatDate('2020-01-15')
      expect(result).toMatch(/Jan/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2020/)
    })

    it('should handle different date formats', () => {
      const result1 = formatDate('2020-12-31')
      const result2 = formatDate('2020-06-01')
      
      expect(result1).toMatch(/Dec/)
      expect(result2).toMatch(/Jun/)
    })
  })

  describe('validatePriceData', () => {
    it('should return true for valid data', () => {
      expect(validatePriceData(samplePriceData)).toBe(true)
    })

    it('should return false for empty array', () => {
      expect(validatePriceData([])).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(validatePriceData(null as any)).toBe(false)
      expect(validatePriceData(undefined as any)).toBe(false)
    })

    it('should return false for invalid data points', () => {
      const invalidData = [
        { timestamp: null, price: 3000, date: '2020-01-01' },
        { timestamp: 123, price: null, date: '2020-01-01' }
      ] as any

      expect(validatePriceData(invalidData)).toBe(false)
    })
  })

  describe('isChronological', () => {
    it('should return true for chronological data', () => {
      expect(isChronological(samplePriceData)).toBe(true)
    })

    it('should return false for reverse chronological data', () => {
      const reversed = [...samplePriceData].reverse()
      expect(isChronological(reversed)).toBe(false)
    })

    it('should return false for unordered data', () => {
      const unordered: PriceDataPoint[] = [
        samplePriceData[0]!,
        samplePriceData[2]!,
        samplePriceData[1]!,
        samplePriceData[3]!
      ]
      expect(isChronological(unordered)).toBe(false)
    })

    it('should return true for single data point', () => {
      expect(isChronological([samplePriceData[0]!])).toBe(true)
    })

    it('should return true for empty array', () => {
      expect(isChronological([])).toBe(true)
    })
  })

  describe('edge cases and integration', () => {
    it('should handle real-world S&P 500 data range', () => {
      // Simulate Nov 2020 to Nov 2025 (the actual bug case)
      const realWorldData: PriceDataPoint[] = [
        { timestamp: new Date('2020-11-10').getTime(), price: 3545.53 },
        { timestamp: new Date('2025-11-07').getTime(), price: 6728.81 }
      ]

      const result = calculatePerformance(realWorldData, 0, 1)
      
      expect(result).toBeTruthy()
      // (6728.81 - 3545.53) / 3545.53 * 100 = 89.782909...
      expect(result?.performance).toBeCloseTo(89.78, 1)
    })

    it('should handle data with same prices (no change)', () => {
      const flatData: PriceDataPoint[] = [
        { timestamp: new Date('2020-01-01').getTime(), price: 3000 },
        { timestamp: new Date('2020-12-31').getTime(), price: 3000 }
      ]

      const result = calculatePerformance(flatData, 0, 1)
      expect(result?.performance).toBe(0)
    })

    it('should maintain precision for small percentage changes', () => {
      const preciseData: PriceDataPoint[] = [
        { timestamp: new Date('2020-01-01').getTime(), price: 10000.00 },
        { timestamp: new Date('2020-01-02').getTime(), price: 10001.50 }
      ]

      const result = calculatePerformance(preciseData, 0, 1)
      // 0.015% gain
      expect(result?.performance).toBeCloseTo(0.015, 3)
    })
  })
})
