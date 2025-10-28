import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { calculateIntrinsicValue, getRecommendation } from '../services/dcf/dcfCalculator'
import { getDcfDataFromBatch, validateDcfData } from '../services/dcf/dcfDataService'
import { calculateAdvancedDcfValue, getFmpDcfFromBatch, getValuationRecommendation, generateScenariosFromAdvancedDcf } from '../services/dcf/valuationMethodsService'

interface ScenarioInputs {
  best: number
  average: number
  worst: number
}

interface DcfInputs {
  peRatio: ScenarioInputs
  fcfGrowthRate: ScenarioInputs
  terminalGrowthRate: ScenarioInputs
  discountRate: ScenarioInputs
  projectionYears: number
}

interface ScenarioResult {
  intrinsicValue: number | null
  projectedPrices: unknown[]
  upside: number | null
}

interface Scenarios {
  best: ScenarioResult
  average: ScenarioResult
  worst: ScenarioResult
}

interface Recommendation {
  label: string
  color: string
}

export interface UseDcfCalculatorReturn {
  inputs: Ref<DcfInputs>
  intrinsicValue: Ref<number | null>
  projectedPrices: Ref<unknown[]>
  upside: Ref<number | null>
  recommendation: Ref<Recommendation | null>
  scenarios: Ref<Scenarios>
  advancedDcfValue: Ref<unknown>
  fmpDcfValue: ComputedRef<unknown>
  fmpDcfLoading: ComputedRef<boolean>
  fmpDcfError: ComputedRef<string | null>
  pegError: Ref<string | null>
  companyData: ComputedRef<unknown>
  dataValidation: ComputedRef<{ valid: boolean; missingFields: string[] }>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  ticker: Ref<string>
  calculate: () => void
  calculateAdvancedDcfMethod: () => void
}

/**
 * DCF Calculator Composable
 * Follows project pattern: uses Pinia store, extracts data internally, manages reactive state
 * Matches design pattern of useRevenueSeries, useFcfSeries, etc.
 */
