import { ref, watch } from 'vue'
import { TIMEFRAMES, DEFAULT_TF } from '../models/timeframe'
import { getPriceSeries } from '../services/marketData'

export function usePriceSeries(tickerRef) {
  const tfKey   = ref(DEFAULT_TF)
  const series  = ref([])
  const title   = ref('Empty Chart')
  const message = ref('')
  const loading = ref(false)

  async function refresh() {
    message.value = ''
    const t = (tickerRef?.value || '').toUpperCase()
    if (!t) {
      title.value = 'Empty Chart'
      series.value = []
      message.value = 'Enter a ticker'
      return
    }
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['1M']
    loading.value = true
    try {
      const data = await getPriceSeries(t, cfg)
      if (!data.length) {
        title.value = 'No data'
        series.value = []
        message.value = `No data for '${t}'.`
      } else {
        title.value = `${t} ${cfg.title}`
        series.value = data
      }
    } finally {
      loading.value = false
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true })
  watch(tfKey, () => refresh())

  return { tfKey, series, title, message, loading, refresh }
}
