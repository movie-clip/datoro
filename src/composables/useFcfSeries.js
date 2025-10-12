import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getFcfSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useFcfSeries(tickerRef) {
  const period  = ref('annual');
  const viewMode = ref('fcfAndSbc'); // Default to showing both FCF & SBC
  const title   = ref('Free Cash Flow — Empty');
  const message = ref('');

  // Use batch data composable (shares single API call with tables)
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract FCF data from batch
  const rawData = computed(() => 
    getFcfSeriesFromBatch(batchData.value, period.value)
  )

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
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
  watch(() => tickerRef?.value, (t) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      title.value = 'Free Cash Flow — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      title.value = 'Error'
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
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

  return { period, viewMode, series, compactSeries, title, message, loading, error, refresh };
}
