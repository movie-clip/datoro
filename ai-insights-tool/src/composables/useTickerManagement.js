import { ref, computed } from 'vue'

export function useTickerManagement() {
  const tickerInput = ref('')
  const checkedTickers = ref([])
  const tickerStatuses = ref({})
  const tickersToGenerate = ref(new Set())
  const isChecking = ref(false)

  const existingTickers = computed(() => {
    return checkedTickers.value.filter(ticker => 
      tickerStatuses.value[ticker]?.status === 'exists'
    )
  })

  const newTickers = computed(() => {
    return checkedTickers.value.filter(ticker => 
      tickerStatuses.value[ticker]?.status === 'new'
    )
  })

  const invalidTickers = computed(() => {
    return Object.keys(tickerStatuses.value).filter(ticker =>
      tickerStatuses.value[ticker]?.status === 'invalid'
    )
  })

  async function checkTickers() {
    if (!tickerInput.value.trim()) {
      alert('Please enter at least one ticker')
      return
    }

    isChecking.value = true

    try {
      const res = await fetch('/api/tickers/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: tickerInput.value })
      })

      const data = await res.json()
      checkedTickers.value = data.validTickers
      tickerStatuses.value = data.tickerInfo
      
      // Auto-select all valid tickers for generation
      tickersToGenerate.value = new Set(data.validTickers.filter(ticker => 
        data.tickerInfo[ticker].status !== 'invalid'
      ))
    } catch (error) {
      alert('Failed to check tickers: ' + error.message)
    } finally {
      isChecking.value = false
    }
  }

  function toggleGenerationSelection(ticker) {
    if (tickersToGenerate.value.has(ticker)) {
      tickersToGenerate.value.delete(ticker)
    } else {
      tickersToGenerate.value.add(ticker)
    }
    tickersToGenerate.value = new Set(tickersToGenerate.value)
  }

  function selectAllForGeneration() {
    tickersToGenerate.value = new Set([...newTickers.value, ...existingTickers.value])
  }

  function deselectAllForGeneration() {
    tickersToGenerate.value.clear()
    tickersToGenerate.value = new Set(tickersToGenerate.value)
  }

  return {
    tickerInput,
    checkedTickers,
    tickerStatuses,
    tickersToGenerate,
    isChecking,
    existingTickers,
    newTickers,
    invalidTickers,
    checkTickers,
    toggleGenerationSelection,
    selectAllForGeneration,
    deselectAllForGeneration
  }
}
