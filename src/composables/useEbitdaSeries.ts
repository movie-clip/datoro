import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getEbitdaSeriesFromBatch } from '../services/financials/batchChartService'

type Period = 'annual' | 'quarterly'
type ChartView = 'bridge' | 'margin'

interface SeriesItem {
  name: string
  data: [number, number][]
}

interface ViewModeOption {
  label: string
  value: string
}

interface SegmentConfig {
  label: string
  sign: number
}

interface SegmentData {
  segments: string[]
  series: Record<string, unknown>
}

export interface UseEbitdaSeriesReturn {
  series: ComputedRef<[number, number][] | SeriesItem[]>
  compactSeries: ComputedRef<[number, number][]>
  marginData: ComputedRef<[number, number][]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  refresh: () => void
  period: ComputedRef<Period>
  chartView: Ref<ChartView>
  selectedSegments: Ref<string[]>
  viewModeOptions: ComputedRef<ViewModeOption[]>
  segmentData: Ref<SegmentData>
}

export function useEbitdaSeries(): UseEbitdaSeriesReturn {
  const title = ref('EBITDA — Empty')
  const message = ref('')
  const chartView = ref<ChartView>('margin') // 'bridge' | 'margin' - default to margin view
  
  // Selected segments (components) to display (only for bridge view)
  const selectedSegments = ref<string[]>(['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization'])
  
  // All available segments
  const segmentData = ref<SegmentData>({
    segments: ['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization'],
    series: {}
  })

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { _batchData, _loading, _currentTicker, _error: batchError, _timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction - single source of truth
  const rawData = computed(() => getEbitdaSeriesFromBatch(batchData.value, period.value))

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No EBITDA data for '${t}'`
    }
    return null
  })

  // Map segment keys to display names and data
  const segmentConfig: Record<string, SegmentConfig> = {
    revenue: { label: 'Revenue', sign: 1 },
    costOfRevenue: { label: 'Cost of Revenue', sign: -1 },
    operatingExpenses: { label: 'Operating Expenses', sign: -1 },
    depreciationAndAmortization: { label: 'D&A', sign: 1 }
  }

  // Computed series based on selected view and segments
  const series = computed<[number, number][] | SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    if (chartView.value === 'margin') {
      // EBITDA with Margin view - return simple EBITDA bars (margin will be added by chart component)
      return rawData.value.map(d => [d.date, d.ebitda])
    }
    
    // Bridge view - show selected components
    const result: SeriesItem[] = []
    selectedSegments.value.forEach(segmentKey => {
      if (segmentConfig[segmentKey]) {
        const config = segmentConfig[segmentKey]
        result.push({
          name: config.label,
          data: rawData.value.map((d: any) => [d.date, d[segmentKey] * config.sign])
        })
      }
    })
    return result
  })
  
  // Compact series for default view - show EBITDA with margin
  const compactSeries = computed<[number, number][]>(() => {
    if (!rawData.value.length) return []
    
    // Return simple EBITDA bars for compact view (margin overlay handled by chart)
    return rawData.value.map(d => [d.date, d.ebitda])
  })
  
  // EBITDA margin data for overlay
  const marginData = computed<[number, number][]>(() => {
    if (!rawData.value.length) return []
    
    return rawData.value.map(d => {
      const margin = d.revenue > 0 ? (d.ebitda / d.revenue) * 100 : 0
      return [d.date, margin]
    })
  })
  
  // View mode options for segment selection
  const viewModeOptions = computed<ViewModeOption[]>(() => {
    return [
      { label: 'Revenue', value: 'revenue' },
      { label: 'Cost of Revenue', value: 'costOfRevenue' },
      { label: 'Operating Expenses', value: 'operatingExpenses' },
      { label: 'D&A', value: 'depreciationAndAmortization' }
    ]
  })

  // Update title based on ticker and view
  // Optimized: Only watch ticker and view (rawData/loading trigger via ticker change anyway)
  watch([() => currentTicker.value, chartView], () => {
    const ticker = currentTicker.value
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

  function refresh(): void {
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
  }
}
