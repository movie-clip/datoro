import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getFcfSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useFcfSeries() {
  const period  = ref('annual');
  const viewMode = ref('fcfAndSbc'); // Default to showing both FCF & SBC
  const title   = ref('Free Cash Flow — Empty');
  const message = ref('');

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)

  // Extract FCF data from batch
  const rawData = computed(() => 
    getFcfSeriesFromBatch(batchData.value, period.value)
  )

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No FCF data for '${t}'`
    }
    return null
  })

  // Transform data based on view mode
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    switch (viewMode.value) {
      case 'fcfPerShare':
        return rawData.value.map(d => [d.date, d.fcfPerShare])
      case 'fcfAndSbc':
        // Return array of series for multi-bar chart
        return [
          { name: 'FCF', data: rawData.value.map(d => [d.date, d.fcf]) },
          { name: 'SBC', data: rawData.value.map(d => [d.date, d.sbc]) }
        ]
      case 'fcf':
      default:
        return rawData.value.map(d => [d.date, d.fcf])
    }
  })
  
  // Compact series for default view - always show FCF & SBC
  const compactSeries = computed(() => {
    if (!rawData.value.length) return []
    
    return [
      { name: 'FCF', data: rawData.value.map(d => [d.date, d.fcf]) },
      { name: 'SBC', data: rawData.value.map(d => [d.date, d.sbc]) }
    ]
  })

  // Update title based on ticker
  watch(currentTicker, (ticker) => {
    if (!ticker) {
      title.value = 'Free Cash Flow — Empty'
      message.value = 'Enter a ticker'
    } else if (rawData.value.length > 0) {
      title.value = 'Free Cash Flow'
      message.value = ''
    } else if (error.value && !loading.value) {
      // Keep original title, show error in message
      title.value = 'Free Cash Flow'
      message.value = error.value
    } else if (!loading.value) {
      title.value = 'Free Cash Flow — No data'
      message.value = `No FCF data for '${ticker}'`
    } else {
      title.value = 'Free Cash Flow'
      message.value = ''
    }
  }, { immediate: true })

  // Manual refresh function (forces batch data refresh)
  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { 
    period, 
    viewMode, 
    series, 
    compactSeries, 
    title, 
    message, 
    loading, 
    error, 
    refresh,
    ticker: currentTicker,  // For cached growth calculations in BaseChart
    dataType: 'fcf'         // Cache key identifier
  };
}
