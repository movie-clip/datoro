import { ref, computed, watch } from 'vue'
import { calculateIntrinsicValue, getRecommendation } from '../services/dcf/dcfCalculator'

/**
 * DCF Calculator Composable
 * Manages state and calculations for DCF valuation model
 * 
 * @param {Object} companyData - Company financial data from batch
 * @param {number} companyData.currentFcf - Most recent free cash flow
 * @param {number} companyData.sharesOutstanding - Shares outstanding
 * @param {number} companyData.cashAndEquivalents - Cash position
 * @param {number} companyData.totalDebt - Total debt
 * @param {number} companyData.currentPrice - Current stock price
 * @param {number} companyData.historicalGrowthRate - Historical FCF CAGR
 */
export function useDcfCalculator(companyData = null) {
  // Default input values (will be overridden by company data if available)
  const inputs = ref({
    fcfGrowthRate: companyData?.historicalGrowthRate || 10,
    terminalGrowthRate: 2.5,
    discountRate: 10,
    peRatio: 20, // Kept for potential future use
    projectionYears: 10
  })

  // Calculation results
  const intrinsicValue = ref(null)
  const projectedPrices = ref([])
  const upside = ref(null)
  const recommendation = ref(null)
  const enterpriseValue = ref(null)
  const terminalValue = ref(null)

  // Calculate DCF whenever inputs change
  const calculate = () => {
    try {
      // Use company data if available, otherwise use defaults for demonstration
      const dataToUse = companyData || {
        currentFcf: 10_000_000_000, // $10B default
        sharesOutstanding: 1000, // 1B shares
        cashAndEquivalents: 50_000_000_000,
        totalDebt: 100_000_000_000,
        currentPrice: 100
      }

      const results = calculateIntrinsicValue(inputs.value, dataToUse)
      
      intrinsicValue.value = results.intrinsicValue
      projectedPrices.value = results.projectedPrices
      upside.value = results.upside
      enterpriseValue.value = results.enterpriseValue
      terminalValue.value = results.terminalValue
      
      // Only set recommendation if we have valid results
      if (results.intrinsicValue !== null && results.upside !== null) {
        recommendation.value = getRecommendation(results.upside)
      } else {
        recommendation.value = null
      }
    } catch (error) {
      console.error('DCF calculation error:', error)
      // Reset on error
      intrinsicValue.value = null
      projectedPrices.value = []
      upside.value = null
      recommendation.value = null
      enterpriseValue.value = null
      terminalValue.value = null
    }
  }

  // Watch for input changes and recalculate
  watch(inputs, calculate, { deep: true })

  // Calculate on initialization
  calculate()

  return {
    // Inputs
    inputs,
    
    // Results
    intrinsicValue,
    projectedPrices,
    upside,
    recommendation,
    enterpriseValue,
    terminalValue,
    
    // Methods
    calculate
  }
}
