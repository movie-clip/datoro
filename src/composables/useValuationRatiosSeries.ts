import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getValuationRatiosSeriesFromBatch, type ValuationRatiosDataPoint } from '../services/financials/batchChartService'

type Period = 'annual' | 'quarterly'

interface SeriesItem {
  name: string
  data: [number, number][]
}

export interface UseValuationRatiosSeriesReturn {
  period: ComputedRef<Period>
  series: ComputedRef<SeriesItem[]>
  compactSeries: ComputedRef<SeriesItem[]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  refresh: () => void
  ticker: Ref<string>
  dataType: string
}

export function useValuationRatiosSeries(): UseValuationRatiosSeriesReturn {
  const title = ref('P/E & P/S Ratios — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction - single source of truth
  const rawData = computed(() => 
    getValuationRatiosSeriesFromBatch(batchData.value, period.value)
  )

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    // Don't show error during initial loading
    if (loading.value) return null
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No valuation ratios data for '${t}'`
    }
    return null
  })

  // Transform data to multi-series format for dual-line chart
  const series = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    return [
      {
        name: 'P/E Ratio',
        data: rawData.value
          .filter(d => d.peRatio !== 0)
          .map(d => [d.date, d.peRatio] as [number, number])
      },
      {
        name: 'P/S Ratio',
        data: rawData.value
          .filter(d => d.psRatio !== 0)
          .map(d => [d.date, d.psRatio] as [number, number])
      }
    ].filter(s => s.data.length > 0) // Only include series with data
  })
  
  // Compact series (same as full view for this chart)
  const compactSeries = computed<SeriesItem[]>(() => series.value)

  // Update title based on ticker
  watch(currentTicker, (ticker) => {
    if (!ticker) {
      title.value = 'P/E & P/S Ratios — Empty'
      message.value = 'Enter a ticker'
    } else if (rawData.value.length > 0) {
      title.value = 'P/E & P/S Ratios'
      message.value = ''
    } else if (error.value && !loading.value) {
      // Keep original title, show error in message
      title.value = 'P/E & P/S Ratios'
      message.value = error.value
    } else if (!loading.value) {
      title.value = 'P/E & P/S Ratios — No data'
      message.value = `No ratios data for '${ticker}'`
    } else {
      title.value = 'P/E & P/S Ratios'
      message.value = ''
    }
  }, { immediate: true })

  // Manual refresh function (forces batch data refresh)
  function refresh(): void {
    // Batch data will auto-refresh via useTickerData
  }

  return { 
    period, 
    series, 
    compactSeries, 
    title, 
    message, 
    loading, 
    error, 
    refresh,
    ticker: currentTicker,  // For cached growth calculations in BaseChart
    dataType: 'valuationRatios'  // Cache key identifier
  }
}
