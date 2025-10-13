import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getEbitdaSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useEbitdaSeries(tickerRef) {
  const title   = ref('EBITDA — Empty');
  const message = ref('');
  const period = ref('annual');
  const chartView = ref('margin'); // 'bridge' | 'margin' - default to margin view
  
  // Selected segments (components) to display (only for bridge view)
  const selectedSegments = ref(['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization']);
  
  // All available segments
  const segmentData = ref({
    segments: ['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization'],
    series: {}
  });

  // Use batch data composable
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract EBITDA data from batch
  const rawData = computed(() => getEbitdaSeriesFromBatch(batchData.value, period.value))

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = (tickerRef?.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No EBITDA data for '${t}'`
    }
    return null
  })

  // Map segment keys to display names and data
  const segmentConfig = {
    revenue: { label: 'Revenue', sign: 1 },
    costOfRevenue: { label: 'Cost of Revenue', sign: -1 },
    operatingExpenses: { label: 'Operating Expenses', sign: -1 },
    depreciationAndAmortization: { label: 'D&A', sign: 1 }
  };

  // Computed series based on selected view and segments
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    if (chartView.value === 'margin') {
      // EBITDA with Margin view - return simple EBITDA bars (margin will be added by chart component)
      return rawData.value.map(d => [d.date, d.ebitda])
    }
    
    // Bridge view - show selected components
    const result = []
    selectedSegments.value.forEach(segmentKey => {
      if (segmentConfig[segmentKey]) {
        const config = segmentConfig[segmentKey]
        result.push({
          name: config.label,
          data: rawData.value.map(d => [d.date, d[segmentKey] * config.sign])
        })
      }
    })
    return result
  })
  
  // Compact series for default view - show EBITDA with margin
  const compactSeries = computed(() => {
    if (!rawData.value.length) return []
    
    // Return simple EBITDA bars for compact view (margin overlay handled by chart)
    return rawData.value.map(d => [d.date, d.ebitda])
  })
  
  // EBITDA margin data for overlay
  const marginData = computed(() => {
    if (!rawData.value.length) return []
    
    return rawData.value.map(d => {
      const margin = d.revenue > 0 ? (d.ebitda / d.revenue) * 100 : 0
      return [d.date, margin]
    })
  })
  
  // View mode options for segment selection
  const viewModeOptions = computed(() => {
    return [
      { label: 'Revenue', value: 'revenue' },
      { label: 'Cost of Revenue', value: 'costOfRevenue' },
      { label: 'Operating Expenses', value: 'operatingExpenses' },
      { label: 'D&A', value: 'depreciationAndAmortization' }
    ]
  })

  // Update title based on ticker and view
  watch([() => tickerRef?.value, chartView, rawData, loading], ([t]) => {
    const ticker = (t || '').toUpperCase()
    if (!ticker) {
      title.value = 'EBITDA — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      // Keep original title based on current view, show error in message
      title.value = chartView.value === 'margin' ? 'EBITDA & Margin' : 'EBITDA Bridge'
      message.value = error.value
    } else if (rawData.value.length === 0 && !loading.value) {
      title.value = 'EBITDA — No data'
      message.value = `No EBITDA data for '${ticker}'`
    } else {
      title.value = chartView.value === 'margin' ? 'EBITDA & Margin' : 'EBITDA Bridge'
      message.value = ''
    }
  }, { immediate: true })

  function refresh() {
    // Batch data will auto-refresh via useTickerData
  }

  return { 
    series, 
    compactSeries, 
    marginData,
    title, 
    message, 
    loading, 
    error, 
    refresh, 
    period,
    chartView,
    selectedSegments,
    viewModeOptions,
    segmentData
  };
}
