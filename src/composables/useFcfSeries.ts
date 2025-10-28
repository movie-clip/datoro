import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getFcfSeriesFromBatch } from '../services/financials/batchChartService'

type Period = 'annual' | 'quarterly'
type ViewMode = 'fcfPerShare' | 'fcfAndSbc' | 'fcf'

interface SeriesItem {
  name: string
  data: [number, number][]
}

export interface UseFcfSeriesReturn {
  period: ComputedRef<Period>
  viewMode: Ref<ViewMode>
  series: ComputedRef<[number, number][] | SeriesItem[]>
  compactSeries: ComputedRef<SeriesItem[]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  refresh: () => void
  ticker: Ref<string>
  dataType: string
}

export function useFcfSeries(): UseFcfSeriesReturn {
  const viewMode = ref<ViewMode>('fcfAndSbc') // Default to showing both FCF & SBC
  const title = ref('Free Cash Flow — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction - single source of truth
  const rawData = computed(() => 
    getFcfSeriesFromBatch(batchData.value, period.value)
  )

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No FCF data for '${t}'`
    }
    return null
  })

  // Transform data based on view mode
  const series = computed<[number, number][] | SeriesItem[]>(() => {
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
  const compactSeries = computed<SeriesItem[]>(() => {
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
  function refresh(): void {
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
  }
}
