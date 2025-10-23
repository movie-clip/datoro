<script setup>
import { ref, computed } from 'vue'

const tickerInput = ref('')
const forceRegenerate = ref(false)
const isChecking = ref(false)
const isGenerating = ref(false)
const checkedTickers = ref([])
const tickerStatuses = ref({})
const bundleStats = ref(null)
const ollamaStatus = ref('checking')
const generationResults = ref([])
const generationSummary = ref(null)
const expandedTickers = ref(new Set())
const selectedTickers = ref(new Set())
const tickersToGenerate = ref(new Set()) // Tickers selected for generation
const totalTickersToGenerate = ref(0) // Total count for progress tracking
const completedTickers = ref(0) // Completed count for progress

// Toggle ticker expansion
function toggleTicker(ticker) {
  if (expandedTickers.value.has(ticker)) {
    expandedTickers.value.delete(ticker)
  } else {
    expandedTickers.value.add(ticker)
  }
  // Force reactivity
  expandedTickers.value = new Set(expandedTickers.value)
}

// Toggle ticker selection
function toggleSelection(ticker) {
  if (selectedTickers.value.has(ticker)) {
    selectedTickers.value.delete(ticker)
  } else {
    selectedTickers.value.add(ticker)
  }
  selectedTickers.value = new Set(selectedTickers.value)
}

// Toggle ticker for generation
function toggleGenerationSelection(ticker) {
  if (tickersToGenerate.value.has(ticker)) {
    tickersToGenerate.value.delete(ticker)
  } else {
    tickersToGenerate.value.add(ticker)
  }
  tickersToGenerate.value = new Set(tickersToGenerate.value)
}

// Select/deselect all for generation
function selectAllForGeneration() {
  tickersToGenerate.value = new Set([...newTickers.value, ...existingTickers.value])
}

function deselectAllForGeneration() {
  tickersToGenerate.value.clear()
  tickersToGenerate.value = new Set(tickersToGenerate.value)
}

// Select all tickers
function selectAll() {
  selectedTickers.value = new Set([...existingTickers.value, ...successfulGenerations.value])
}

// Deselect all tickers
function deselectAll() {
  selectedTickers.value.clear()
  selectedTickers.value = new Set(selectedTickers.value)
}

// Apply selected tickers to main project
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
    } catch (e) {
      throw new Error('Server returned invalid JSON. Make sure the backend server is running on port 7072.')
    }

    if (data.success) {
      alert(`✅ Successfully applied ${data.appliedCount} ticker(s) to main project!`)
      deselectAll()
    } else {
      alert(`❌ Failed to apply: ${data.error}`)
    }
  } catch (error) {
    console.error('Apply error:', error)
    alert(`❌ Failed to apply: ${error.message}`)
  }
}

// Computed: successfully generated tickers from current session
const successfulGenerations = computed(() => {
  return generationResults.value
    .filter(r => r.success)
    .map(r => r.ticker)
})

// Check Ollama status on mount
checkOllamaStatus()
setInterval(checkOllamaStatus, 5000)

// Load bundle stats on mount
loadBundleStats()

async function checkOllamaStatus() {
  try {
    const res = await fetch('/api/ollama/status')
    const data = await res.json()
    ollamaStatus.value = data.running ? 'connected' : 'offline'
  } catch (error) {
    ollamaStatus.value = 'offline'
  }
}

async function loadBundleStats() {
  try {
    const res = await fetch('/api/bundle/stats')
    bundleStats.value = await res.json()
  } catch (error) {
    console.error('Failed to load bundle stats:', error)
  }
}

