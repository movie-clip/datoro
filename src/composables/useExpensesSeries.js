import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getExpensesSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useExpensesSeries(tickerRef) {
  const period = ref('annual')
  const selectedSegments = ref(['costOfRevenue', 'researchAndDevelopment', 'sellingGeneralAdmin']) // Show all by default
  const title = ref('Operating Expenses — Empty')
  const message = ref('')

  // Use batch data composable
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract expenses data from batch
  const rawData = computed(() => getExpensesSeriesFromBatch(batchData.value, period.value))

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No expense data for '${t}'`
    }
    return null
  })

  const segmentLabels = {
    total: 'Total Expenses',
    costOfRevenue: 'Cost of Revenue',
    researchAndDevelopment: 'R&D',
    sellingGeneralAdmin: 'SG&A'
  }

  // Compute series based on selected segments
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    // If only total is selected, return single series
    if (selectedSegments.value.length === 1 && selectedSegments.value[0] === 'total') {
      return rawData.value.map(d => [d.date, d.total])
    }
    
    // Filter out 'total' when other segments are selected
    const segments = selectedSegments.value.filter(s => s !== 'total')
    if (!segments.length) return []
    
    // Collect all dates
    const allDates = [...new Set(rawData.value.map(d => d.date))].sort((a, b) => a - b)
    
    // Create multi-series with stacking and colors
    const segmentColors = {
      costOfRevenue: '#ef4444',        // Red
      researchAndDevelopment: '#3b82f6', // Blue
      sellingGeneralAdmin: '#10b981'    // Green
    }
    
    return segments.map(segment => {
      // Align all data to common dates
      const alignedData = allDates.map(date => {
        const dataPoint = rawData.value.find(d => d.date === date)
        return [date, dataPoint ? dataPoint[segment] : 0]
      })
      
      return {
        name: segmentLabels[segment],
        data: alignedData,
        stack: 'expenses',
        itemStyle: { color: segmentColors[segment] }
      }
    })
  })

  // Compact series shows stacked expenses by default (same as full view)
  const compactSeries = computed(() => {
    return series.value
  })

  const viewModeOptions = computed(() => [
    { label: 'Total', value: 'total' },
    { label: 'Cost of Revenue', value: 'costOfRevenue' },
    { label: 'R&D', value: 'researchAndDevelopment' },
    { label: 'SG&A', value: 'sellingGeneralAdmin' }
  ])

  function resetSelection() {
    // Reset to showing all segments stacked
    selectedSegments.value = ['costOfRevenue', 'researchAndDevelopment', 'sellingGeneralAdmin']
  }

  // Update title based on ticker
  watch([() => tickerRef?.value, rawData, loading], ([t]) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      title.value = 'Operating Expenses — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      // Keep original title, show error in message
      title.value = 'Operating Expenses'
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
      title.value = 'Operating Expenses — No data'
      message.value = `No expense data for '${ticker}'`
    } else {
      title.value = 'Operating Expenses'
      message.value = ''
    }
  }, { immediate: true })

  // Reset selection when ticker changes
  watch(() => tickerRef?.value, () => resetSelection())

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { 
    period, 
    selectedSegments, 
    series, 
    compactSeries,
    viewModeOptions,
    title, 
    message, 
    loading, 
    error, 
    refresh,
    resetSelection
  }
}
