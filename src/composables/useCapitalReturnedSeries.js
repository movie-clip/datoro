import { ref, computed, watch } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getCapitalReturnedSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useCapitalReturnedSeries(tickerRef) {
  const title = ref('Capital Returned to Shareholders — Empty');
  const message = ref('');
  const selectedSegments = ref(['dividends', 'buybacks']); // Default: show both

  // Use batch data composable
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract capital returned data from batch (always annual)
  const rawData = computed(() => getCapitalReturnedSeriesFromBatch(batchData.value, 'annual'))

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No capital return data for '${t}'`
    }
    return null
  })

  // Transform raw data into chart series based on selected segments
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    const chartSeries = []
    
    // Add dividends series if selected
    if (selectedSegments.value.includes('dividends')) {
      chartSeries.push({
        name: 'Dividends',
        data: rawData.value.map(row => [row.date, row.dividends]),
        itemStyle: { color: '#60a5fa' }, // Blue
        stack: 'total'
      })
    }
    
    // Add buybacks series if selected
    if (selectedSegments.value.includes('buybacks')) {
      chartSeries.push({
        name: 'Share Buybacks',
        data: rawData.value.map(row => [row.date, row.buybacks]),
        itemStyle: { color: '#34d399' }, // Green
        stack: 'total'
      })
    }
    
    return chartSeries
  })

  // Update title based on ticker
  watch([() => tickerRef?.value, rawData, loading], ([t]) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      title.value = 'Capital Returned to Shareholders — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      // Keep original title, show error in message
      title.value = 'Capital Returned to Shareholders'
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
      title.value = 'Capital Returned — No data'
      message.value = `No capital return data for '${ticker}'`
    } else {
      title.value = 'Capital Returned to Shareholders'
      message.value = ''
    }
  }, { immediate: true })

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { series, title, message, loading, error, refresh, selectedSegments };
}
