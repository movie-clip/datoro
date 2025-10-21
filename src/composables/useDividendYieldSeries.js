import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getDividendYieldSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useDividendYieldSeries() {
  const period = ref('annual')
  const title = ref('Dividend Yield — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)

  // Extract dividend yield data from batch
  const rawData = computed(() => getDividendYieldSeriesFromBatch(batchData.value, period.value))

  // Check if data is legitimately empty (company doesn't pay dividends)
  const hasNoDividends = computed(() => {
    if (!currentTicker.value || loading.value || batchError.value) return false
    return rawData.value.length === 0
  })

  const error = computed(() => {
    if (batchError.value) return batchError.value
    // Don't treat "no dividends" as an error - it's legitimate data
    return null
  })

  const series = computed(() => {
    if (!rawData.value.length) return []
    return rawData.value
  })

  // Update title based on ticker
  watch([() => currentTicker, rawData, loading, hasNoDividends], () => {
    const ticker = currentTicker.value
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

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  // Friendly message when company doesn't pay dividends
  const emptyDataMessage = computed(() => {
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
