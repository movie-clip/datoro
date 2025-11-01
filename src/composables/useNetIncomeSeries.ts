// Migrated composable for Net Income chart data
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getNetIncomeSeriesFromBatch } from '../services/financials/batchChartService'
import type { FMPIncomeStatement } from '../types/fmp.types'

type Period = 'annual' | 'quarterly'

interface ViewModeOption {
  label: string
  value: string
}

interface SeriesItem {
  name: string
  data: [number, number][]
  color?: string
  type?: string
  yAxisIndex?: number
}

export interface UseNetIncomeSeriesReturn {
  series: ComputedRef<SeriesItem[]>
  netIncomeWithMargin: ComputedRef<SeriesItem[]>
  title: ComputedRef<string>
  message: Ref<string | null>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  period: ComputedRef<Period>
  viewModeOptions: ComputedRef<ViewModeOption[]>
  ticker: Ref<string>
  dataType: string
}

export function useNetIncomeSeries(): UseNetIncomeSeriesReturn {
  const message = ref<string | null>(null)

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction - single source of truth
  const rawData = computed<[number, number][]>(() =>
    getNetIncomeSeriesFromBatch(batchData.value, period.value)
  )

  // Extract net margin data from income statements
  const marginData = computed<[number, number][]>(() => {
    const income = period.value === 'annual'
      ? batchData.value?.data?.incomeAnnual
      : batchData.value?.data?.incomeQuarter

    if (!income || !Array.isArray(income)) return []

    return income
      .map((row: FMPIncomeStatement) => {
        if (!row.date) return null
        const margin = Number(row.netIncomeRatio) || 0
        // Convert to percentage (ratio is 0-1, we want 0-100)
        return [new Date(row.date).getTime(), margin * 100] as [number, number]
      })
      .filter((point): point is [number, number] => point !== null)
      .sort((a, b) => a[0] - b[0])
  })

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    // Don't show error during initial loading
    if (loading.value) return null
    const t = currentTicker.value
    if (t && rawData.value.length === 0) {
      return `No net income data for '${t}'`
    }
    return null
  })

  const viewModeOptions = computed<ViewModeOption[]>(() => [
    { label: 'Annual', value: 'annual' },
    { label: 'Quarterly', value: 'quarterly' }
  ])

  // Process net income data into chart series
  const series = computed<SeriesItem[]>(() => {
    if (!rawData.value || rawData.value.length === 0) return []
    
    return [{
      name: 'Net Income',
      data: rawData.value,
      color: '#5470c6' // ECharts default blue (matches Revenue chart)
    }]
  })

  // Combined net income bars with margin line for dual-axis view
  const netIncomeWithMargin = computed<SeriesItem[]>(() => {
    if (!rawData.value || rawData.value.length === 0) return []
    
    const result: SeriesItem[] = [
      {
        name: 'Net Income',
        data: rawData.value,
        color: '#5470c6', // ECharts default blue (matches Revenue chart)
        type: 'bar',
        yAxisIndex: 0
      }
    ]

    if (marginData.value.length > 0) {
      result.push({
        name: 'Net Margin %',
        data: marginData.value,
        color: '#4ade80', // green color for margin line
        type: 'line',
        yAxisIndex: 1
      })
    }

    return result
  })

  const title = computed(() => 'Net Income')

  // Update message based on state
  // Optimized: Only watch ticker (rawData/loading change when ticker changes)
  watch(() => currentTicker.value, (ticker) => {
    if (!ticker) {
      message.value = null
    } else if (error.value) {
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
      message.value = `No ${period.value} net income data found for ${ticker}.`
    } else {
      message.value = null
    }
  })

  return {
    series,
    netIncomeWithMargin,
    title,
    message,
    loading,
    error,
    period,
    viewModeOptions,
    ticker: currentTicker,  // For cached growth calculations in BaseChart
    dataType: 'netIncome'   // Cache key identifier
  }
}
