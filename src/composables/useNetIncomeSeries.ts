// Migrated composable for Net Income chart data
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getNetIncomeSeriesFromBatch, type SeriesPoint } from '../services/financials/batchChartService'
import type { FMPIncomeStatement } from '../types/fmp.types'

type Period = 'annual' | 'quarterly'

interface ViewModeOption {
  label: string
  value: string
}

interface SeriesItem {
  name: string
  data: SeriesPoint[] | [number, number][]  // Can be either SeriesPoint or simple 2-tuple for margin data
  type?: string
  yAxisIndex?: number
}

export interface UseNetIncomeSeriesReturn {
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
  const rawData = computed<SeriesPoint[]>(() =>
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

  // Combined net income bars with margin line for dual-axis view
  // Note: Component (NetIncomeChart.vue) overrides colors and itemStyle for color-coding
  const netIncomeWithMargin = computed<SeriesItem[]>(() => {
    if (!rawData.value || rawData.value.length === 0) return []
    
    const result: SeriesItem[] = [
      {
        name: 'Net Income',
        data: rawData.value,
        type: 'bar',
        yAxisIndex: 0
      }
    ]

    if (marginData.value.length > 0) {
      result.push({
        name: 'Net Margin %',
        data: marginData.value,
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
