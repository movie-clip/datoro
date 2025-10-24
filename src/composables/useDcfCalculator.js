import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { calculateIntrinsicValue, getRecommendation } from '../services/dcf/dcfCalculator'
import { getDcfDataFromBatch, validateDcfData } from '../services/dcf/dcfDataService'

/**
 * DCF Calculator Composable
 * Follows project pattern: uses Pinia store, extracts data internally, manages reactive state
 * Matches design pattern of useRevenueSeries, useFcfSeries, etc.
 */
export function useDcfCalculator() {
  // Use Pinia store with storeToRefs to maintain reactivity (project pattern)
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)
  
  // Extract DCF data from batch (like other composables extract chart data)
  const companyData = computed(() => {
    if (!batchData.value) return null
    return getDcfDataFromBatch(batchData.value)
  })
  
  // Validation state
  const dataValidation = computed(() => {
    if (!batchData.value) {
      return { valid: false, missingFields: ['No data loaded'] }
    }
    return validateDcfData(batchData.value)
  })
  
  // Error state (follows project pattern)
  const error = computed(() => {
    if (batchError.value) return batchError.value
    if (!dataValidation.value.valid) {
      return `Missing data: ${dataValidation.value.missingFields.join(', ')}`
    }
    return null
  })
  
  // Default input values with scenario-based structure
  const baseGrowth = computed(() => companyData.value?.historicalGrowthRate || 10)
  
  const inputs = ref({
    peRatio: {
      best: 24,      // 20 + 20%
      average: 20,
      worst: 16      // 20 - 20%
    },
    fcfGrowthRate: {
      best: Math.round(baseGrowth.value * 1.2 * 10) / 10,      // +20%
      average: baseGrowth.value,
      worst: Math.round(baseGrowth.value * 0.8 * 10) / 10       // -20%
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
  
  // Watch for company data changes and update FCF growth rate scenarios
  watch(companyData, (newData) => {
    if (newData && newData.historicalGrowthRate) {
      const growth = newData.historicalGrowthRate
      inputs.value.fcfGrowthRate = {
        best: Math.round(growth * 1.2 * 10) / 10,
        average: growth,
        worst: Math.round(growth * 0.8 * 10) / 10
      }
    }
  }, { immediate: true })

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
      // Need valid company data to calculate
      if (!companyData.value || !dataValidation.value.valid) {
        // Reset to null state
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
        return
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

        const results = calculateIntrinsicValue(scenarioInputs, companyData.value)
        
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
      console.error('[DCF Calculator] Calculation error:', error)
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

  // Watch for input changes and recalculate (debounced for performance)
  watch(inputs, calculate, { deep: true })
  
  // Recalculate when company data changes
  watch(companyData, calculate)

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
    
    // Company data & validation
    companyData,
    dataValidation,
    
    // State (follows project pattern)
    loading,
    error,
    ticker: currentTicker,
    
    // Methods
    calculate
  }
}