export function useDcfCalculator(): UseDcfCalculatorReturn {
  // Use Pinia store with storeToRefs to maintain reactivity (project pattern)
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)
  
  // Extract DCF data from batch (like other composables extract chart data)
  const companyData = computed<unknown>(() => {
    if (!batchData.value) return null
    return getDcfDataFromBatch(batchData.value)
  })
  
  // Validation state
  const dataValidation = computed(() => {
    if (!batchData.value) {
      return { valid: false, missingFields: ['No data loaded'], details: {} }
    }
    return validateDcfData(batchData.value) as { valid: boolean; missingFields: string[]; details: Record<string, string> }
  })
  
  // Error state (follows project pattern)
  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    if (!dataValidation.value.valid) {
      return `Missing data: ${dataValidation.value.missingFields.join(', ')}`
    }
    return null
  })
  
  // Default input values with scenario-based structure
  const baseGrowth = computed(() => {
    const data = companyData.value as any
    return data?.historicalGrowthRate || 10
  })
  
  const inputs = ref<DcfInputs>({
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
    projectionYears: 5
  })
  
  // Watch for company data changes and update FCF growth rate scenarios
  watch(companyData, (newData: any) => {
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
  const intrinsicValue = ref<number | null>(null)
  const projectedPrices = ref<unknown[]>([])
  const upside = ref<number | null>(null)
  const recommendation = ref<Recommendation | null>(null)
  const pegError = ref<string | null>(null)
  
  // Scenario results
  const scenarios = ref<Scenarios>({
    best: { intrinsicValue: null, projectedPrices: [], upside: null },
    average: { intrinsicValue: null, projectedPrices: [], upside: null },
    worst: { intrinsicValue: null, projectedPrices: [], upside: null }
  })

  // Alternative valuation methods
  const advancedDcfValue = ref<unknown>(null)
  const fmpDcfValue = computed<unknown>(() => {
    if (!batchData.value) return null
    
    const fmpData = getFmpDcfFromBatch(batchData.value) as any
    const compData = companyData.value as any
    
    if (!fmpData?.intrinsicValue || !compData?.currentPrice) {
      return fmpData
    }
    
    // Calculate upside vs current price
    const upsideValue = ((fmpData.intrinsicValue - compData.currentPrice) / compData.currentPrice) * 100
    
    return {
      ...fmpData,
      upside: upsideValue,
      recommendation: getValuationRecommendation(upsideValue)
    }
  })
  
  const fmpDcfLoading = computed(() => loading.value)
  const fmpDcfError = computed<string | null>(() => {
    // Only return error if there's an actual batch error, not just missing data
    if (batchError.value) return batchError.value
    return null
  })

  // Calculate DCF whenever inputs change
  const calculate = (): void => {
    try {
      // Need valid company data to calculate
      if (!companyData.value || !dataValidation.value.valid) {
        // Reset to null state
        intrinsicValue.value = null
        projectedPrices.value = []
        upside.value = null
        recommendation.value = null
        scenarios.value = {
          best: { intrinsicValue: null, projectedPrices: [], upside: null },
          average: { intrinsicValue: null, projectedPrices: [], upside: null },
          worst: { intrinsicValue: null, projectedPrices: [], upside: null }
        }
        advancedDcfValue.value = null
        return
      }
      
      // Calculate for all three scenarios
      const scenarioTypes: Array<'best' | 'average' | 'worst'> = ['best', 'average', 'worst']
      
      let capturedError: string | null = null
      
      scenarioTypes.forEach(scenario => {
        const scenarioInputs = {
          fcfGrowthRate: inputs.value.fcfGrowthRate[scenario],
          terminalGrowthRate: inputs.value.terminalGrowthRate[scenario],
          discountRate: inputs.value.discountRate[scenario],
          peRatio: inputs.value.peRatio[scenario],
          projectionYears: inputs.value.projectionYears
        }

        const results = calculateIntrinsicValue(scenarioInputs, companyData.value as any)
        
        // Capture error from average scenario
        if (scenario === 'average' && results.error) {
          capturedError = results.error
        }
        
        scenarios.value[scenario] = {
          intrinsicValue: results.intrinsicValue,
          projectedPrices: results.projectedPrices,
          upside: results.upside
        }
      })
      
      // Store PEG error if calculation failed
      pegError.value = capturedError
      
      // If PEG model failed but Advanced DCF is available, use it for chart scenarios
      const currentPriceValue = (companyData.value as any)?.currentPrice
      if (capturedError && advancedDcfValue.value && currentPriceValue) {
        console.log('[DCF Calculator] PEG model failed, using Advanced DCF for chart scenarios')
        const fallbackScenarios = generateScenariosFromAdvancedDcf(
          advancedDcfValue.value as any,
          currentPriceValue,
          inputs.value.projectionYears
        )
        
        if (fallbackScenarios) {
          scenarios.value = fallbackScenarios
          // Update display values from Advanced DCF scenarios
          intrinsicValue.value = fallbackScenarios.average.intrinsicValue
          projectedPrices.value = fallbackScenarios.average.projectedPrices
          upside.value = fallbackScenarios.average.upside
          
          if (fallbackScenarios.average.upside !== null) {
            recommendation.value = getRecommendation(fallbackScenarios.average.upside)
          }
          
          // Keep the error for display but provide chart data
          // The chart will show, error will be in tooltip/cards
          return
        }
      }
      
      // Use average scenario for main display values
      intrinsicValue.value = scenarios.value.average.intrinsicValue
      projectedPrices.value = scenarios.value.average.projectedPrices
      upside.value = scenarios.value.average.upside
      
      // Only set recommendation if we have valid results
      if (scenarios.value.average.intrinsicValue !== null && scenarios.value.average.upside !== null) {
        recommendation.value = getRecommendation(scenarios.value.average.upside)
      } else {
        recommendation.value = null
      }

      // Advanced DCF calculated separately via watch
    } catch (error) {
      console.error('[DCF Calculator] Calculation error:', error)
      // Reset on error
      intrinsicValue.value = null
      projectedPrices.value = []
      upside.value = null
      recommendation.value = null
      scenarios.value = {
        best: { intrinsicValue: null, projectedPrices: [], upside: null },
        average: { intrinsicValue: null, projectedPrices: [], upside: null },
        worst: { intrinsicValue: null, projectedPrices: [], upside: null }
      }
      advancedDcfValue.value = null
    }
  }

  // Calculate Advanced DCF valuation from FMP
  const calculateAdvancedDcfMethod = (): void => {
    if (!batchData.value) {
      advancedDcfValue.value = null
      return
    }

    const result = calculateAdvancedDcfValue((batchData.value as any).data)
    advancedDcfValue.value = result
  }

  // Watch for batch data changes to recalculate Advanced DCF
  watch(batchData, calculateAdvancedDcfMethod, { deep: true })

  // Watch for input changes and recalculate (debounced for performance)
  watch(inputs, calculate, { deep: true })
  
  // Recalculate when company data changes
  watch(companyData, calculate)

  // Calculate on initialization
  calculate()
  calculateAdvancedDcfMethod()

  return {
    // Inputs
    inputs,
    
    // Results (average scenario)
    intrinsicValue,
    projectedPrices,
    upside,
    recommendation,
    
    // All scenarios
    scenarios,
    
    // Alternative valuations
    advancedDcfValue,
    fmpDcfValue,
    fmpDcfLoading,
    fmpDcfError,
    pegError,
    
    // Company data & validation
    companyData,
    dataValidation,
    
    // State (follows project pattern)
    loading,
    error,
    ticker: currentTicker,
    
    // Methods
    calculate,
    calculateAdvancedDcfMethod
  }
}
