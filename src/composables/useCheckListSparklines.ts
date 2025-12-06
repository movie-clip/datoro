import { type ComputedRef } from 'vue'
import type { FMPRatiosTTM, FMPIncomeStatement } from '../types/fmp.types'

interface CheckListSparklinesInput {
  incomeStatements: ComputedRef<{ annual: FMPIncomeStatement[]; quarterly: FMPIncomeStatement[] } | null>
  ratios: ComputedRef<FMPRatiosTTM[] | null>
}

// Sparkline visualization constants
export const SPARKLINE_MIN_HEIGHT = 20  // Minimum bar height percentage
export const SPARKLINE_MAX_HEIGHT = 100 // Maximum bar height percentage
export const SPARKLINE_RANGE = 80       // Range between min and max (100 - 20)

export function useCheckListSparklines(input: CheckListSparklinesInput) {
  const { incomeStatements, ratios } = input

  // Get sparkline data for metrics (last 5 years)
  const getSparklineData = (id: string): number[] => {
    try {
      const annual = incomeStatements.value?.annual
      if (!annual || annual.length < 2) return []
      
      const ratiosData = ratios.value || []
      const last5Years = annual.slice(0, Math.min(5, annual.length)).reverse() // Oldest to newest, max 5
      
      let data: number[] = []
      
      switch (id) {
        case 'rev_growth':
          data = last5Years.map(stmt => stmt.revenue || 0)
          break
        case 'ni_growth':
          data = last5Years.map(stmt => stmt.netIncome || 0)
          break
        case 'eps_growth':
          data = last5Years.map(stmt => stmt.eps || 0)
          break
        case 'gross_margin':
          data = ratiosData.slice(0, Math.min(5, ratiosData.length)).reverse().map(r => (r.grossProfitMargin || 0) * 100)
          break
        case 'shares':
          data = last5Years.map(stmt => stmt.weightedAverageShsOut || 0)
          break
        default:
          return []
      }
      
      // Filter out invalid data points
      return data.filter(val => typeof val === 'number' && isFinite(val))
    } catch (error) {
      // Silently fail - return empty array if data extraction fails
      return []
    }
  }

  // Generate bar heights for sparkline (normalized to 20-100% for better visual distinction)
  const getSparklineBars = (data: number[]): number[] => {
    if (!data || data.length === 0) return []
    
    try {
      const validData = data.filter(val => typeof val === 'number' && isFinite(val))
      if (validData.length === 0) return []
      
      const min = Math.min(...validData)
      const max = Math.max(...validData)
      const range = max - min || 1
      
      return validData.map(value => {
        // Scale to SPARKLINE_MIN_HEIGHT-SPARKLINE_MAX_HEIGHT range for better visual differentiation
        const normalized = ((value - min) / range) * SPARKLINE_RANGE + SPARKLINE_MIN_HEIGHT
        return Math.max(SPARKLINE_MIN_HEIGHT, Math.min(SPARKLINE_MAX_HEIGHT, normalized))
      })
    } catch (error) {
      // Silently fail - return empty array if normalization fails
      return []
    }
  }

  return {
    getSparklineData,
    getSparklineBars
  }
}
