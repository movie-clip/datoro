import { ref } from 'vue'

export function useDataPreview() {
  const expandedTickers = ref(new Set())
  const selectedTickers = ref(new Set())

  function toggleTicker(ticker) {
    if (expandedTickers.value.has(ticker)) {
      expandedTickers.value.delete(ticker)
    } else {
      expandedTickers.value.add(ticker)
    }
    expandedTickers.value = new Set(expandedTickers.value)
  }

  function toggleSelection(ticker) {
    if (selectedTickers.value.has(ticker)) {
      selectedTickers.value.delete(ticker)
    } else {
      selectedTickers.value.add(ticker)
    }
    selectedTickers.value = new Set(selectedTickers.value)
  }

  function selectAll(existingTickers, successfulGenerations) {
    selectedTickers.value = new Set([...existingTickers, ...successfulGenerations])
  }

  function deselectAll() {
    selectedTickers.value.clear()
    selectedTickers.value = new Set(selectedTickers.value)
  }

  async function applyToMainProject() {
    if (selectedTickers.value.size === 0) {
      alert('Please select at least one ticker to apply')
      return
    }

    const confirmed = confirm(
      `Apply ${selectedTickers.value.size} ticker(s) to main project?\n\n` +
      `This will merge the data into public/ai-insights.json.\n` +
      `Existing tickers will be updated.`
    )

    if (!confirmed) return

    try {
      const tickersToApply = Array.from(selectedTickers.value)
      
      console.log('Applying tickers:', tickersToApply)
      
      const res = await fetch('/api/apply-to-main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: tickersToApply })
      })

      console.log('Response status:', res.status)
      console.log('Response headers:', res.headers.get('content-type'))
      
      const text = await res.text()
      console.log('Response text:', text)
      
      let data
      try {
        data = JSON.parse(text)
      } catch (_e) {
        throw new Error('Server returned invalid JSON. Make sure the backend server is running on port 7072.')
      }

      if (data.success) {
        console.log(`✅ Successfully applied ${data.appliedCount} ticker(s) to main project!`)
        deselectAll()
      } else {
        alert(`❌ Failed to apply: ${data.error}`)
      }
    } catch (_error) {
      console.error('Apply error:', error)
      alert(`❌ Failed to apply: ${error.message}`)
    }
  }

  return {
    expandedTickers,
    selectedTickers,
    toggleTicker,
    toggleSelection,
    selectAll,
    deselectAll,
    applyToMainProject
  }
}
