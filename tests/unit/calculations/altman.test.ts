/**
 * Financial Calculations - Altman Z-Score Tests
 * 
 * Tests the Altman Z-Score calculation for company financial health
 * Used to predict bankruptcy risk
 * 
 * Formula: Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
 * Where:
 *  X1 = Working Capital / Total Assets
 *  X2 = Retained Earnings / Total Assets
 *  X3 = EBIT / Total Assets
 *  X4 = Market Value of Equity / Total Liabilities
 *  X5 = Sales / Total Assets
 */

import { describe, it, expect } from 'vitest'

interface Financials {
  workingCapital: number
  totalAssets: number
  retainedEarnings: number
  ebit: number
  marketValueEquity: number
  totalLiabilities: number
  sales: number
}

/**
 * Calculate Altman Z-Score
 * @param financials - Company financials
 * @returns Z-Score (higher is better)
 */
function calculateAltmanZScore(financials: Partial<Financials>): number {
  const {
    workingCapital,
    totalAssets,
    retainedEarnings,
    ebit,
    marketValueEquity,
    totalLiabilities,
    sales,
  } = financials

  // Validate inputs
  if (!totalAssets || totalAssets === 0) {
    throw new Error('Total assets must be greater than zero')
  }

  // Calculate ratios
  const x1 = (workingCapital || 0) / totalAssets // Working Capital / Total Assets
  const x2 = (retainedEarnings || 0) / totalAssets // Retained Earnings / Total Assets
  const x3 = (ebit || 0) / totalAssets // EBIT / Total Assets
  const x4 = (marketValueEquity || 0) / (totalLiabilities || 1) // Market Cap / Total Liabilities
  const x5 = (sales || 0) / totalAssets // Sales / Total Assets

  // Altman Z-Score formula
  const zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5

  return zScore
}

/**
 * Interpret Altman Z-Score
 */
function interpretZScore(zScore: number): string {
  if (zScore > 2.99) return 'Safe Zone - Low bankruptcy risk'
  if (zScore >= 1.81) return 'Grey Zone - Moderate risk'
  return 'Distress Zone - High bankruptcy risk'
}

