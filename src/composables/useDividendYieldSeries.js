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

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No dividend data for '${t}'`
    }
    return null
  })

  const series = computed(() => {
    if (!rawData.value.length) return []
    return rawData.value
  })

  // Update title based on ticker
  watch([() => currentTicker, rawData, loading], () => {
    const ticker = currentTicker
    if (!ticker) {
      title.value = 'Dividend Yield — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      // Keep original title, show error in message
      title.value = 'Dividend Yield'
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
      title.value = 'Dividend Yield — No data'
      message.value = `No dividend data for '${ticker}'`
    } else {
      title.value = 'Dividend Yield'
      message.value = ''
    }
  }, { immediate: true })

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { period, series, title, message, loading, error, refresh }
}
