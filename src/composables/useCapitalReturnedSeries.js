import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getCapitalReturnedSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useCapitalReturnedSeries() {
  const title = ref('Capital Returned to Shareholders — Empty');
  const message = ref('');
  const selectedSegments = ref(['dividends', 'buybacks']); // Default: show both

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)

  // Extract capital returned data from batch (always annual)
  const rawData = computed(() => getCapitalReturnedSeriesFromBatch(batchData.value, 'annual'))

  // Check if data is legitimately empty (company doesn't return capital)
  const hasNoCapitalReturns = computed(() => {
    if (!currentTicker.value || loading.value || batchError.value) return false
    return rawData.value.length === 0
  })

  const error = computed(() => {
    if (batchError.value) return batchError.value
    // Don't treat "no capital returns" as an error - it's legitimate
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
  // Optimized: Only watch ticker (other values update when ticker changes)
  watch(() => currentTicker.value, (ticker) => {
    if (!ticker) {
      title.value = 'Capital Returned to Shareholders — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      title.value = 'Capital Returned to Shareholders'
      message.value = error.value
    } else if (hasNoCapitalReturns.value) {
      title.value = `Capital Returned — ${ticker.toUpperCase()}`
      message.value = '' // Use emptyDataMessage instead
    } else {
      title.value = 'Capital Returned to Shareholders'
      message.value = ''
    }
  }, { immediate: true })

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  // Friendly message when company doesn't return capital
  const emptyDataMessage = computed(() => {
    if (!hasNoCapitalReturns.value) return null
    const ticker = currentTicker.value?.toUpperCase() || 'this company'
    return `${ticker} does not currently return capital to shareholders through dividends or buybacks`
  })

  return { 
    series, 
    title, 
    message, 
    loading, 
    error, 
    emptyDataMessage,
    refresh, 
    selectedSegments 
  }
}