describe('Altman Z-Score Calculations', () => {
  describe('calculateAltmanZScore', () => {
    it('should calculate Z-Score for healthy company (Apple-like)', () => {
      const financials = {
        workingCapital: 50_000_000_000, // $50B
        totalAssets: 350_000_000_000, // $350B
        retainedEarnings: 100_000_000_000, // $100B
        ebit: 120_000_000_000, // $120B
        marketValueEquity: 2_500_000_000_000, // $2.5T market cap
        totalLiabilities: 280_000_000_000, // $280B
        sales: 380_000_000_000, // $380B
      }

      const zScore = calculateAltmanZScore(financials)

      // Healthy company should have Z-Score > 2.99
      expect(zScore).toBeGreaterThan(2.99)
      expect(zScore).toBeLessThan(20) // Sanity check
      expect(interpretZScore(zScore)).toBe('Safe Zone - Low bankruptcy risk')
    })

    it('should calculate Z-Score for distressed company', () => {
      const financials = {
        workingCapital: -10_000_000_000, // Negative working capital
        totalAssets: 100_000_000_000,
        retainedEarnings: -5_000_000_000, // Losses
        ebit: -2_000_000_000, // Negative EBIT
        marketValueEquity: 5_000_000_000, // Low market cap
        totalLiabilities: 90_000_000_000, // High debt
        sales: 20_000_000_000, // Low sales
      }

      const zScore = calculateAltmanZScore(financials)

      // Distressed company should have Z-Score < 1.81
      expect(zScore).toBeLessThan(1.81)
      expect(interpretZScore(zScore)).toBe('Distress Zone - High bankruptcy risk')
    })

    it('should calculate Z-Score for grey zone company', () => {
      const financials = {
        workingCapital: 10_000_000_000,
        totalAssets: 100_000_000_000,
        retainedEarnings: 15_000_000_000,
        ebit: 8_000_000_000,
        marketValueEquity: 50_000_000_000,
        totalLiabilities: 60_000_000_000,
        sales: 80_000_000_000,
      }

      const zScore = calculateAltmanZScore(financials)

      // Grey zone: 1.81 <= Z-Score <= 2.99
      expect(zScore).toBeGreaterThanOrEqual(1.81)
      expect(zScore).toBeLessThanOrEqual(2.99)
      expect(interpretZScore(zScore)).toBe('Grey Zone - Moderate risk')
    })

    it('should throw error when totalAssets is zero', () => {
      const financials = {
        workingCapital: 10_000_000_000,
        totalAssets: 0, // Invalid
        retainedEarnings: 15_000_000_000,
        ebit: 8_000_000_000,
        marketValueEquity: 50_000_000_000,
        totalLiabilities: 60_000_000_000,
        sales: 80_000_000_000,
      }

      expect(() => calculateAltmanZScore(financials)).toThrow(
        'Total assets must be greater than zero'
      )
    })

    it('should throw error when totalAssets is missing', () => {
      const financials = {
        workingCapital: 10_000_000_000,
        // totalAssets missing
        retainedEarnings: 15_000_000_000,
        ebit: 8_000_000_000,
        marketValueEquity: 50_000_000_000,
        totalLiabilities: 60_000_000_000,
        sales: 80_000_000_000,
      }

      expect(() => calculateAltmanZScore(financials)).toThrow()
    })

    it('should handle zero liabilities (all equity financing)', () => {
      const financials = {
        workingCapital: 50_000_000_000,
        totalAssets: 100_000_000_000,
        retainedEarnings: 30_000_000_000,
        ebit: 20_000_000_000,
        marketValueEquity: 200_000_000_000,
        totalLiabilities: 0, // No debt
        sales: 150_000_000_000,
      }

      const zScore = calculateAltmanZScore(financials)

      // Should be very high (no debt is good)
      expect(zScore).toBeGreaterThan(10)
      expect(interpretZScore(zScore)).toBe('Safe Zone - Low bankruptcy risk')
    })

    it('should handle negative working capital but positive other metrics', () => {
      const financials = {
        workingCapital: -5_000_000_000, // Negative WC
        totalAssets: 100_000_000_000,
        retainedEarnings: 50_000_000_000, // Strong RE
        ebit: 25_000_000_000, // Strong EBIT
        marketValueEquity: 300_000_000_000, // Strong market cap
        totalLiabilities: 40_000_000_000,
        sales: 120_000_000_000,
      }

      const zScore = calculateAltmanZScore(financials)

      // Strong other metrics should compensate for negative WC
      expect(zScore).toBeGreaterThan(2.0)
    })
  })

  describe('interpretZScore', () => {
    it('should classify safe zone correctly', () => {
      expect(interpretZScore(3.0)).toBe('Safe Zone - Low bankruptcy risk')
      expect(interpretZScore(5.5)).toBe('Safe Zone - Low bankruptcy risk')
      expect(interpretZScore(10.0)).toBe('Safe Zone - Low bankruptcy risk')
    })

    it('should classify grey zone correctly', () => {
      expect(interpretZScore(1.81)).toBe('Grey Zone - Moderate risk')
      expect(interpretZScore(2.5)).toBe('Grey Zone - Moderate risk')
      expect(interpretZScore(2.99)).toBe('Grey Zone - Moderate risk')
    })

    it('should classify distress zone correctly', () => {
      expect(interpretZScore(1.8)).toBe('Distress Zone - High bankruptcy risk')
      expect(interpretZScore(1.0)).toBe('Distress Zone - High bankruptcy risk')
      expect(interpretZScore(-0.5)).toBe('Distress Zone - High bankruptcy risk')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large numbers (trillion-dollar companies)', () => {
      const financials = {
        workingCapital: 100_000_000_000_000, // $100T
        totalAssets: 500_000_000_000_000, // $500T
        retainedEarnings: 200_000_000_000_000,
        ebit: 150_000_000_000_000,
        marketValueEquity: 3_000_000_000_000_000, // $3 quadrillion
        totalLiabilities: 300_000_000_000_000,
        sales: 600_000_000_000_000,
      }

      const zScore = calculateAltmanZScore(financials)

      expect(zScore).toBeGreaterThan(0)
      expect(Number.isFinite(zScore)).toBe(true)
    })

    it('should handle decimal inputs', () => {
      const financials = {
        workingCapital: 5_000_000_000.75,
        totalAssets: 10_000_000_000.5,
        retainedEarnings: 3_000_000_000.25,
        ebit: 2_000_000_000.1,
        marketValueEquity: 50_000_000_000.99,
        totalLiabilities: 6_000_000_000.5,
        sales: 15_000_000_000.33,
      }

      const zScore = calculateAltmanZScore(financials)

      expect(zScore).toBeGreaterThan(0)
      expect(Number.isFinite(zScore)).toBe(true)
    })

    it('should handle undefined values gracefully by treating as 0', () => {
      const financials = {
        workingCapital: undefined,
        totalAssets: 100_000_000_000,
        retainedEarnings: undefined,
        ebit: undefined,
        marketValueEquity: undefined,
        totalLiabilities: undefined,
        sales: undefined,
      }

      const zScore = calculateAltmanZScore(financials)

      // Should return a valid number (0) when all ratios are 0
      expect(Number.isFinite(zScore)).toBe(true)
      expect(zScore).toBe(0) // All undefined values treated as 0
    })
  })

  describe('Real-World Scenarios', () => {
    it('should calculate for tech company (high intangible assets)', () => {
      // Typical tech company: Low physical assets, high market cap
      const financials = {
        workingCapital: 20_000_000_000,
        totalAssets: 80_000_000_000, // Low tangible assets
        retainedEarnings: 40_000_000_000,
        ebit: 30_000_000_000,
        marketValueEquity: 500_000_000_000, // Very high market cap
        totalLiabilities: 30_000_000_000,
        sales: 100_000_000_000,
      }

      const zScore = calculateAltmanZScore(financials)

      expect(zScore).toBeGreaterThan(2.99) // Tech companies often score high
      expect(interpretZScore(zScore)).toBe('Safe Zone - Low bankruptcy risk')
    })

    it('should calculate for retail company (high inventory)', () => {
      // Typical retail: High inventory, lower margins
      const financials = {
        workingCapital: 5_000_000_000,
        totalAssets: 50_000_000_000,
        retainedEarnings: 10_000_000_000,
        ebit: 3_000_000_000, // Lower margins
        marketValueEquity: 40_000_000_000,
        totalLiabilities: 35_000_000_000,
        sales: 80_000_000_000, // High sales volume
      }

      const zScore = calculateAltmanZScore(financials)

      expect(zScore).toBeGreaterThan(0)
      expect(Number.isFinite(zScore)).toBe(true)
    })

    it('should calculate for manufacturing company (high fixed assets)', () => {
      // Typical manufacturing: Heavy machinery, moderate growth
      const financials = {
        workingCapital: 8_000_000_000,
        totalAssets: 100_000_000_000, // High fixed assets
        retainedEarnings: 20_000_000_000,
        ebit: 12_000_000_000,
        marketValueEquity: 80_000_000_000,
        totalLiabilities: 60_000_000_000, // Debt for equipment
        sales: 120_000_000_000,
      }

      const zScore = calculateAltmanZScore(financials)

      expect(zScore).toBeGreaterThan(0)
      expect(Number.isFinite(zScore)).toBe(true)
    })
  })
})
