import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getRevenueSeriesFromBatch, getProductCategoriesFromBatch, getGeographicCategoriesFromBatch, type RevenueSegmentsResult } from '../services/financials/batchChartService'
import { getSegmentColors } from '../utils/segmentColors'

type Period = 'annual' | 'quarterly'
type ViewMode = 'total' | 'product' | 'geographic'
type SeriesPoint = [number, number] | [number, number, string, string]

interface ViewModeOption {
  label: string
  value: ViewMode
}

interface SeriesDataPoint {
  name: string
  data: [number, number][]
  stack: string
  itemStyle: {
    color: string
  }
}

export interface UseRevenueCategorySeriesReturn {
  period: ComputedRef<Period>
  viewMode: Ref<ViewMode>
  viewModeOptions: ViewModeOption[]
  series: ComputedRef<SeriesPoint[] | SeriesDataPoint[]>
  compactSeries: ComputedRef<SeriesPoint[]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  ticker: Ref<string>
  dataType: string
}

export function useRevenueCategorySeries(): UseRevenueCategorySeriesReturn {
  const viewMode = ref<ViewMode>('total')
  const title = ref('Revenue')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  const period = computed<Period>(() => timeframe.value)

  // CRITICAL: Single source of truth for all revenue data
  // Extract all data once and cache it - similar to useFcfSeries pattern
  const rawRevenueData = computed(() => {
    const data = batchData.value
    if (!data) {
      return {
        total: [] as SeriesPoint[],
        product: { segments: [], series: {} } as RevenueSegmentsResult,
        geographic: { segments: [], series: {} } as RevenueSegmentsResult
      }
    }

    // Extract total revenue
    const total = getRevenueSeriesFromBatch(data, period.value)
    
    // Extract product categories - always call extraction function
    // The function handles null/undefined internally and returns empty result
    const product = getProductCategoriesFromBatch(data)
    
    // Extract geographic categories - same pattern
    const geographic = getGeographicCategoriesFromBatch(data)

    return { total, product, geographic }
  })

  // Convenience accessors (for backward compatibility with watch)
  const totalRevenue = computed(() => rawRevenueData.value.total)
  const productCategories = computed(() => rawRevenueData.value.product)
  const geographicCategories = computed(() => rawRevenueData.value.geographic)

  const error = computed(() => {
    if (batchError.value) return batchError.value
    if (loading.value) return null
    
    // Don't show error while still loading
    if (!batchData.value) return null
    
    const t = currentTicker.value
    if (t && totalRevenue.value.length === 0) {
      return `No revenue data for '${t}'`
    }
    return null
  })

  // View mode options for toggle buttons
  const viewModeOptions: ViewModeOption[] = [
    { label: 'Total Revenue', value: 'total' },
    { label: 'Product Categories', value: 'product' },
    { label: 'Geographic Categories', value: 'geographic' }
  ]

  // Series based on current view mode
  const series = computed<SeriesPoint[] | SeriesDataPoint[]>(() => {
    // Safety check: don't process if data isn't loaded yet
    if (!batchData.value) {
      return []
    }

    const mode = viewMode.value

    switch (mode) {
      case 'product': {
        const categories = productCategories.value
        
        if (!categories || !categories.segments || categories.segments.length === 0) {
          // No product data, fallback to total
          return totalRevenue.value || []
        }
        
        // Get consistent colors for product segments
        const colors = getSegmentColors(categories.segments, 'product')
        
        // Create stacked series for all product categories
        const result = categories.segments.map((category: string, index: number) => ({
          name: formatCategoryLabel(category),
          data: categories.series[category] || [],
          stack: 'revenue',
          itemStyle: {
            color: colors[index] || '#5470C6'
          }
        })) as SeriesDataPoint[]
        
        return result
      }
      
      case 'geographic': {
        const regions = geographicCategories.value
        
        if (!regions || !regions.segments || regions.segments.length === 0) {
          // No geographic data, fallback to total
          return totalRevenue.value || []
        }
        
        // Get consistent colors for geographic segments
        const colors = getSegmentColors(regions.segments, 'geographic')
        
        // Create stacked series for all geographic regions
        const result = regions.segments.map((region: string, index: number) => ({
          name: formatCategoryLabel(region),
          data: regions.series[region] || [],
          stack: 'revenue',
          itemStyle: {
            color: colors[index] || '#5470C6'
          }
        })) as SeriesDataPoint[]
        
        return result
      }
      
      case 'total':
      default:
        return totalRevenue.value || []
    }
  })

  // Update title and message based on data availability
  watch([currentTicker, viewMode, productCategories, geographicCategories, loading], 
    ([ticker, mode, product, geo, isLoading]) => {
      if (!ticker) {
        title.value = 'Revenue'
        message.value = 'Enter a ticker to view revenue breakdown'
        return
      }

      if (isLoading) {
        title.value = 'Revenue'
        message.value = ''
        return
      }

      if (error.value) {
        title.value = 'Revenue'
        message.value = error.value
        return
      }

      // Check if current mode has data
      let hasData = true
      let modeName = 'Total'
      let fallbackMessage = ''
      
      if (mode === 'product') {
        hasData = product && product.segments && product.segments.length > 0
        modeName = 'Product'
        fallbackMessage = hasData 
          ? '' 
          : `${ticker.toUpperCase()} does not report product revenue breakdown. Showing total revenue instead.`
      } else if (mode === 'geographic') {
        hasData = geo && geo.segments && geo.segments.length > 0
        modeName = 'Geographic'
        fallbackMessage = hasData 
          ? '' 
          : `${ticker.toUpperCase()} does not report geographic revenue breakdown. Showing total revenue instead.`
      }

      if (!hasData && totalRevenue.value.length === 0) {
        // No data at all
        title.value = 'Revenue'
        message.value = `No revenue data available for ${ticker.toUpperCase()}`
      } else if (!hasData) {
        // Has total revenue but no segments
        title.value = 'Revenue'
        message.value = fallbackMessage
      } else {
        // Has segment data
        title.value = 'Revenue'
        message.value = ''
      }
    }, 
    { immediate: true }
  )

  function formatCategoryLabel(category: string): string {
    // Clean up category names for display
    return category
      .replace(/Three Six Five/g, '365')  // Microsoft 365
      .replace(/And/g, '&')
      .trim()
  }

  // Compact series always shows total revenue
  const compactSeries = computed(() => totalRevenue.value)

  return {
    period,
    viewMode,
    viewModeOptions,
    series,
    compactSeries,
    title,
    message,
    loading,
    error,
    ticker: currentTicker,
    dataType: 'revenue-category'
  }
}
