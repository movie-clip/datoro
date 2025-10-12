// Migrated composable for Net Income chart data
import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getNetIncomeSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useNetIncomeSeries(tickerRef) {
  const period = ref('annual')
  const message = ref(null)

  // Use batch data composable (shares single API call)
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract net income data from batch
  const rawData = computed(() => 
    getNetIncomeSeriesFromBatch(batchData.value, period.value)
  )

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No net income data for '${t}'`
    }
    return null
  })

  const viewModeOptions = computed(() => [
    { label: 'Annual', value: 'annual' },
    { label: 'Quarterly', value: 'quarterly' }
  ])

  // Process net income data into chart series
  const series = computed(() => {
    if (!rawData.value || rawData.value.length === 0) return []
    
    return [{
      name: 'Net Income',
      data: rawData.value,
      color: '#4ade80' // green color for profit
    }]
  })

  const title = computed(() => 'Net Income')

  // Update message based on state
  watch([() => tickerRef?.value, rawData, loading], ([t]) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      message.value = null
    } else if (error.value) {
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
      message.value = `No ${period.value} net income data found for ${ticker}.`
    } else {
      message.value = null
    }
  })

  return {
    series,
    title,
    message,
    loading,
    error,
    period,
    viewModeOptions
  }
}
