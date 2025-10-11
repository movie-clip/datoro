import { ref, watch, computed } from 'vue'
import { getDividendYieldSeries } from '../services/company/dividendService'

export function useDividendYieldSeries(tickerRef) {
  const period = ref('annual')
  const rawData = ref([])
  const title = ref('Dividend Yield — Empty')
  const message = ref('')
  const loading = ref(false)
  const error = ref(null)

  const series = computed(() => {
    if (!rawData.value.length) return []
    return rawData.value
  })

  async function refresh() {
    message.value = ''
    error.value = null
    const t = (tickerRef?.value || '').toUpperCase()
    if (!t) {
      title.value = 'Dividend Yield — Empty'
      rawData.value = []
      message.value = 'Enter a ticker'
      return
    }
    
    loading.value = true
    try {
      const result = await getDividendYieldSeries(t, period.value)
      if (result.error) {
        title.value = 'Error'
        rawData.value = []
        message.value = result.error
        error.value = result.error
      } else if (!result.data.length) {
        title.value = 'Dividend Yield — No data'
        rawData.value = []
        message.value = `No dividend data for '${t}'`
      } else {
        title.value = 'Dividend Yield'
        rawData.value = result.data
      }
    } catch (e) {
      title.value = 'Error'
      rawData.value = []
      message.value = 'Failed to load data'
      error.value = e?.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true })
  watch(period, () => refresh())

  return { period, series, title, message, loading, error, refresh }
}
