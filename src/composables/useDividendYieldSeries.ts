import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getDividendYieldSeriesFromBatch } from '../services/financials/batchChartService'

type Period = 'annual' | 'quarterly'

export interface UseDividendYieldSeriesReturn {
  period: ComputedRef<Period>
  series: ComputedRef<[number, number][]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  emptyDataMessage: ComputedRef<string | null>
  refresh: () => void
}

export function useDividendYieldSeries(): UseDividendYieldSeriesReturn {
  const title = ref('Dividend Yield — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { _batchData, _loading, _currentTicker, _error: batchError, _timeframe } = storeToRefs(tickerStore)
  
  // Use timeframe from store instead of local ref
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data - single source of truth
  const rawData = computed(() => getDividendYieldSeriesFromBatch(batchData.value, period.value))

  // Check if data is legitimately empty (company doesn't pay dividends)
  const hasNoDividends = computed(() => {
    if (!currentTicker.value || loading.value || batchError.value) return false
    return rawData.value.length === 0
  })

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    // Don't treat "no dividends" as an error - it's legitimate data
    return null
  })

  const series = computed<[number, number][]>(() => {
    if (!rawData.value.length) return []
    return rawData.value
  })

  // Update title based on ticker
  // Optimized: Only watch ticker (other values update when ticker changes)
  watch(() => currentTicker.value, (ticker) => {
    if (!ticker) {
      title.value = 'Dividend Yield — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      title.value = 'Dividend Yield'
      message.value = error.value
    } else if (hasNoDividends.value) {
      title.value = `Dividend Yield — ${ticker.toUpperCase()}`
      message.value = '' // Empty message, will use emptyDataMessage prop instead
    } else {
      title.value = 'Dividend Yield'
      message.value = ''
    }
  }, { immediate: true })

  function refresh(): void {
    // Batch data will auto-refresh via useTickerData
  }

  // Friendly message when company doesn't pay dividends
  const emptyDataMessage = computed<string | null>(() => {
    if (!hasNoDividends.value) return null
    const ticker = currentTicker.value?.toUpperCase() || 'this company'
    return `${ticker} does not currently pay dividends`
  })

  return { 
    period, 
    series, 
    title, 
    message, 
    loading, 
    error, 
    emptyDataMessage,
    refresh 
  }
}
