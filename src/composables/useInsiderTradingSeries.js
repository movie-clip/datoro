import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getInsiderTradingFromBatch } from '../services/financials/batchChartService.js'
import { getPriceSeries } from '../services/marketData'

export function useInsiderTradingSeries(tickerRef) {
  const rawPrice = ref([])
  const title = ref('Price & Insider Trading — Empty')
  const message = ref('')
  const loading = ref(false)
  const error = ref(null)

  // Use batch data composable for insider trading
  const { data: batchData, loading: batchLoading, error: batchError } = useTickerData(tickerRef)

  // Extract insider trading data from batch
  const insiderData = computed(() => getInsiderTradingFromBatch(batchData.value))

  // Compute series for ECharts (price line + insider bars)
  const series = computed(() => {
    if (!rawPrice.value.length && !insiderData.value.net?.length) return []
    
    const result = []
    
    // Price series (line)
    if (rawPrice.value.length) {
      result.push({
        name: 'Price',
        type: 'line',
        data: rawPrice.value,
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 2 },
        showSymbol: false
      })
    }
    
    // Insider net shares (bar)
    if (insiderData.value.net?.length) {
      console.log('Insider series data sample:', insiderData.value.net.slice(0, 3))
      result.push({
        name: 'Net Insider Shares',
        type: 'bar',
        data: insiderData.value.net,
        yAxisIndex: 1,
        itemStyle: {
          color: (params) => params.value[1] >= 0 ? '#4caf50' : '#f44336'
        }
      })
    }
    
    console.log('Final series:', result.length, 'series')
    return result
  })

  async function refresh() {
    message.value = ''
    error.value = null
    const t = (tickerRef?.value || '').toUpperCase()
    if (!t) {
      title.value = 'Price & Insider Trading — Empty'
      rawPrice.value = []
      message.value = 'Enter a ticker'
      return
    }
    
    loading.value = true
    try {
      // Fetch price data (insider data comes from batch)
      const priceResult = await getPriceSeries(t, 'daily')
      
      if (priceResult.error) {
        error.value = priceResult.error
        rawPrice.value = []
      } else {
        rawPrice.value = priceResult.data || []
      }
      
      console.log('Insider Trading Chart Data:', {
        pricePoints: rawPrice.value.length,
        insiderMonths: insiderData.value.net?.length || 0,
        priceError: priceResult.error,
        batchError: batchError.value
      })
      
      if (!rawPrice.value.length && !insiderData.value.net?.length) {
        title.value = 'Price & Insider Trading — No data'
        message.value = `No data for '${t}'`
      } else {
        title.value = 'Price & Insider Trading'
        message.value = ''
      }
    } catch (e) {
      title.value = 'Error'
      message.value = 'Failed to load data'
      error.value = e?.message || 'Unknown error'
      rawPrice.value = []
    } finally {
      loading.value = false
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true })

  return { series, title, message, loading, error, refresh }
}
