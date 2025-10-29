import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getCapitalReturnedSeriesFromBatch } from '../services/financials/batchChartService'

interface SeriesItem {
  name: string
  data: [number, number][]
  itemStyle: { color: string }
  stack: string
}

export interface UseCapitalReturnedSeriesReturn {
  series: ComputedRef<SeriesItem[]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  emptyDataMessage: ComputedRef<string | null>
  refresh: () => void
  selectedSegments: Ref<string[]>
}

export function useCapitalReturnedSeries(): UseCapitalReturnedSeriesReturn {
  const title = ref('Capital Returned to Shareholders — Empty')
  const message = ref('')
  const selectedSegments = ref<string[]>(['dividends', 'buybacks']) // Default: show both

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { _batchData, _loading, _currentTicker, _error: batchError, _timeframe } = storeToRefs(tickerStore)

  // Memoized raw data - single source of truth
  const rawData = computed(() => getCapitalReturnedSeriesFromBatch(batchData.value, timeframe.value))

  // Check if data is legitimately empty (company doesn't return capital)
  const hasNoCapitalReturns = computed(() => {
    if (!currentTicker.value || loading.value || batchError.value) return false
    return rawData.value.length === 0
  })

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    // Don't treat "no capital returns" as an error - it's legitimate
    return null
  })

  // Transform raw data into chart series based on selected segments
  const series = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    const chartSeries: SeriesItem[] = []
    
    // Add dividends series if selected
    if (selectedSegments.value.includes('dividends')) {
      chartSeries.push({
        name: 'Dividends',
        data: rawData.value.map(row => [row.date, row.dividends]),
        itemStyle: { color: '#60a5fa' }, // Blue
        stack: 'total'
      })
    }
    
    // Add buybacks series if selected
    if (selectedSegments.value.includes('buybacks')) {
      chartSeries.push({
        name: 'Share Buybacks',
        data: rawData.value.map(row => [row.date, row.buybacks]),
        itemStyle: { color: '#34d399' }, // Green
        stack: 'total'
      })
    }
    
    return chartSeries
  })

  // Update title based on ticker
  // Optimized: Only watch ticker (other values update when ticker changes)
  watch(() => currentTicker.value, (ticker) => {
    if (!ticker) {
      title.value = 'Capital Returned to Shareholders — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      title.value = 'Capital Returned to Shareholders'
      message.value = error.value
    } else if (hasNoCapitalReturns.value) {
      title.value = `Capital Returned — ${ticker.toUpperCase()}`
      message.value = '' // Use emptyDataMessage instead
    } else {
      title.value = 'Capital Returned to Shareholders'
      message.value = ''
    }
  }, { immediate: true })

  function refresh(): void {
    // Batch data will auto-refresh via useTickerData
  }

  // Friendly message when company doesn't return capital
  const emptyDataMessage = computed<string | null>(() => {
    if (!hasNoCapitalReturns.value) return null
    const ticker = currentTicker.value?.toUpperCase() || 'this company'
    return `${ticker} does not currently return capital to shareholders through dividends or buybacks`
  })

  return { 
    series, 
    title, 
    message, 
    loading, 
    error, 
    emptyDataMessage,
    refresh, 
    selectedSegments 
  }
}
