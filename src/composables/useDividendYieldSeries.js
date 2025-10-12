import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getDividendYieldSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useDividendYieldSeries(tickerRef) {
  const period = ref('annual')
  const title = ref('Dividend Yield — Empty')
  const message = ref('')

  // Use batch data composable
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract dividend yield data from batch
  const rawData = computed(() => getDividendYieldSeriesFromBatch(batchData.value, period.value))

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
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
  watch([() => tickerRef?.value, rawData, loading], ([t]) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      title.value = 'Dividend Yield — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      title.value = 'Error'
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
