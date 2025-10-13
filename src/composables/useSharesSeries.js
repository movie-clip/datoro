import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getSharesSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useSharesSeries(tickerRef, periodRef) {
  const title   = ref('Shares Outstanding — Empty');
  const message = ref('');

  // Use batch data composable
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract shares data from batch
  const series = computed(() => {
    const period = periodRef?.value || 'annual'
    return getSharesSeriesFromBatch(batchData.value, period)
  })

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
    if (t && series.value.length === 0) {
      return `No shares data for '${t}'`
    }
    return null
  })

  // Update title based on ticker
  watch(() => [tickerRef?.value, periodRef?.value], ([t]) => {
    const ticker = (t || '').toUpperCase()
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

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { series, title, message, loading, error, refresh };
}
