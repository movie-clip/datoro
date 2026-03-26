import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getEbitdaSeriesFromBatch } from '../services/financials/batchChartService'
import { toDataPoint, type FiscalQuarterData } from '../utils/fiscalQuarterUtils'

type Period = 'annual' | 'quarterly'
type ChartView = 'bridge' | 'margin'

// Support both simple and fiscal quarter-aware data points
type DataPoint = [number, number] | [number, number, string, string]

interface SeriesItem {
  name: string
  data: DataPoint[]
}

interface ViewModeOption {
  label: string
  value: string
}

interface SegmentConfig {
  label: string
  sign: number
  key: 'revenue' | 'costOfRevenue' | 'operatingExpenses' | 'depreciationAndAmortization'
}

interface SegmentData {
  segments: string[]
  series: Record<string, unknown>
}

interface EbitdaSeriesPoint extends FiscalQuarterData {
  date: number
  ebitda: number
  revenue: number
  costOfRevenue: number
  operatingExpenses: number
  depreciationAndAmortization: number
}

export interface UseEbitdaSeriesReturn {
  series: ComputedRef<DataPoint[] | SeriesItem[]>
  compactSeries: ComputedRef<DataPoint[]>
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
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction - single source of truth
  const rawData = computed(() => getEbitdaSeriesFromBatch(batchData.value ?? null, period.value))

  const error = computed<string | null>(() => {
    if (batchError.value) {
      return batchError.value instanceof Error
        ? batchError.value.message
        : typeof batchError.value === 'string'
          ? batchError.value
          : 'Failed to load EBITDA data'
    }
    // Don't show error during initial loading
    if (loading.value) return null
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No EBITDA data for '${t}'`
    }
    return null
  })

  // Map segment keys to display names and data
  const segmentConfig: Record<string, SegmentConfig> = {
    revenue: { label: 'Revenue', sign: 1, key: 'revenue' },
    costOfRevenue: { label: 'Cost of Revenue', sign: -1, key: 'costOfRevenue' },
    operatingExpenses: { label: 'Operating Expenses', sign: -1, key: 'operatingExpenses' },
    depreciationAndAmortization: { label: 'D&A', sign: 1, key: 'depreciationAndAmortization' }
  }

  // Helper function to create EBITDA data points with fiscal quarter info
  const createEbitdaDataPoints = (data: typeof rawData.value): DataPoint[] => {
    return data.map(d => toDataPoint(d.date, d.ebitda, d as FiscalQuarterData))
  }

  // Computed series based on selected view and segments
  const series = computed<DataPoint[] | SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    if (chartView.value === 'margin') {
      // EBITDA with Margin view - return simple EBITDA bars (margin will be added by chart component)
      return createEbitdaDataPoints(rawData.value)
    }
    
    // Bridge view - show selected components
    const result: SeriesItem[] = []
    selectedSegments.value.forEach(segmentKey => {
      if (segmentConfig[segmentKey]) {
        const config = segmentConfig[segmentKey]
        result.push({
          name: config.label,
          data: rawData.value.map((d: EbitdaSeriesPoint) => 
            toDataPoint(d.date, d[config.key] * config.sign, d as FiscalQuarterData)
          )
        })
      }
    })
    return result
  })
  
  // Compact series for default view - reuses EBITDA data point creation
  const compactSeries = computed<DataPoint[]>(() => {
    if (!rawData.value.length) return []
    return createEbitdaDataPoints(rawData.value)
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
