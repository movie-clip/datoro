import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getRevenueSeriesFromBatch, getRevenueSegmentsFromBatch } from '../services/financials/batchChartService'

type Period = 'annual' | 'quarterly'

interface ViewModeOption {
  label: string
  value: string
}

interface SeriesDataPoint {
  name: string
  data: [number, number][]
  stack: string
}

export interface UseRevenueSeriesReturn {
  period: ComputedRef<Period>
  selectedSegments: Ref<string[]>
  viewModeOptions: ComputedRef<ViewModeOption[]>
  series: ComputedRef<[number, number][] | SeriesDataPoint[]>
  compactSeries: ComputedRef<[number, number][]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  refresh: () => void
  ticker: Ref<string>
  dataType: string
}

export function useRevenueSeries(): UseRevenueSeriesReturn {
  const selectedSegments = ref<string[]>(['total'])
  const title = ref('Revenue')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store ('annual' | 'quarterly') to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized data extraction from batch
  // Note: These intermediate computed are acceptable because they're accessed with .value
  // in consuming computed functions, which maintains proper reactivity tracking
  const totalRevenue = computed(() => 
    getRevenueSeriesFromBatch(batchData.value, period.value)
  )

  const segmentData = computed(() => 
    getRevenueSegmentsFromBatch(batchData.value)
  )

  const error = computed(() => {
    if (batchError.value) return batchError.value
    const t = currentTicker.value
    if (t && totalRevenue.value.length === 0) {
      return `No revenue data for '${t}'`
    }
    return null
  })

  // Computed series - return stacked multi-series based on selectedSegments
  const series = computed<[number, number][] | SeriesDataPoint[]>(() => {
    if (segmentData.value.segments.length === 0) {
      // No segments available, return total revenue as simple array
      return totalRevenue.value || []
    }
    
    // If only 'total' is selected, return simple array
    if (selectedSegments.value.length === 1 && selectedSegments.value[0] === 'total') {
      return totalRevenue.value || []
    }
    
    // Filter out 'total' if other segments are selected (since total = sum of segments)
    const segmentsToShow = selectedSegments.value.filter(s => s !== 'total')
    
    // If no segments after filtering, show total
    if (segmentsToShow.length === 0) {
      return totalRevenue.value || []
    }
    
    // Get all unique dates from ALL segment data (not just total revenue)
    const allDates = new Set<number>()
    
    // Add dates from all selected segments
    segmentsToShow.forEach(segment => {
      if (segmentData.value.series[segment]) {
        segmentData.value.series[segment].forEach(([date]) => {
          allDates.add(date)
        })
      }
    })
    
    const sortedDates = Array.from(allDates).sort((a, b) => a - b)
    
    // Create a map for quick lookup: date -> value for each segment
    const segmentMaps: Record<string, Map<number, number>> = {}
    segmentsToShow.forEach(segment => {
      const map = new Map<number, number>()
      if (segmentData.value.series[segment]) {
        segmentData.value.series[segment].forEach(([date, value]) => {
          map.set(date, value)
        })
      }
      segmentMaps[segment] = map
    })
    
    // Build aligned series: for each date, fill in 0 if segment doesn't have data
    const multiSeries: SeriesDataPoint[] = []
    segmentsToShow.forEach(segment => {
      const alignedData: [number, number][] = sortedDates.map(date => {
        const segmentMap = segmentMaps[segment]
        const value = segmentMap ? (segmentMap.get(date) || 0) : 0
        return [date, value]
      })
      
      multiSeries.push({
        name: formatSegmentLabel(segment),
        data: alignedData,
        stack: 'revenue'
      })
    })
    
    return multiSeries
  })

  // Computed view mode options for the chart (used by BaseChart to show legend)
  const viewModeOptions = computed<ViewModeOption[]>(() => {
    if (segmentData.value.segments.length === 0) {
      return [] // No segments = no legend
    }
    
    const options: ViewModeOption[] = [{ label: 'Total Revenue', value: 'total' }]
    segmentData.value.segments.forEach(segment => {
      options.push({ 
        label: formatSegmentLabel(segment), 
        value: segment 
      })
    })
    return options
  })

  function formatSegmentLabel(segment: string): string {
    // Clean up segment names for display
    return segment
      .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
      .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
      .trim()
  }

  // Update title based on ticker
  watch(currentTicker, (ticker) => {
    if (!ticker) {
      title.value = 'Revenue — Empty'
      message.value = 'Enter a ticker'
    } else if (totalRevenue.value.length > 0 || series.value.length > 0) {
      title.value = 'Revenue'
      message.value = ''
    } else if (error.value && !loading.value) {
      // Keep original title, just show error in message
      title.value = 'Revenue'
      message.value = error.value
    } else if (!loading.value) {
      title.value = 'Revenue — No data'
      message.value = `No revenue data for '${ticker}'`
    } else {
      title.value = 'Revenue'
      message.value = ''
    }
  }, { immediate: true })

  // Reset to total revenue when period changes
  watch(period, () => {
    selectedSegments.value = ['total']
  })

  // Computed series for compact view - always show Total Revenue only
  const compactSeries = computed<[number, number][]>(() => {
    return totalRevenue.value || []
  })

  // Manual refresh function (forces batch data refresh)
  function refresh(): void {
    selectedSegments.value = ['total']
    // Batch data will auto-refresh via useTickerData
  }

  return { 
    period, 
    selectedSegments, 
    viewModeOptions, 
    series, 
    compactSeries, 
    title, 
    message, 
    loading, 
    error, 
    refresh,
    ticker: currentTicker,  // For cached growth calculations in BaseChart
    dataType: 'revenue'     // Cache key identifier
  }
}
