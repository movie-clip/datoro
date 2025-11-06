import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getRevenueSeriesFromBatch, getProductCategoriesFromBatch, getGeographicCategoriesFromBatch } from '../services/financials/batchChartService'
import { getSegmentColors } from '../utils/segmentColors'

type Period = 'annual' | 'quarterly'
type ViewMode = 'total' | 'product' | 'geographic'

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
  series: ComputedRef<[number, number][] | SeriesDataPoint[]>
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

  // Extract data from batch
  const totalRevenue = computed(() => 
    getRevenueSeriesFromBatch(batchData.value, period.value)
  )

  const productCategories = computed(() => {
    const result = getProductCategoriesFromBatch(batchData.value)
    // Defensive check: ensure we always return a valid object
    if (!result || typeof result !== 'object' || !('segments' in result)) {
      return { segments: [], series: {} }
    }
    return result
  })

  const geographicCategories = computed(() => {
    const result = getGeographicCategoriesFromBatch(batchData.value)
    // Defensive check: ensure we always return a valid object
    if (!result || typeof result !== 'object' || !('segments' in result)) {
      return { segments: [], series: {} }
    }
    return result
  })

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
  const series = computed<[number, number][] | SeriesDataPoint[]>(() => {
    // Safety check: don't process if data isn't loaded yet
    if (!batchData.value) {
      return []
    }

    switch (viewMode.value) {
      case 'product': {
        const categories = productCategories.value
        if (!categories || !categories.segments || categories.segments.length === 0) {
          // No product data, fallback to total
          return totalRevenue.value || []
        }
        
        // Get consistent colors for product segments
        const colors = getSegmentColors(categories.segments, 'product')
        
        // Create stacked series for all product categories
        return categories.segments.map((category, index) => ({
          name: formatCategoryLabel(category),
          data: categories.series[category] || [],
          stack: 'revenue',
          itemStyle: {
            color: colors[index] || '#5470C6'
          }
        })) as SeriesDataPoint[]
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
        return regions.segments.map((region, index) => ({
          name: formatCategoryLabel(region),
          data: regions.series[region] || [],
          stack: 'revenue',
          itemStyle: {
            color: colors[index] || '#5470C6'
          }
        })) as SeriesDataPoint[]
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

  return {
    period,
    viewMode,
    viewModeOptions,
    series,
    title,
    message,
    loading,
    error,
    ticker: currentTicker,
    dataType: 'revenue-category'
  }
}
