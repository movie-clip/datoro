import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getSharesSeriesFromBatch } from '../services/financials/batchChartService'

export interface UseSharesSeriesReturn {
  series: ComputedRef<[number, number][]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  refresh: () => void
}

export function useSharesSeries(periodRef?: Ref<'annual' | 'quarterly'>): UseSharesSeriesReturn {
  const title = ref('Shares Outstanding — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)

  // Memoized data extraction - single source of truth
  const series = computed<[number, number][]>(() => {
    // Use provided period ref or fallback to store's timeframe
    const period = periodRef?.value || timeframe.value
    return getSharesSeriesFromBatch(batchData.value, period)
  })

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && series.value.length === 0) {
      return `No shares data for '${t}'`
    }
    return null
  })

  // Update title based on ticker
  watch(() => [currentTicker.value, periodRef?.value, timeframe.value], ([ticker]) => {
    if (!ticker) {
      title.value = 'Shares Outstanding — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      // Keep original title, show error in message
      title.value = 'Shares Outstanding'
      message.value = error.value
    } else if (series.value.length === 0 && !loading.value) {
      title.value = 'Shares Outstanding — No data'
      message.value = `No shares data for '${ticker}'`
    } else {
      title.value = 'Shares Outstanding'
      message.value = ''
    }
  }, { immediate: true })

  function refresh(): void {
    // Batch data will auto-refresh via useTickerData
  }

  return { series, title, message, loading, error, refresh }
}
