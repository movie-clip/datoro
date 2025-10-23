import { ref, computed } from 'vue'

export function useGeneration(loadBundleStats) {
  const isGenerating = ref(false)
  const generationResults = ref([])
  const generationSummary = ref(null)
  const totalTickersToGenerate = ref(0)
  const completedTickers = ref(0)

  const progressPercentage = computed(() => {
    if (totalTickersToGenerate.value === 0) return 0
    return Math.round((completedTickers.value / totalTickersToGenerate.value) * 100)
  })

  const successfulGenerations = computed(() => {
    return generationResults.value
      .filter(r => r.success)
      .map(r => r.ticker)
  })

  async function generateInsights(ollamaStatus, tickersToGenerate, tickerStatuses) {
    if (ollamaStatus !== 'connected') {
      alert('Ollama is not running! Please start Ollama first.')
      return
    }

    const selectedForGeneration = Array.from(tickersToGenerate)
    
    if (selectedForGeneration.length === 0) {
      alert('No tickers selected for generation. Please select at least one ticker.')
      return
    }

    isGenerating.value = true
    generationResults.value = []
    generationSummary.value = null
    totalTickersToGenerate.value = selectedForGeneration.length
    completedTickers.value = 0

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickers: selectedForGeneration
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'result') {
              generationResults.value.push(data)
              completedTickers.value++
            } else if (data.type === 'summary') {
              generationSummary.value = data
            }
          }
        }
      }

      // Reload bundle stats
      await loadBundleStats()
    } catch (error) {
      alert('Failed to generate insights: ' + error.message)
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    generationResults,
    generationSummary,
    totalTickersToGenerate,
    completedTickers,
    progressPercentage,
    successfulGenerations,
    generateInsights
  }
}
