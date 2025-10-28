import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { calculateIntrinsicValue, getRecommendation } from '../services/dcf/dcfCalculator'
import { getDcfDataFromBatch, validateDcfData } from '../services/dcf/dcfDataService'
import { calculateAdvancedDcfValue, getValuationRecommendation, generateScenariosFromAdvancedDcf } from '../services/dcf/valuationMethodsService'

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

export type ValuationModel = 'peg' | 'advancedDcf'

export interface UseDcfCalculatorReturn {
  inputs: Ref<DcfInputs>
  intrinsicValue: Ref<number | null>
  projectedPrices: Ref<unknown[]>
  upside: Ref<number | null>
  recommendation: Ref<Recommendation | null>
  scenarios: Ref<Scenarios>
  advancedDcfValue: Ref<unknown>
  pegError: Ref<string | null>
  selectedModel: Ref<ValuationModel>
  availableModels: ComputedRef<{ peg: boolean; advancedDcf: boolean }>
  selectModel: (model: ValuationModel) => void
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

  // Model selection state
  const selectedModel = ref<ValuationModel>('peg')
  const availableModels = computed(() => ({
    peg: pegError.value === null,
    advancedDcf: advancedDcfValue.value !== null && !('error' in (advancedDcfValue.value as any))
  }))

  // Calculation results
  const intrinsicValue = ref<number | null>(null)
  const projectedPrices = ref<unknown[]>([])
  const upside = ref<number | null>(null)
  const recommendation = ref<Recommendation | null>(null)
  const pegError = ref<string | null>(null)
  
  // Scenario results for PEG model
  const pegScenarios = ref<Scenarios>({
    best: { intrinsicValue: null, projectedPrices: [], upside: null },
    average: { intrinsicValue: null, projectedPrices: [], upside: null },
    worst: { intrinsicValue: null, projectedPrices: [], upside: null }
  })

  // Scenario results for Advanced DCF (generated from intrinsic value)
  const advancedDcfScenarios = ref<Scenarios>({
    best: { intrinsicValue: null, projectedPrices: [], upside: null },
    average: { intrinsicValue: null, projectedPrices: [], upside: null },
    worst: { intrinsicValue: null, projectedPrices: [], upside: null }
  })

  // Active scenarios based on selected model
  const scenarios = computed<Scenarios>(() => {
    return selectedModel.value === 'advancedDcf' ? advancedDcfScenarios.value : pegScenarios.value
  })

  // Alternative valuation methods
  const advancedDcfValue = ref<unknown>(null)

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
        pegScenarios.value = {
          best: { intrinsicValue: null, projectedPrices: [], upside: null },
          average: { intrinsicValue: null, projectedPrices: [], upside: null },
          worst: { intrinsicValue: null, projectedPrices: [], upside: null }
        }
        advancedDcfValue.value = null
        return
      }
      
      // Calculate for all three PEG scenarios
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
        
        // Use the last projected price as intrinsicValue (what chart shows)
        // This ensures card value matches the final year in the chart
        const lastProjectedPrice = results.projectedPrices.length > 0 
          ? results.projectedPrices[results.projectedPrices.length - 1]
          : null
        
        const lastPrice = lastProjectedPrice?.price ?? results.intrinsicValue
        
        const currentPrice = (companyData.value as any)?.quote?.price
        const lastPriceUpside = lastPrice && currentPrice
          ? ((lastPrice - currentPrice) / currentPrice) * 100
          : results.upside
        
        pegScenarios.value[scenario] = {
          intrinsicValue: lastPrice,
          projectedPrices: results.projectedPrices,
          upside: lastPriceUpside
        }
      })
      
      // Store PEG error if calculation failed
      pegError.value = capturedError
      
      // If PEG failed, auto-switch to Advanced DCF if available
      if (capturedError && selectedModel.value === 'peg') {
        if (advancedDcfValue.value && !('error' in (advancedDcfValue.value as any))) {
          selectedModel.value = 'advancedDcf'
        }
      }
      
      // Use average scenario for main display values (from active model)
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
      pegScenarios.value = {
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
      advancedDcfScenarios.value = {
        best: { intrinsicValue: null, projectedPrices: [], upside: null },
        average: { intrinsicValue: null, projectedPrices: [], upside: null },
        worst: { intrinsicValue: null, projectedPrices: [], upside: null }
      }
      return
    }

    const result = calculateAdvancedDcfValue((batchData.value as any).data)
    advancedDcfValue.value = result

    // Generate Advanced DCF scenarios for chart
    const currentPriceValue = (companyData.value as any)?.currentPrice || (companyData.value as any)?.quote?.price
    
    if (result && !('error' in result) && result.intrinsicValue && currentPriceValue) {
      const advDcfScenarios = generateScenariosFromAdvancedDcf(
        result as any,
        currentPriceValue,
        inputs.value.projectionYears
      )
      if (advDcfScenarios) {
        advancedDcfScenarios.value = advDcfScenarios
      } else {
        // Scenarios generation failed, clear them
        advancedDcfScenarios.value = {
          best: { intrinsicValue: null, projectedPrices: [], upside: null },
          average: { intrinsicValue: null, projectedPrices: [], upside: null },
          worst: { intrinsicValue: null, projectedPrices: [], upside: null }
        }
      }
    } else {
      advancedDcfScenarios.value = {
        best: { intrinsicValue: null, projectedPrices: [], upside: null },
        average: { intrinsicValue: null, projectedPrices: [], upside: null },
        worst: { intrinsicValue: null, projectedPrices: [], upside: null }
      }
    }
  }

  // Model selection
  const selectModel = (model: ValuationModel): void => {
    if (availableModels.value[model]) {
      selectedModel.value = model
    }
  }

  // Watch for batch data changes to recalculate Advanced DCF
  watch(batchData, calculateAdvancedDcfMethod, { deep: true })

  // Watch for input changes and recalculate both models
  watch(inputs, () => {
    calculate()  // PEG Model
    calculateAdvancedDcfMethod()  // Advanced DCF (regenerate scenarios with new projection years)
  }, { deep: true })
  
  // Recalculate when company data changes
  watch(companyData, () => {
    calculate()
    calculateAdvancedDcfMethod()
  })

  // Calculate on initialization
  calculate()
  calculateAdvancedDcfMethod()

  return {
    // Inputs
    inputs,
    
    // Model selection
    selectedModel,
    availableModels,
    selectModel,
    
    // Results (average scenario)
    intrinsicValue,
    projectedPrices,
    upside,
    recommendation,
    
    // All scenarios
    scenarios,
    
    // Alternative valuations
    advancedDcfValue,
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
