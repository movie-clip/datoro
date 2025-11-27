import { ref, computed, watch, markRaw, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getFcfSeriesFromBatch } from '../services/financials/batchChartService'
import { toDataPoint, type FiscalQuarterData } from '../utils/fiscalQuarterUtils'

type Period = 'annual' | 'quarterly'
type ViewMode = 'fcfPerShare' | 'fcfAndSbc' | 'fcf'
type YFormat = 'short' | 'decimal'
type DataPoint = [number, number] | [number, number, string, string]

interface SeriesItem {
  name: string
  data: DataPoint[]
}

export interface UseFcfSeriesReturn {
  period: ComputedRef<Period>
  viewMode: Ref<ViewMode>
  yFormat: ComputedRef<YFormat>
  series: ComputedRef<DataPoint[] | SeriesItem[]>
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

  // Memoized raw data extraction - single source of truth (markRaw for performance)
  const rawData = computed(() => 
    markRaw(getFcfSeriesFromBatch(batchData.value, period.value))
  )

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    // Don't show error during initial loading
    if (loading.value) return null
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No FCF data for '${t}'`
    }
    return null
  })

  // Y-axis format based on view mode
  const yFormat = computed<YFormat>(() => {
    return viewMode.value === 'fcfPerShare' ? 'decimal' : 'short'
  })

  // Helper function to create FCF & SBC dual series
  const createFcfSbcSeries = (data: typeof rawData.value): SeriesItem[] => {
    return [
      { name: 'FCF', data: data.map(d => toDataPoint(d.date, d.fcf, d as FiscalQuarterData)) },
      { name: 'SBC', data: data.map(d => toDataPoint(d.date, d.sbc, d as FiscalQuarterData)) }
    ]
  }

  // Transform data based on view mode
  const series = computed<DataPoint[] | SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    switch (viewMode.value) {
      case 'fcfPerShare':
        // Filter out zero/null values for FCF Per Share
        return rawData.value
          .filter(d => d.fcfPerShare && d.fcfPerShare !== 0)
          .map(d => toDataPoint(d.date, d.fcfPerShare, d as FiscalQuarterData))
      case 'fcfAndSbc':
        // Return array of series for multi-bar chart
        return createFcfSbcSeries(rawData.value)
      case 'fcf':
      default:
        return rawData.value.map(d => toDataPoint(d.date, d.fcf, d as FiscalQuarterData))
    }
  })
  
  // Compact series for default view - reuses FCF & SBC dual series creation
  const compactSeries = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    return createFcfSbcSeries(rawData.value)
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
    yFormat,
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
