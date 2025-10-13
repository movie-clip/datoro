import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getCashDebtSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useCashDebtSeries(tickerRef) {
  const title   = ref('Cash & Debt — Empty');
  const message = ref('');

  // Use batch data composable
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract cash/debt data from batch
  const rawData = computed(() => getCashDebtSeriesFromBatch(batchData.value, 'annual'))

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No data for '${t}'`
    }
    return null
  })

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

  // Update title based on ticker
  watch(() => tickerRef?.value, (t) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      title.value = 'Cash & Debt — Empty'
      message.value = 'Enter a ticker'
    } else if (rawData.value.length > 0) {
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
