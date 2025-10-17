import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { TIMEFRAMES, DEFAULT_TF } from '../models/timeframe'
import { useTickerStore } from '../stores/tickerStore'
import { getPriceSeriesFromBatch } from '../services/financials/batchChartService.js'

export function usePriceSeries() {
  const tfKey   = ref(DEFAULT_TF);
  const title   = ref('Empty Chart');
  const message = ref('');
  const error   = ref(null);

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)
  const { refresh } = tickerStore

  // Extract and filter price series based on timeframe
  const series = computed(() => {
    const t = currentTicker
    if (!t) return []
    
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['1M']
    const rawPrices = getPriceSeriesFromBatch(batchData.value)
    
    if (!rawPrices.length) return []
    
    // Filter by timeframe
    const maxDays = mapTimeframeToMaxDays(cfg.range)
    if (maxDays) {
      const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000)
      return rawPrices.filter(point => point[0] >= cutoffTime)
    }
    
    return rawPrices
  })

  // Update title when ticker or timeframe changes
  watch([() => currentTicker, tfKey, () => batchData], () => {
    const t = currentTicker
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['1M']
    
    title.value = 'Price'
    if (!t) {
      message.value = 'Enter a ticker'
      error.value = null
    } else if (series.value.length > 0) {
      // Have data - show it (ignore any old errors)
      message.value = ''
      error.value = null
    } else if (batchError.value && !loading.value) {
      // Error and not loading - keep original title, show error in message
      message.value = batchError.value
      error.value = batchError.value
    } else if (!loading.value) {
      // No data and not loading - show no data
      message.value = `No data for '${t}'.`
      error.value = null
    } else {
      // Loading - keep previous title or show loading state
      if (!title.value || title.value === 'Empty Chart') {
        title.value = `${t} ${cfg.title}`
      }
      message.value = ''
      error.value = null
    }
  }, { immediate: true })

  return { tfKey, series, title, message, loading, error, retry: refresh };
}

// Map timeframe range to max days for filtering
function mapTimeframeToMaxDays(range) {
  switch (range) {
    case '5d': return 7
    case '1mo': return 31
    case '6mo': return 200
    case 'ytd': return daysSinceStartOfYear()
    case '5y': return 1850
    case 'max':
    default:
      return null // full history
  }
}

function daysSinceStartOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1)
}
