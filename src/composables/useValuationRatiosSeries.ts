import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import type { FMPRatios, FMPKeyMetrics } from '../types'

type Period = 'annual' | 'quarterly'

interface SeriesItem {
  name: string
  type: string
  data: [number, number][]
  yAxisIndex: number
  smooth?: boolean
  lineStyle?: { width?: number; color?: string }
  itemStyle?: { color: string }
  showSymbol?: boolean
}

interface RawRatioPoint {
  date: number
  peRatio: number
  psRatio: number
  roic: number
  grossMargin: number
  netMargin: number
}

function getErrorMessage(error: unknown): string | null {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return null
}

type RatioKey = 'pe' | 'ps' | 'roic' | 'grossMargin' | 'netMargin'

export interface UseValuationRatiosSeriesReturn {
  period: ComputedRef<Period>
  selectedRatios: Ref<RatioKey[]>
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
  const title = ref('Financial Ratios — Empty')
  const message = ref('')
  
  // Selected ratios to display (default: all)
  const selectedRatios = ref<RatioKey[]>(['pe', 'ps', 'roic'])

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction - single source of truth
  const rawData = computed(() => {
    const ratios = period.value === 'annual' 
      ? batchData.value?.data?.ratiosAnnual 
      : batchData.value?.data?.ratiosQuarter
    
    // Use matching key metrics based on period
    const keyMetrics = period.value === 'annual'
      ? batchData.value?.data?.keyMetrics
      : batchData.value?.data?.keyMetricsQuarter

    if (!ratios || !Array.isArray(ratios)) return []

    return ratios
      .map((r: FMPRatios): RawRatioPoint | null => {
        if (!r.date) return null
        
        // Find matching keyMetrics entry for ROIC
        const matchingMetrics = keyMetrics?.find((m: FMPKeyMetrics) => m.date === r.date)
        
        return {
          date: new Date(r.date).getTime(),
          peRatio: Number(r.priceEarningsRatioTTM || r.priceEarningsRatio || 0),
          psRatio: Number(r.priceToSalesRatioTTM || r.priceToSalesRatio || 0),
          roic: Number(matchingMetrics?.roic || 0) * 100, // ROIC as percentage
          grossMargin: Number(r.grossProfitMargin || 0) * 100, // Convert to percentage
          netMargin: Number(r.netProfitMargin || 0) * 100 // Convert to percentage
        }
      })
      .filter((point): point is RawRatioPoint => point !== null)
      .sort((a, b) => a.date - b.date)
  })

  const error = computed<string | null>(() => {
    if (batchError.value) return getErrorMessage(batchError.value)
    // Don't show error during initial loading
    if (loading.value) return null
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No valuation ratios data for '${t}'`
    }
    return null
  })

  // Transform data to multi-series format
  const series = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    
    const ratioConfig: Record<RatioKey, { name: string; key: keyof typeof rawData.value[0]; color: string }> = {
      pe: { name: 'P/E Ratio', key: 'peRatio', color: '#3b82f6' },
      ps: { name: 'P/S Ratio', key: 'psRatio', color: '#10b981' },
      roic: { name: 'ROIC %', key: 'roic', color: '#06b6d4' },
      grossMargin: { name: 'Gross Margin %', key: 'grossMargin', color: '#8b5cf6' },
      netMargin: { name: 'Net Margin %', key: 'netMargin', color: '#ef4444' }
    }
    
    const result: SeriesItem[] = []

    for (const ratioKey of selectedRatios.value) {
      const config = ratioConfig[ratioKey]
      const data = rawData.value
        .map(d => [d.date, d[config.key]] as [number, number])
      
      if (data.length > 0) {
        // Use axis 0 for ratios (PE, PS), axis 1 for percentages (ROIC, margins)
        const isPercentage = ['roic', 'grossMargin', 'netMargin'].includes(ratioKey)
        
        result.push({
          name: config.name,
          type: 'line',
          data,
          yAxisIndex: isPercentage ? 1 : 0,
          lineStyle: { color: config.color },
          itemStyle: { color: config.color }
        })
      }
    }
    
    return result
  })
  
  // Compact series (same as full view for this chart)
  const compactSeries = computed<SeriesItem[]>(() => series.value)

  // Update title based on ticker
  watch(currentTicker, (ticker) => {
    if (!ticker) {
      title.value = 'Ratios — Empty'
      message.value = 'Enter a ticker'
    } else if (rawData.value.length > 0) {
      title.value = 'Ratios'
      message.value = ''
    } else if (error.value && !loading.value) {
      // Keep original title, show error in message
      title.value = 'Ratios'
      message.value = error.value
    } else if (!loading.value) {
      title.value = 'Ratios — No data'
      message.value = `No ratios data for '${ticker}'`
    } else {
      title.value = 'Ratios'
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
    dataType: 'valuationRatios',  // Cache key identifier
    selectedRatios
  }
}
