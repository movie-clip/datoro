import { ref, computed, watch, markRaw, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getSubscriberSeriesFromBatch } from '../services/financials/batchChartService'
import { toDataPoint, type FiscalQuarterData } from '../utils/fiscalQuarterUtils'

type Period = 'annual' | 'quarterly'
type DataPoint = [number, number] | [number, number, string, string]

interface SeriesItem {
  name: string
  data: DataPoint[]
}

export interface UseSubscriberSeriesReturn {
  period: ComputedRef<Period>
  series: ComputedRef<SeriesItem[]>
  compactSeries: ComputedRef<SeriesItem[]>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: ComputedRef<string | null>
  ticker: Ref<string>
  dataType: string
}

export function useSubscriberSeries(): UseSubscriberSeriesReturn {
  const title = ref('Subscribers — Empty')
  const message = ref('')

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError, timeframe } = storeToRefs(tickerStore)
  
  // Map timeframe from store to period
  const period = computed<Period>(() => timeframe.value)

  // Memoized raw data extraction (markRaw for performance)
  const rawData = computed(() => 
    markRaw(getSubscriberSeriesFromBatch(batchData.value || null, period.value))
  )

  const error = computed<string | null>(() => {
    if (batchError.value) return batchError.value as string
    // Don't show error during initial loading
    if (loading.value) return null
    const t = (currentTicker.value || '').toUpperCase()
    if (t && rawData.value.length === 0) {
      return `No subscriber data available for '${t}'. This metric is only available for subscription-based companies like streaming services.`
    }
    return null
  })

  // Create multi-bar series for subscribers
  const createSubscriberSeries = (data: typeof rawData.value): SeriesItem[] => {
    const series: SeriesItem[] = []

    // Streaming Members (total users) - typically annual only
    const streamingData = data
      .filter(d => d.streamingMembers !== null && d.streamingMembers !== 0)
      .map(d => toDataPoint(d.date, d.streamingMembers!, d as FiscalQuarterData))
    
    if (streamingData.length > 0) {
      series.push({
        name: 'Streaming Members',
        data: streamingData
      })
    }

    // Paid Memberships (accounts/households) - quarterly and annual
    const paidData = data
      .filter(d => d.paidMemberships !== null && d.paidMemberships !== 0)
      .map(d => toDataPoint(d.date, d.paidMemberships!, d as FiscalQuarterData))
    
    if (paidData.length > 0) {
      series.push({
        name: 'Paid Memberships',
        data: paidData
      })
    }

    // Net Adds (subscriber growth) - quarterly and annual
    const netAddsData = data
      .filter(d => d.netAdds !== null && d.netAdds !== 0)
      .map(d => toDataPoint(d.date, d.netAdds!, d as FiscalQuarterData))
    
    if (netAddsData.length > 0) {
      series.push({
        name: 'Net Adds',
        data: netAddsData
      })
    }

    return series
  }

  // Main series for chart display
  const series = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    return createSubscriberSeries(rawData.value)
  })
  
  // Compact series (same as main series for consistency)
  const compactSeries = computed<SeriesItem[]>(() => {
    if (!rawData.value.length) return []
    return createSubscriberSeries(rawData.value)
  })

  // Update title based on ticker
  watch(currentTicker, () => {
    title.value = 'Subscribers'
  }, { immediate: true })

  // Keep message empty to match other financial charts
  watch(rawData, () => {
    message.value = ''
  }, { immediate: true })

  return {
    period,
    series,
    compactSeries,
    title,
    message,
    loading,
    error,
    ticker: currentTicker,
    dataType: 'subscribers'
  }
}
