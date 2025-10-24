import { ref, computed, watch } from 'vue'
import { calculateIntrinsicValue, getRecommendation } from '../services/dcf/dcfCalculator'

/**
 * DCF Calculator Composable
 * Manages state and calculations for DCF valuation model
 */
export function useDcfCalculator(currentPrice = 100) {
  // Default input values
  const inputs = ref({
    fcfGrowthRate: 10,
    terminalGrowthRate: 2.5,
    discountRate: 10,
    peRatio: 20,
    projectionYears: 10
  })

  // Calculation results
  const intrinsicValue = ref(null)
  const projectedPrices = ref([])
  const upside = ref(null)
  const recommendation = ref(null)

  // Calculate DCF whenever inputs change
  const calculate = () => {
    try {
      const results = calculateIntrinsicValue(inputs.value, currentPrice.value || 100)
      
      intrinsicValue.value = results.intrinsicValue
      projectedPrices.value = results.projectedPrices
      upside.value = results.upside
      recommendation.value = getRecommendation(results.upside)
    } catch (error) {
      console.error('DCF calculation error:', error)
      // Reset on error
      intrinsicValue.value = null
      projectedPrices.value = []
      upside.value = null
      recommendation.value = null
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
    
    // Methods
    calculate
  }
}