async function checkTickers() {
  if (!tickerInput.value.trim()) {
    alert('Please enter at least one ticker')
    return
  }

  isChecking.value = true
  generationResults.value = []
  generationSummary.value = null

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

async function generateInsights() {
  if (ollamaStatus.value !== 'connected') {
    alert('Ollama is not running! Please start Ollama first.')
    return
  }

  // Use only the tickers selected for generation
  const selectedForGeneration = Array.from(tickersToGenerate.value)
  
  if (selectedForGeneration.length === 0) {
    alert('No tickers selected for generation. Please select at least one ticker.')
    return
  }

  // Filter to only process tickers that are new or force regenerate is checked
  const tickersToProcess = selectedForGeneration.filter(ticker => {
    const status = tickerStatuses.value[ticker]
    return status.status === 'new' || (status.status === 'exists' && forceRegenerate.value)
  })

  // If no tickers to process but forceRegenerate is not checked, 
  // just process the selected existing tickers anyway
  const finalTickersToProcess = tickersToProcess.length > 0 
    ? tickersToProcess 
    : selectedForGeneration

  isGenerating.value = true
  generationResults.value = []
  generationSummary.value = null
  totalTickersToGenerate.value = finalTickersToProcess.length
  completedTickers.value = 0

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tickers: finalTickersToProcess,
        force: forceRegenerate.value
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

const progressPercentage = computed(() => {
  if (totalTickersToGenerate.value === 0) return 0
  return Math.round((completedTickers.value / totalTickersToGenerate.value) * 100)
})
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1>🤖 AI Insights Generator</h1>
        <div class="header-stats">
          <div class="stat" v-if="bundleStats">
            <span class="stat-label">Tickers:</span>
            <span class="stat-value">{{ bundleStats.count }}</span>
          </div>
          <div class="stat" v-if="bundleStats">
            <span class="stat-label">Size:</span>
            <span class="stat-value">{{ bundleStats.size_kb }} KB</span>
          </div>
          <div class="stat">
            <span class="stat-label">Ollama:</span>
            <span :class="['status-indicator', ollamaStatus]">
              {{ ollamaStatus === 'connected' ? '✅ Connected' : '❌ Offline' }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="panel input-section">
          <h2>Enter Tickers</h2>
          <p class="text-grey text-small mb-2">Comma or newline separated</p>
          <textarea 
            v-model="tickerInput" 
            placeholder="AAPL, MSFT, GOOGL"
            :disabled="isGenerating"
          ></textarea>

          <div class="button-group mt-2">
            <button 
              @click="checkTickers" 
              :disabled="isChecking || isGenerating"
            >
              {{ isChecking ? 'Checking...' : '🔍 Check Status' }}
            </button>
            <button 
              @click="generateInsights" 
              :disabled="isGenerating || checkedTickers.length === 0 || ollamaStatus !== 'connected'"
              class="secondary"
            >
              {{ isGenerating ? 'Generating...' : '🚀 Generate' }}
            </button>
          </div>

          <label class="checkbox-label mt-2">
            <input 
              type="checkbox" 
              v-model="forceRegenerate"
              :disabled="isGenerating"
            >
            <span>Force regenerate existing</span>
          </label>
        </div>

        <!-- Ticker Status -->
        <div class="panel status-section" v-if="Object.keys(tickerStatuses).length > 0">
          <div class="status-header">
            <h2>Ticker Status</h2>
            <div class="status-controls">
              <button @click="selectAllForGeneration" class="btn-tiny">Select All</button>
              <button @click="deselectAllForGeneration" class="btn-tiny secondary">Deselect All</button>
              <span class="text-small text-grey">{{ tickersToGenerate.size }} selected</span>
            </div>
          </div>
          <div class="status-list">
            <div 
              v-for="ticker in invalidTickers" 
              :key="ticker"
              class="status-item error"
            >
              <div>
                <strong>{{ ticker }}</strong>
                <p class="text-small">{{ tickerStatuses[ticker].error }}</p>
              </div>
            </div>

            <div 
              v-for="ticker in existingTickers" 
              :key="ticker"
              class="status-item success"
            >
              <input 
                type="checkbox" 
                :checked="tickersToGenerate.has(ticker)"
                @change="toggleGenerationSelection(ticker)"
                :disabled="isGenerating"
                class="status-checkbox"
              >
              <div>
                <strong>{{ ticker }}</strong>
                <p class="text-small">Already in bundle</p>
              </div>
            </div>

            <div 
              v-for="ticker in newTickers" 
              :key="ticker"
              class="status-item info"
            >
              <input 
                type="checkbox" 
                :checked="tickersToGenerate.has(ticker)"
                @change="toggleGenerationSelection(ticker)"
                :disabled="isGenerating"
                class="status-checkbox"
              >
              <div>
                <strong>{{ ticker }}</strong>
                <p class="text-small">New ticker</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <div class="panel preview-section">
          <div class="preview-header">
            <h2>Data Preview</h2>
            
            <!-- Selection controls -->
            <div v-if="existingTickers.length > 0 || successfulGenerations.length > 0" class="selection-controls">
              <div class="selection-actions">
                <button @click="selectAll" class="btn-small">Select All</button>
                <button @click="deselectAll" class="btn-small secondary">Deselect All</button>
                <span class="selection-count text-small text-grey">
                  {{ selectedTickers.size }} selected
                </span>
              </div>
              <button 
                @click="applyToMainProject" 
                :disabled="selectedTickers.size === 0"
                class="btn-apply"
              >
                📋 Apply to Main Project ({{ selectedTickers.size }})
              </button>
            </div>
          </div>

          <!-- Progress Bar (shown during generation) -->
          <div v-if="isGenerating" class="progress-container">
            <div class="progress-header">
              <h3>🚀 Generating AI Insights</h3>
              <p class="progress-subtitle">
                Processing {{ completedTickers }} of {{ totalTickersToGenerate }} tickers
              </p>
            </div>
            
            <div class="progress-bar-wrapper">
              <div class="progress-bar">
                <div 
                  class="progress-bar-fill" 
                  :style="{ width: progressPercentage + '%' }"
                >
                  <span class="progress-text">{{ progressPercentage }}%</span>
                </div>
              </div>
            </div>

            <div class="progress-info">
              <div class="progress-stat">
                <span class="stat-icon">✅</span>
                <span>Completed: {{ completedTickers }}</span>
              </div>
              <div class="progress-stat">
                <span class="stat-icon">⏳</span>
                <span>Remaining: {{ totalTickersToGenerate - completedTickers }}</span>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="!isGenerating && Object.keys(tickerStatuses).length === 0 && generationResults.length === 0" class="empty-state">
            <p class="text-grey">👈 Enter tickers and click "Check Status" to begin</p>
          </div>

          <!-- Generation Results -->
          <div v-if="!isGenerating && generationResults.length > 0" class="results">
            <div v-for="result in generationResults" :key="result.ticker" class="result-item">
              <div :class="['result-header', result.success ? 'success' : 'error']">
                <input 
                  v-if="result.success"
                  type="checkbox" 
                  :checked="selectedTickers.has(result.ticker)"
                  @change="toggleSelection(result.ticker)"
                  class="ticker-checkbox"
                >
                <span class="result-icon">{{ result.success ? '✅' : '❌' }}</span>
                <strong>{{ result.ticker }}</strong>
                <span class="result-status">{{ result.success ? 'Generated!' : 'Failed' }}</span>
              </div>
              
              <p v-if="!result.success" class="error-message">{{ result.error }}</p>

              <div v-if="result.success && result.insights" class="insights-preview">
                <div class="insights-section">
                  <h4>✅ Competitive Advantages</h4>
                  <div v-for="(adv, i) in result.insights.advantages" :key="i" class="insight-item">
                    <strong>{{ i + 1 }}. {{ adv.title }}</strong>
                    <p>{{ adv.description }}</p>
                  </div>
                </div>

                <div class="insights-section">
                  <h4>⚠️ Investment Risks</h4>
                  <div v-for="(risk, i) in result.insights.risks" :key="i" class="insight-item">
                    <strong>{{ i + 1 }}. {{ risk.title }}</strong>
                    <p>{{ risk.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Summary -->
            <div v-if="generationSummary" class="generation-summary">
              <h3>📊 Generation Summary</h3>
              <div class="summary-stats">
                <div class="summary-stat success">
                  <span class="summary-label">✅ Successful</span>
                  <span class="summary-value">{{ generationSummary.successCount }}</span>
                </div>
                <div class="summary-stat error">
                  <span class="summary-label">❌ Failed</span>
                  <span class="summary-value">{{ generationSummary.failedCount }}</span>
                </div>
              </div>
              <div v-if="generationSummary.failed.length > 0" class="failed-list">
                <h4>Failed Tickers:</h4>
                <ul>
                  <li v-for="[ticker, error] in generationSummary.failed" :key="ticker">
                    <strong>{{ ticker }}</strong>: {{ error }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Existing Ticker Preview -->
          <div v-else-if="existingTickers.length > 0" class="existing-preview">
            <div v-for="ticker in existingTickers" :key="ticker" class="ticker-card">
              <div class="ticker-card-header">
                <input 
                  type="checkbox" 
                  :checked="selectedTickers.has(ticker)"
                  @change="toggleSelection(ticker)"
                  @click.stop
                  class="ticker-checkbox"
                >
                <div 
                  class="ticker-header-content"
                  @click="toggleTicker(ticker)"
                >
                  <div class="ticker-info">
                    <span class="ticker-symbol">{{ ticker }}</span>
                    <span class="ticker-date text-grey text-small">
                      {{ tickerStatuses[ticker].data?.updated || 'N/A' }}
                    </span>
                  </div>
                  <span class="expand-icon">
                    {{ expandedTickers.has(ticker) ? '▼' : '▶' }}
                  </span>
                </div>
              </div>

              <div v-if="expandedTickers.has(ticker)" class="ticker-card-content">
                <div class="insights-section">
                  <h5>✅ Competitive Advantages</h5>
                  <div 
                    v-for="(adv, i) in tickerStatuses[ticker].data?.advantages" 
                    :key="i" 
                    class="insight-item"
                  >
                    <strong>{{ i + 1 }}. {{ adv.title }}</strong>
                    <p>{{ adv.description }}</p>
                  </div>
                </div>

                <div class="insights-section">
                  <h5>⚠️ Investment Risks</h5>
                  <div 
                    v-for="(risk, i) in tickerStatuses[ticker].data?.risks" 
                    :key="i" 
                    class="insight-item"
                  >
                    <strong>{{ i + 1 }}. {{ risk.title }}</strong>
                    <p>{{ risk.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-bottom: 1px solid #2A2A2E;
  padding: 1.5rem 2rem;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.stat {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.stat-label {
  color: var(--color-grey);
  font-size: 0.875rem;
}

.stat-value {
  font-weight: 600;
}

.status-indicator {
  font-size: 0.875rem;
  font-weight: 600;
}

.status-indicator.connected {
  color: var(--color-success);
}

.status-indicator.offline {
  color: var(--color-danger);
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 1.5rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.left-panel, .right-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.preview-header {
  margin-bottom: 1.5rem;
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #2A2A2E;
  flex-wrap: wrap;
}

.selection-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-small {
  background: #2A2A2E;
  color: #E5E5E5;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-small:hover {
  background: #3A3A3E;
}

.btn-small.secondary {
  background: transparent;
  border: 1px solid #2A2A2E;
}

.btn-small.secondary:hover {
  border-color: #3A3A3E;
  background: rgba(255, 255, 255, 0.02);
}

.selection-count {
  padding: 0.5rem;
}

.btn-apply {
  background: var(--color-brand-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-apply:hover:not(:disabled) {
  background: var(--color-brand-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 142, 0.3);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ticker-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

.button-group {
  display: flex;
  gap: 0.75rem;
}

.button-group button {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-header h2 {
  margin: 0;
}

.status-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-tiny {
  background: #2A2A2E;
  color: #E5E5E5;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-tiny:hover {
  background: #3A3A3E;
}

.btn-tiny.secondary {
  background: transparent;
  border: 1px solid #2A2A2E;
}

.btn-tiny.secondary:hover {
  border-color: #3A3A3E;
  background: rgba(255, 255, 255, 0.02);
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

.status-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid;
}

.status-item.success {
  background: rgba(0, 168, 142, 0.1);
  border-color: var(--color-success);
}

.status-item.info {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.status-item.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-danger);
}

.status-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.progress-container {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 2px solid var(--color-brand-primary);
  border-radius: 12px;
  padding: 2rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-header {
  text-align: center;
  margin-bottom: 2rem;
}

.progress-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-brand-primary);
  margin-bottom: 0.5rem;
}

.progress-subtitle {
  font-size: 1rem;
  color: var(--color-grey);
}

.progress-bar-wrapper {
  margin-bottom: 1.5rem;
}

.progress-bar {
  height: 40px;
  background: #1E1E22;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #2A2A2E;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, 
    var(--color-brand-primary) 0%, 
    #00C9A7 50%, 
    var(--color-brand-primary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease;
  box-shadow: 0 0 20px rgba(0, 168, 142, 0.5);
  position: relative;
  overflow: hidden;
}

.progress-bar-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.2), 
    transparent
  );
  animation: slide 1.5s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 1;
  position: relative;
}

.progress-info {
  display: flex;
  justify-content: space-around;
  gap: 2rem;
}

.progress-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: var(--color-grey);
}

.progress-stat .stat-icon {
  font-size: 1.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-item {
  border: 1px solid #2A2A2E;
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  font-size: 1.125rem;
}

.result-header.success {
  background: rgba(0, 168, 142, 0.1);
  border-bottom: 1px solid var(--color-success);
}

.result-header.error {
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 1px solid var(--color-danger);
}

.result-status {
  margin-left: auto;
  font-size: 0.875rem;
  font-weight: 600;
}

.error-message {
  padding: 1rem;
  color: var(--color-danger);
  font-size: 0.875rem;
}

.insights-preview, .existing-preview {
  padding: 1rem;
}

.insights-section {
  margin-top: 1.5rem;
}

.insights-section:first-child {
  margin-top: 0;
}

.insights-section h4, .insights-section h5 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-brand-primary);
}

.insight-item {
  padding: 0.75rem;
  background: #1E1E22;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.insight-item strong {
  display: block;
  margin-bottom: 0.5rem;
}

.insight-item p {
  color: var(--color-grey);
  font-size: 0.875rem;
  line-height: 1.6;
}

.ticker-card {
  border: 1px solid #2A2A2E;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.ticker-card:hover {
  border-color: #3A3A3E;
}

.ticker-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.ticker-header-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;
}

.ticker-header-content:hover {
  opacity: 0.8;
}

.ticker-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ticker-symbol {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-brand-primary);
}

.ticker-date {
  font-size: 0.875rem;
}

.expand-icon {
  font-size: 0.875rem;
  color: var(--color-grey);
  transition: transform 0.2s ease;
}

.ticker-card-content {
  padding: 0 1.25rem 1.25rem 1.25rem;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.generation-summary {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid var(--color-brand-primary);
  border-radius: 8px;
  padding: 1.5rem;
}

.generation-summary h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-stat {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.summary-stat.success {
  background: rgba(0, 168, 142, 0.1);
  border: 1px solid var(--color-success);
}

.summary-stat.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-danger);
}

.summary-label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-grey);
  margin-bottom: 0.5rem;
}

.summary-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.failed-list {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #2A2A2E;
}

.failed-list h4 {
  font-size: 0.875rem;
  color: var(--color-danger);
  margin-bottom: 0.5rem;
}

.failed-list ul {
  list-style: none;
  padding: 0;
}

.failed-list li {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: rgba(239, 68, 68, 0.05);
  border-radius: 4px;
  font-size: 0.875rem;
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
