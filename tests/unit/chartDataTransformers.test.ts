import { describe, it, expect } from 'vitest'
import { 
  extractYearsFromSeries, 
  convertToCategoryData, 
  getAllDataPoints 
} from '../../src/utils/chartDataTransformers'

describe('chartDataTransformers', () => {
  describe('extractYearsFromSeries', () => {
    it('should extract unique years from time-series data', () => {
      const data: [number, number][] = [
        [new Date('2020-01-01').getTime(), 100],
        [new Date('2020-06-01').getTime(), 150],
        [new Date('2021-01-01').getTime(), 200],
        [new Date('2022-01-01').getTime(), 250]
      ]
      
      const years = extractYearsFromSeries(data)
      expect(years).toEqual([2020, 2021, 2022])
    })

    it('should return empty array for empty input', () => {
      expect(extractYearsFromSeries([])).toEqual([])
      expect(extractYearsFromSeries(null as any)).toEqual([])
    })

    it('should handle duplicate years', () => {
      const data: [number, number][] = [
        [new Date('2020-03-01').getTime(), 100],
        [new Date('2020-06-01').getTime(), 150],
        [new Date('2020-09-01').getTime(), 200],
        [new Date('2020-12-01').getTime(), 250]
      ]
      
      const years = extractYearsFromSeries(data)
      expect(years).toEqual([2020])
    })
  })

  describe('convertToCategoryData - Annual Mode', () => {
    it('should convert time-series to annual category data', () => {
      const timeSeriesData: [number, number][] = [
        [new Date('2020-12-31').getTime(), 100],
        [new Date('2021-12-31').getTime(), 200],
        [new Date('2022-12-31').getTime(), 300]
      ]
      const categoryYears = [2020, 2021, 2022]
      
      const result = convertToCategoryData(timeSeriesData, categoryYears)
      expect(result).toEqual([100, 200, 300])
    })

    it('should fill missing years with 0', () => {
      const timeSeriesData: [number, number][] = [
        [new Date('2020-12-31').getTime(), 100],
        [new Date('2022-12-31').getTime(), 300]
      ]
      const categoryYears = [2020, 2021, 2022]
      
      const result = convertToCategoryData(timeSeriesData, categoryYears)
      expect(result).toEqual([100, 0, 300])
    })
  })

  describe('convertToCategoryData - Quarterly Mode (Timestamp)', () => {
    it('should convert time-series to quarterly category data using timestamps', () => {
      const ts1 = new Date('2020-09-30').getTime()
      const ts2 = new Date('2020-12-31').getTime()
      const ts3 = new Date('2021-03-31').getTime()
      
      const timeSeriesData: [number, number][] = [
        [ts1, 100],
        [ts2, 200],
        [ts3, 300]
      ]
      const categoryTimestamps = [ts1, ts2, ts3]
      
      const result = convertToCategoryData(timeSeriesData, categoryTimestamps)
      expect(result).toEqual([100, 200, 300])
    })

    it('should handle missing quarterly data points with 0', () => {
      const ts1 = new Date('2020-09-30').getTime()
      const ts2 = new Date('2020-12-31').getTime()
      const ts3 = new Date('2021-03-31').getTime()
      
      const timeSeriesData: [number, number][] = [
        [ts1, 100],
        // ts2 missing
        [ts3, 300]
      ]
      const categoryTimestamps = [ts1, ts2, ts3]
      
      const result = convertToCategoryData(timeSeriesData, categoryTimestamps)
      expect(result).toEqual([100, 0, 300])
    })

    it('should distinguish between annual and quarterly mode based on timestamp size', () => {
      // Annual mode: small numbers (years)
      const annualData: [number, number][] = [
        [new Date('2020-12-31').getTime(), 100]
      ]
      const annualCategories = [2020]
      const annualResult = convertToCategoryData(annualData, annualCategories)
      expect(annualResult).toEqual([100])

      // Quarterly mode: large numbers (timestamps)
      const ts = new Date('2020-12-31').getTime()
      const quarterlyData: [number, number][] = [[ts, 200]]
      const quarterlyCategories = [ts]
      const quarterlyResult = convertToCategoryData(quarterlyData, quarterlyCategories)
      expect(quarterlyResult).toEqual([200])
    })
  })

  describe('getAllDataPoints', () => {
    it('should extract all points from single series format', () => {
      const series: [number, number][] = [
        [new Date('2020-01-01').getTime(), 100],
        [new Date('2020-06-01').getTime(), 150]
      ]
      
      const result = getAllDataPoints(series)
      expect(result).toEqual(series)
    })

    it('should extract all points from multi-series format', () => {
      const series = [
        {
          name: 'Cash',
          data: [
            [new Date('2020-01-01').getTime(), 100],
            [new Date('2020-06-01').getTime(), 150]
          ] as [number, number][]
        },
        {
          name: 'Debt',
          data: [
            [new Date('2020-01-01').getTime(), 50],
            [new Date('2020-06-01').getTime(), 75]
          ] as [number, number][]
        }
      ]
      
      const result = getAllDataPoints(series)
      expect(result).toHaveLength(4)
      expect(result).toContainEqual([new Date('2020-01-01').getTime(), 100])
      expect(result).toContainEqual([new Date('2020-06-01').getTime(), 150])
      expect(result).toContainEqual([new Date('2020-01-01').getTime(), 50])
      expect(result).toContainEqual([new Date('2020-06-01').getTime(), 75])
    })

    it('should return empty array for null/undefined input', () => {
      expect(getAllDataPoints(null as any)).toEqual([])
      expect(getAllDataPoints(undefined as any)).toEqual([])
    })
  })
})
