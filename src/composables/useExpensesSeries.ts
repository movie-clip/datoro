import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getExpensesSeriesFromBatch } from '../services/financials/batchChartService'
import { toDataPoint, type FiscalQuarterData } from '../utils/fiscalQuarterUtils'

type Period = 'annual' | 'quarterly'
type DataPoint = [number, number] | [number, number, string, string]

interface SeriesItem {
  name: string
  data: DataPoint[]
  stack: string
  itemStyle: { color: string }
}

interface ViewModeOption {
  label: string
  value: string
}

type SegmentKey = 'costOfRevenue' | 'researchAndDevelopment' | 'sellingGeneralAdmin'

const segmentLabels: Record<SegmentKey | 'total', string> = {
  total: 'Total Expenses',
  costOfRevenue: 'Cost of Revenue',
  researchAndDevelopment: 'R&D',
  sellingGeneralAdmin: 'SG&A'
}

export interface UseExpensesSeriesReturn {
  period: ComputedRef<Period>
  selectedSegments: Ref<string[]>
  series: ComputedRef<SeriesItem[]>
  compactSeries: ComputedRef<SeriesItem[]>
  viewModeOptions: ComputedRef<ViewModeOption[]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  refresh: () => void
  resetSelection: () => void
}

export function useExpensesSeries(): UseExpensesSeriesReturn {
  const selectedSegments = ref<string[]>(['costOfRevenue', 'researchAndDevelopment', 'sellingGeneralAdmin']) // Show all segments stacked by default
  const title = ref('Operating Expenses — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data - single source of truth
  const rawData = computed(() => getExpensesSeriesFromBatch(batchData.value, period.value))

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value
    // Don't show error during initial loading
    if (loading.value) return null
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No expense data for '${t}'`
    }
    return null
  })

  // Segment colors configuration
  const segmentColors: Record<SegmentKey, string> = {
    costOfRevenue: '#ef4444',        // Red
    researchAndDevelopment: '#3b82f6', // Blue
    sellingGeneralAdmin: '#10b981'    // Green
  }

  // Helper function to create stacked series for specified segments
  const createStackedSeries = (data: typeof rawData.value, segments: SegmentKey[]): SeriesItem[] => {
    if (!data.length) return []
    
    // Collect all dates with their fiscal quarter data
    const allDates = [...new Set(data.map(d => d.date))].sort((a, b) => a - b)
    
    return segments.map(segment => {
      // Align all data to common dates, preserving fiscal quarter info
      const alignedData = allDates.map(date => {
        const dataPoint = data.find(d => d.date === date)
        if (!dataPoint) return [date, 0] as DataPoint
        return toDataPoint(date, dataPoint[segment], dataPoint as FiscalQuarterData)
      })
      
      return {
        name: segmentLabels[segment],
        data: alignedData,
        stack: 'expenses',
        itemStyle: { color: segmentColors[segment] }
      }
    })
  }

  // Compute series based on selected segments
  const series = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    // If only total is selected, compute total from all segments
    if (selectedSegments.value.length === 1 && selectedSegments.value[0] === 'total') {
      const totalData = rawData.value.map(d => toDataPoint(
        d.date, 
        d.costOfRevenue + d.researchAndDevelopment + d.sellingGeneralAdmin,
        d as FiscalQuarterData
      ))
      
      return [{
        name: 'Total Expenses',
        data: totalData,
        stack: 'expenses',
        itemStyle: { color: '#5470C6' }
      }]
    }
    
    // Filter out 'total' when other segments are selected
    const segments = selectedSegments.value.filter(s => s !== 'total') as SegmentKey[]
    if (!segments.length) return []
    
    return createStackedSeries(rawData.value, segments)
  })

  // Compact series always shows all three segments stacked
  const compactSeries = computed<SeriesItem[]>(() => {
    const segments: SegmentKey[] = ['costOfRevenue', 'researchAndDevelopment', 'sellingGeneralAdmin']
    return createStackedSeries(rawData.value, segments)
  })

  const viewModeOptions = computed<ViewModeOption[]>(() => [
    { label: 'Total', value: 'total' },
    { label: 'Cost of Revenue', value: 'costOfRevenue' },
    { label: 'R&D', value: 'researchAndDevelopment' },
    { label: 'SG&A', value: 'sellingGeneralAdmin' }
  ])

  function resetSelection(): void {
    // Reset to showing all segments stacked
    selectedSegments.value = ['costOfRevenue', 'researchAndDevelopment', 'sellingGeneralAdmin']
  }

  // Update title based on ticker
  // Optimized: Only watch ticker (series/loading change when ticker changes)
  watch(() => currentTicker.value, (ticker) => {
    if (!ticker) {
      title.value = 'Operating Expenses — Empty'
      message.value = 'Enter a ticker'
    } else if (error.value) {
      // Keep original title, show error in message
      title.value = 'Operating Expenses'
      message.value = error.value
    } else if (series.value.length === 0 && !loading.value) {
      title.value = 'Operating Expenses — No data'
      message.value = `No expense data for '${ticker}'`
    } else {
      title.value = 'Operating Expenses'
      message.value = ''
    }
  }, { immediate: true })

  // Reset selection when ticker changes
  watch(currentTicker, () => resetSelection())

  function refresh(): void {
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
