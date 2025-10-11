import { ref, watch, computed } from 'vue'
import { getInsiderTradingAggregated } from '../services/company/insiderTradingService'
import { getPriceSeries } from '../services/marketData'

export function useInsiderTradingSeries(tickerRef) {
  const rawInsider = ref([])
  const rawPrice = ref([])
  const title = ref('Price & Insider Trading — Empty')
  const message = ref('')
  const loading = ref(false)
  const error = ref(null)

  // Compute series for ECharts (price line + insider bars)
  const series = computed(() => {
    if (!rawPrice.value.length && !rawInsider.value.length) return []
    
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
    if (rawInsider.value.length) {
      const insiderData = rawInsider.value.map(d => [d.date, d.net])
      console.log('Insider series data sample:', insiderData.slice(0, 3))
      result.push({
        name: 'Net Insider Shares',
        type: 'bar',
        data: insiderData,
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
      rawInsider.value = []
      rawPrice.value = []
      message.value = 'Enter a ticker'
      return
    }
    
    loading.value = true
    try {
      // Fetch both price and insider data in parallel
      const [priceResult, insiderResult] = await Promise.all([
        getPriceSeries(t, 'daily'),
        getInsiderTradingAggregated(t)
      ])
      
      if (priceResult.error && insiderResult.error) {
        title.value = 'Error'
        message.value = 'Failed to load data'
        error.value = priceResult.error
        rawPrice.value = []
        rawInsider.value = []
      } else {
        title.value = 'Price & Insider Trading'
        rawPrice.value = priceResult.data || []
        rawInsider.value = insiderResult.data || []
        
        console.log('Insider Trading Chart Data:', {
          pricePoints: rawPrice.value.length,
          insiderMonths: rawInsider.value.length,
          priceError: priceResult.error,
          insiderError: insiderResult.error
        })
        
        if (!rawPrice.value.length && !rawInsider.value.length) {
          message.value = `No data for '${t}'`
        }
      }
    } catch (e) {
      title.value = 'Error'
      message.value = 'Failed to load data'
      error.value = e?.message || 'Unknown error'
      rawPrice.value = []
      rawInsider.value = []
    } finally {
      loading.value = false
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true })

  return { series, title, message, loading, error, refresh }
}
