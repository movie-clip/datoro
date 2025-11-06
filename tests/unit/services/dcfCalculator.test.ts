import { describe, it, expect, beforeEach } from 'vitest'
import { calculateIntrinsicValue, getRecommendation } from '../../../src/services/dcf/dcfCalculator'

describe('dcfCalculator', () => {
  describe('calculateIntrinsicValue', () => {
    it('should calculate intrinsic value correctly with default inputs', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      // Formula: Target Price = EPS × (1 + growthRate)^years × P/E
      // Default: 5 × (1.10)^10 × 20 = 259.37
      expect(result.intrinsicValue).toBeCloseTo(259.37, 1)
      expect(result.upside).toBeCloseTo(159.4, 1) // ((259.37 - 100) / 100) * 100
      expect(result.futureEPS).toBeCloseTo(12.97, 1) // 5 × (1.10)^10
      expect(result.projectedPrices).toHaveLength(10)
      expect(result.error).toBeUndefined()
    })

    it('should calculate with custom growth rate', () => {
      const companyData = {
        eps: 10.0,
        currentPrice: 200,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 15, // 15% growth
        peRatio: 25,
        projectionYears: 5
      }

      const result = calculateIntrinsicValue(inputs, companyData)

      // 10 × (1.15)^5 × 25 = 502.84 (actual value after rounding)
      expect(result.intrinsicValue).toBeCloseTo(502.84, 1)
      expect(result.projectedPrices).toHaveLength(5)
      expect(result.projectedPrices[0]!.year).toBe(new Date().getFullYear() + 1)
    })

    it('should calculate year-by-year projections correctly', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 10,
        peRatio: 20,
        projectionYears: 3
      }

      const result = calculateIntrinsicValue(inputs, companyData)

      const currentYear = new Date().getFullYear()
      
      // Year 1: EPS = 5 × 1.10 = 5.50, Price = 5.50 × 20 = 110
      expect(result.projectedPrices[0]!.year).toBe(currentYear + 1)
      expect(result.projectedPrices[0]!.eps).toBeCloseTo(5.5, 1)
      expect(result.projectedPrices[0]!.price).toBeCloseTo(110, 1)

      // Year 2: EPS = 5 × (1.10)^2 = 6.05, Price = 6.05 × 20 = 121
      expect(result.projectedPrices[1]!.year).toBe(currentYear + 2)
      expect(result.projectedPrices[1]!.eps).toBeCloseTo(6.05, 1)
      expect(result.projectedPrices[1]!.price).toBeCloseTo(121, 1)

      // Year 3: EPS = 5 × (1.10)^3 = 6.66, Price = 6.66 × 20 = 133.1
      expect(result.projectedPrices[2]!.year).toBe(currentYear + 3)
      expect(result.projectedPrices[2]!.eps).toBeCloseTo(6.66, 1)
      expect(result.projectedPrices[2]!.price).toBeCloseTo(133.1, 1)
    })

    it('should calculate upside percentage correctly', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 20, // High growth
        peRatio: 30,
        projectionYears: 5
      }

      const result = calculateIntrinsicValue(inputs, companyData)

      // Target: 5 × (1.20)^5 × 30 = 373.25
      // Upside: ((373.25 - 100) / 100) * 100 = 273.2%
      expect(result.upside).toBeCloseTo(273.2, 1)
    })

    it('should calculate annualized return correctly', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 10,
        peRatio: 20,
        projectionYears: 10
      }

      const result = calculateIntrinsicValue(inputs, companyData)

      // Target: 259.37
      // Annualized: (259.37 / 100)^(1/10) - 1 = 0.1 = 10%
      expect(result.annualizedReturn).toBeCloseTo(10, 0)
    })

    it('should handle zero EPS', () => {
      const companyData = {
        eps: 0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      expect(result.intrinsicValue).toBeNull()
      expect(result.projectedPrices).toHaveLength(0)
      expect(result.upside).toBeNull()
      expect(result.error).toBe('Earnings data not available for this ticker.')
    })

    it('should handle negative EPS (unprofitable company)', () => {
      const companyData = {
        eps: -2.5,
        currentPrice: 50,
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      expect(result.intrinsicValue).toBeNull()
      expect(result.projectedPrices).toHaveLength(0)
      expect(result.upside).toBeNull()
      expect(result.error).toContain('PEG model requires positive earnings')
      expect(result.error).toContain('unprofitable')
    })

    it('should handle null company data', () => {
      const result = calculateIntrinsicValue({}, null)

      expect(result.intrinsicValue).toBeNull()
      expect(result.projectedPrices).toHaveLength(0)
      expect(result.upside).toBeNull()
      expect(result.error).toBe('Earnings data not available for this ticker.')
    })

    it('should handle missing EPS in company data', () => {
      const companyData = {
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      expect(result.intrinsicValue).toBeNull()
      expect(result.error).toBe('Earnings data not available for this ticker.')
    })

    it('should handle low growth rates', () => {
      const companyData = {
        eps: 10.0,
        currentPrice: 150,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 2, // Low growth
        peRatio: 15,
        projectionYears: 5
      }

      const result = calculateIntrinsicValue(inputs, companyData)

      // 10 × (1.02)^5 × 15 = 165.61
      expect(result.intrinsicValue).toBeCloseTo(165.61, 1)
      expect(result.upside).toBeCloseTo(10.4, 1)
    })

    it('should handle high P/E ratios', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 10,
        peRatio: 50, // High P/E (growth stock)
        projectionYears: 10
      }

      const result = calculateIntrinsicValue(inputs, companyData)

      // 5 × (1.10)^10 × 50 = 648.44
      expect(result.intrinsicValue).toBeCloseTo(648.44, 1)
    })

    it('should handle different projection periods', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      // 1 year
      const result1 = calculateIntrinsicValue({ projectionYears: 1 }, companyData)
      expect(result1.projectedPrices).toHaveLength(1)

      // 3 years
      const result3 = calculateIntrinsicValue({ projectionYears: 3 }, companyData)
      expect(result3.projectedPrices).toHaveLength(3)

      // 20 years
      const result20 = calculateIntrinsicValue({ projectionYears: 20 }, companyData)
      expect(result20.projectedPrices).toHaveLength(20)
    })

    it('should round values appropriately', () => {
      const companyData = {
        eps: 5.123456,
        currentPrice: 100.789,
        sharesOutstanding: 1234567
      }

      const result = calculateIntrinsicValue({}, companyData)

      // Check that EPS is rounded to 2 decimals
      expect(result.projectedPrices[0]!.eps).toBe(
        Math.round(result.projectedPrices[0]!.eps * 100) / 100
      )

      // Check that price is rounded to 2 decimals
      expect(result.intrinsicValue).toBe(
        Math.round(result.intrinsicValue! * 100) / 100
      )

      // Check that upside is rounded to 1 decimal
      expect(result.upside).toBe(
        Math.round(result.upside! * 10) / 10
      )
    })

    it('should handle edge case: very low current price', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 10, // Very undervalued
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      expect(result.intrinsicValue).toBeGreaterThan(0)
      expect(result.upside).toBeGreaterThan(100) // Should show large upside
    })

    it('should handle edge case: very high current price', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 500, // Very overvalued
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      expect(result.intrinsicValue).toBeGreaterThan(0)
      expect(result.upside).toBeLessThan(0) // Should show negative upside
    })

    it('should maintain consistency across calculations', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const inputs = {
        fcfGrowthRate: 10,
        peRatio: 20,
        projectionYears: 5
      }

      const result1 = calculateIntrinsicValue(inputs, companyData)
      const result2 = calculateIntrinsicValue(inputs, companyData)

      expect(result1.intrinsicValue).toBe(result2.intrinsicValue)
      expect(result1.upside).toBe(result2.upside)
      expect(result1.projectedPrices).toEqual(result2.projectedPrices)
    })

    it('should have futureValue equal to intrinsicValue', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({}, companyData)

      expect(result.futureValue).toBe(result.intrinsicValue)
    })

    it('should calculate projected prices with correct properties', () => {
      const companyData = {
        eps: 5.0,
        currentPrice: 100,
        sharesOutstanding: 1000000
      }

      const result = calculateIntrinsicValue({ projectionYears: 3 }, companyData)

      result.projectedPrices.forEach((projection, index) => {
        expect(projection).toHaveProperty('year')
        expect(projection).toHaveProperty('eps')
        expect(projection).toHaveProperty('price')
        expect(projection).toHaveProperty('futurePrice')
        
        // year should increment
        expect(projection.year).toBe(new Date().getFullYear() + index + 1)
        
        // eps should increase each year
        if (index > 0) {
          expect(projection.eps).toBeGreaterThan(result.projectedPrices[index - 1]!.eps)
        }
      })
    })
  })

  describe('getRecommendation', () => {
    it('should return "Strong Buy" for upside >= 30%', () => {
      expect(getRecommendation(30)).toEqual({ label: 'Strong Buy', color: '#00b894' })
      expect(getRecommendation(50)).toEqual({ label: 'Strong Buy', color: '#00b894' })
      expect(getRecommendation(100)).toEqual({ label: 'Strong Buy', color: '#00b894' })
    })

    it('should return "Buy" for upside >= 15% and < 30%', () => {
      expect(getRecommendation(15)).toEqual({ label: 'Buy', color: '#00cec9' })
      expect(getRecommendation(20)).toEqual({ label: 'Buy', color: '#00cec9' })
      expect(getRecommendation(29.9)).toEqual({ label: 'Buy', color: '#00cec9' })
    })

    it('should return "Hold" for upside >= -15% and < 15%', () => {
      expect(getRecommendation(0)).toEqual({ label: 'Hold', color: '#fdcb6e' })
      expect(getRecommendation(10)).toEqual({ label: 'Hold', color: '#fdcb6e' })
      expect(getRecommendation(-10)).toEqual({ label: 'Hold', color: '#fdcb6e' })
      expect(getRecommendation(14.9)).toEqual({ label: 'Hold', color: '#fdcb6e' })
      expect(getRecommendation(-14.9)).toEqual({ label: 'Hold', color: '#fdcb6e' })
    })

    it('should return "Sell" for upside > -30% and < -15%', () => {
      expect(getRecommendation(-15.1)).toEqual({ label: 'Sell', color: '#ff7675' })
      expect(getRecommendation(-20)).toEqual({ label: 'Sell', color: '#ff7675' })
      expect(getRecommendation(-29.9)).toEqual({ label: 'Sell', color: '#ff7675' })
    })

    it('should return "Strong Sell" for upside < -30%', () => {
      expect(getRecommendation(-30.1)).toEqual({ label: 'Strong Sell', color: '#d63031' })
      expect(getRecommendation(-50)).toEqual({ label: 'Strong Sell', color: '#d63031' })
      expect(getRecommendation(-100)).toEqual({ label: 'Strong Sell', color: '#d63031' })
    })

    it('should return "N/A" for null upside', () => {
      expect(getRecommendation(null)).toEqual({ label: 'N/A', color: '#95a5a6' })
    })

    it('should return "N/A" for NaN upside', () => {
      expect(getRecommendation(NaN)).toEqual({ label: 'N/A', color: '#95a5a6' })
    })

    it('should handle boundary values correctly', () => {
      // Test exact boundary values
      expect(getRecommendation(30.0)).toEqual({ label: 'Strong Buy', color: '#00b894' })
      expect(getRecommendation(15.0)).toEqual({ label: 'Buy', color: '#00cec9' })
      expect(getRecommendation(-15.0)).toEqual({ label: 'Hold', color: '#fdcb6e' }) // -15 is included in Hold
      expect(getRecommendation(-30.0)).toEqual({ label: 'Sell', color: '#ff7675' }) // -30 is included in Sell
    })

    it('should handle very large positive values', () => {
      expect(getRecommendation(500)).toEqual({ label: 'Strong Buy', color: '#00b894' })
      expect(getRecommendation(1000)).toEqual({ label: 'Strong Buy', color: '#00b894' })
    })

    it('should handle very large negative values', () => {
      expect(getRecommendation(-500)).toEqual({ label: 'Strong Sell', color: '#d63031' })
      expect(getRecommendation(-1000)).toEqual({ label: 'Strong Sell', color: '#d63031' })
    })

    it('should handle decimal values correctly', () => {
      expect(getRecommendation(15.1)).toEqual({ label: 'Buy', color: '#00cec9' })
      expect(getRecommendation(14.9)).toEqual({ label: 'Hold', color: '#fdcb6e' })
      expect(getRecommendation(-15.1)).toEqual({ label: 'Sell', color: '#ff7675' })
      expect(getRecommendation(-14.9)).toEqual({ label: 'Hold', color: '#fdcb6e' })
    })
  })
})
