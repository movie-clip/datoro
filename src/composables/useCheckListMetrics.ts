import { computed, type ComputedRef } from 'vue'
import { getRevenueSeriesFromBatch, getNetIncomeSeriesFromBatch, getEpsSeriesFromBatch } from '../services/financials/batchChartService'
import { getGrowthRates } from '../services/financials/growthService'
import { getCashFlowFactsFromBatch } from '../services/financials/batchTableService'
import type { BatchData } from '../types/batch.types'
import type { FMPRatiosTTM, FMPIncomeStatement } from '../types/fmp.types'

interface CheckListMetricsInput {
  batchData: ComputedRef<BatchData | null>
  ratios: ComputedRef<FMPRatiosTTM[] | null>
  incomeStatements: ComputedRef<{ annual: FMPIncomeStatement[]; quarterly: FMPIncomeStatement[] } | null>
}

// Helper function to calculate 5-year growth rate from series data
// Returns decimal value (e.g., 0.153 for 15.3% growth) or null if insufficient data
const calculateFiveYearGrowth = (series: Array<[number, number] | [number, number, string, string]>): number | null => {
  if (!series || series.length === 0) return null
  
  // Convert SeriesPoint [timestamp, value, period, fiscalYear] to [timestamp, value]
  const simpleSeries = series.map(([timestamp, value]) => [timestamp, value] as [number, number])
  const growth = getGrowthRates(simpleSeries)
  
  // Convert from percentage to decimal (growth returns 15.3, we need 0.153)
  return growth.fiveYear !== null ? growth.fiveYear / 100 : null
}

export function useCheckListMetrics(input: CheckListMetricsInput) {
  const { batchData, ratios, incomeStatements } = input

  // Revenue Growth (5Y)
  const revenueGrowth = computed(() => {
    const revenueSeries = getRevenueSeriesFromBatch(batchData.value || null, 'annual')
    return calculateFiveYearGrowth(revenueSeries)
  })

  // Net Income Growth (5Y)
  const netIncomeGrowth = computed(() => {
    const netIncomeSeries = getNetIncomeSeriesFromBatch(batchData.value || null, 'annual')
    return calculateFiveYearGrowth(netIncomeSeries)
  })

  // EPS Growth (5Y)
  const epsGrowth = computed(() => {
    const epsSeries = getEpsSeriesFromBatch(batchData.value || null, 'annual')
    return calculateFiveYearGrowth(epsSeries)
  })

  // FCF Yield
  const fcfYield = computed(() => {
    // Get FCF Yield from calculated cash flow facts (same as health indicators)
    const cashFlow = getCashFlowFactsFromBatch(batchData.value || null)
    // fcfYield is a formatted string like "-87.7%" or "5.2%"
    // Parse it to get the decimal value for threshold check
    const parsed = parseFloat(cashFlow.fcfYield)
    return !isNaN(parsed) ? parsed / 100 : null // Convert -87.7 to -0.877
  })

  // Gross Margin
  const grossMargin = computed(() => {
    const latestRatio = ratios.value?.[0]
    // Get current gross margin - grossProfitMargin from ratios is in decimal (0.82)
    return latestRatio?.grossProfitMargin || null
  })

  // Shares Outstanding Change (5Y)
  const sharesOutstandingChange = computed(() => {
    // Calculate 5-year growth for shares outstanding (negative = buybacks)
    const annual = incomeStatements.value?.annual
    if (!annual || annual.length < 6) return null
    
    // Build time series for shares outstanding
    const sharesSeries = annual
      .filter(stmt => stmt.date && stmt.weightedAverageShsOut)
      .map(stmt => [Date.parse(stmt.date), stmt.weightedAverageShsOut] as [number, number])
    
    const growth = getGrowthRates(sharesSeries)
    return growth.fiveYear !== null ? growth.fiveYear / 100 : null
  })

  // Altman Z-Score
  const altmanZScore = computed(() => {
    const scores = batchData.value?.data?.financialScores
    if (!scores || !Array.isArray(scores) || scores.length === 0) return null
    const score = scores[0]?.altmanZScore
    return typeof score === 'number' ? score : (typeof score === 'string' ? parseFloat(score) : null)
  })

  return {
    revenueGrowth,
    netIncomeGrowth,
    epsGrowth,
    fcfYield,
    grossMargin,
    sharesOutstandingChange,
    altmanZScore
  }
}
