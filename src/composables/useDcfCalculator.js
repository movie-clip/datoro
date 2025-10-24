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
  // Default input values with scenario-based structure
  const baseGrowth = companyData?.historicalGrowthRate || 10
  
  const inputs = ref({
    peRatio: {
      best: 24,      // 20 + 20%
      average: 20,
      worst: 16      // 20 - 20%
    },
    fcfGrowthRate: {
      best: Math.round(baseGrowth * 1.2 * 10) / 10,      // +20%
      average: baseGrowth,
      worst: Math.round(baseGrowth * 0.8 * 10) / 10       // -20%
    },
    terminalGrowthRate: {
      best: 3,       // 2.5 + 20%
      average: 2.5,
      worst: 2       // 2.5 - 20%
    },
    discountRate: {
      best: 8,       // 10 - 20%
      average: 10,
      worst: 12      // 10 + 20%
    },
    projectionYears: 10
  })

  // Calculation results
  const intrinsicValue = ref(null)
  const projectedPrices = ref([])
  const upside = ref(null)
  const recommendation = ref(null)
  const enterpriseValue = ref(null)
  const terminalValue = ref(null)
  
  // Scenario results
  const scenarios = ref({
    best: { intrinsicValue: null, projectedPrices: [], upside: null },
    average: { intrinsicValue: null, projectedPrices: [], upside: null },
    worst: { intrinsicValue: null, projectedPrices: [], upside: null }
  })

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

      // Calculate for all three scenarios
      const scenarioTypes = ['best', 'average', 'worst']
      
      scenarioTypes.forEach(scenario => {
        const scenarioInputs = {
          fcfGrowthRate: inputs.value.fcfGrowthRate[scenario],
          terminalGrowthRate: inputs.value.terminalGrowthRate[scenario],
          discountRate: inputs.value.discountRate[scenario],
          peRatio: inputs.value.peRatio[scenario],
          projectionYears: inputs.value.projectionYears
        }

        const results = calculateIntrinsicValue(scenarioInputs, dataToUse)
        
        scenarios.value[scenario] = {
          intrinsicValue: results.intrinsicValue,
          projectedPrices: results.projectedPrices,
          upside: results.upside,
          enterpriseValue: results.enterpriseValue,
          terminalValue: results.terminalValue
        }
      })
      
      // Use average scenario for main display values
      intrinsicValue.value = scenarios.value.average.intrinsicValue
      projectedPrices.value = scenarios.value.average.projectedPrices
      upside.value = scenarios.value.average.upside
      enterpriseValue.value = scenarios.value.average.enterpriseValue
      terminalValue.value = scenarios.value.average.terminalValue
      
      // Only set recommendation if we have valid results
      if (scenarios.value.average.intrinsicValue !== null && scenarios.value.average.upside !== null) {
        recommendation.value = getRecommendation(scenarios.value.average.upside)
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
      scenarios.value = {
        best: { intrinsicValue: null, projectedPrices: [], upside: null },
        average: { intrinsicValue: null, projectedPrices: [], upside: null },
        worst: { intrinsicValue: null, projectedPrices: [], upside: null }
      }
    }
  }

  // Watch for input changes and recalculate
  watch(inputs, calculate, { deep: true })

  // Calculate on initialization
  calculate()

  return {
    // Inputs
    inputs,
    
    // Results (average scenario)
    intrinsicValue,
    projectedPrices,
    upside,
    recommendation,
    enterpriseValue,
    terminalValue,
    
    // All scenarios
    scenarios,
    
    // Methods
    calculate
  }
}
