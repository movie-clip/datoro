import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getEpsSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useEpsSeries() {
  const title   = ref('EPS — Empty');
  const message = ref('');

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)

  // Memoized data extraction - single source of truth
  const series = computed(() => getEpsSeriesFromBatch(batchData.value))

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && series.value.length === 0) {
      return `No EPS data for '${t}'`
    }
    return null
  })

  // Update title based on ticker
  watch(currentTicker, (ticker) => {
    if (!ticker) {
      title.value = 'EPS — Empty'
      message.value = 'Enter a ticker'
    } else if (series.value.length > 0) {
      title.value = 'EPS'
      message.value = ''
    } else if (error.value && !loading.value) {
      // Keep original title, show error in message
      title.value = 'EPS'
      message.value = error.value
    } else if (!loading.value) {
      title.value = 'EPS — No data'
      message.value = `No EPS data for '${ticker}'`
    } else {
      title.value = 'EPS'
      message.value = ''
    }
  }, { immediate: true })

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { series, title, message, loading, error, refresh };
}
