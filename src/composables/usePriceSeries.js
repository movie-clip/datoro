import { ref, watch, computed } from 'vue'
import { TIMEFRAMES, DEFAULT_TF } from '../models/timeframe'
import { useTickerData } from './useTickerData.js'
import { getPriceSeriesFromBatch } from '../services/financials/batchChartService.js'

export function usePriceSeries(tickerRef) {
  const tfKey   = ref(DEFAULT_TF);
  const title   = ref('Empty Chart');
  const message = ref('');
  const error   = ref(null);

  // Use batch data composable for price history
  const { data: batchData, loading, error: batchError, refresh } = useTickerData(tickerRef)

  // Extract and filter price series based on timeframe
  const series = computed(() => {
    const t = (tickerRef?.value || '').toUpperCase()
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
  watch([() => tickerRef?.value, tfKey, batchData], () => {
    const t = (tickerRef?.value || '').toUpperCase()
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['1M']
    
    if (!t) {
      title.value = 'Empty Chart'
      message.value = 'Enter a ticker'
      error.value = null
    } else if (series.value.length > 0) {
      // Have data - show it (ignore any old errors)
      title.value = `${t} ${cfg.title}`
      message.value = ''
      error.value = null
    } else if (batchError.value && !loading.value) {
      // Error and not loading - show error
      title.value = 'Error'
      message.value = batchError.value
      error.value = batchError.value
    } else if (!loading.value) {
      // No data and not loading - show no data
      title.value = 'No data'
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
