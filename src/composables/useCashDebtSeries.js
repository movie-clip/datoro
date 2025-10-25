import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getCashDebtSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useCashDebtSeries() {
  const title   = ref('Cash & Debt — Empty');
  const message = ref('');

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)

  // Memoized raw data - single source of truth
  const rawData = computed(() => getCashDebtSeriesFromBatch(batchData.value, 'annual'))

  // Transform raw data into multi-series format for dual-bar chart
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    return [
      {
        name: 'Cash',
        data: rawData.value.map(d => [d.date, d.cash])
      },
      {
        name: 'Debt',
        data: rawData.value.map(d => [d.date, d.debt]),
        itemStyle: { color: '#ff6b6b' }
      }
    ]
  });

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No cash/debt data for '${t}'`
    }
    return null
  })

  // Update title based on ticker
  watch(currentTicker, (ticker) => {
    if (!ticker) {
      title.value = 'Cash & Debt — Empty'
      message.value = 'Enter a ticker'
    } else if (series.value.length > 0) {
      // Have data - show it
      title.value = 'Cash & Debt'
      message.value = ''
    } else if (error.value && !loading.value) {
      // Keep original title, show error in message
      title.value = 'Cash & Debt'
      message.value = error.value
    } else if (!loading.value) {
      // No data and not loading
      title.value = 'Cash & Debt — No data'
      message.value = `No data for '${ticker}'`
    } else {
      // Loading - set title optimistically
      title.value = 'Cash & Debt'
      message.value = ''
    }
  }, { immediate: true })

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { series, title, message, loading, error, refresh };
}
