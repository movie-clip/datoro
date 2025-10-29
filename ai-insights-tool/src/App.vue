<script setup>
import { onMounted, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import ProgressBar from './components/ProgressBar.vue'
import TickerStatus from './components/TickerStatus.vue'
import { useOllamaStatus } from './composables/useOllamaStatus'
import { useBundleStats } from './composables/useBundleStats'
import { useTickerManagement } from './composables/useTickerManagement'
import { useGeneration } from './composables/useGeneration'
import { useDataPreview } from './composables/useDataPreview'

// Track regenerating advantages
const regeneratingAdvantages = ref(new Set())
const regeneratingRisks = ref(new Set())

// Composables
const { ollamaStatus } = useOllamaStatus()
const { bundleStats, loadBundleStats } = useBundleStats()
const {
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
} = useTickerManagement()

const {
  isGenerating,
  generationResults,
  generationSummary,
  totalTickersToGenerate,
  completedTickers,
  progressPercentage,
  successfulGenerations,
  generateInsights
} = useGeneration(loadBundleStats)

const {
  expandedTickers,
  selectedTickers,
  toggleTicker,
  toggleSelection,
  selectAll,
  deselectAll,
  applyToMainProject
} = useDataPreview()

// Initialize
onMounted(() => {
  loadBundleStats()
})

// Helper functions for template
const handleGenerate = () => {
  generateInsights(ollamaStatus.value, tickersToGenerate.value, tickerStatuses.value)
}

const handleSelectAll = () => {
  selectAll(existingTickers.value, successfulGenerations.value)
}

// Regenerate single advantage
const regenerateAdvantage = async (ticker, advantageIndex, isGenerationResult = false) => {
  const key = `${ticker}-${advantageIndex}`
  regeneratingAdvantages.value.add(key)
  
  try {
    const response = await fetch('/api/regenerate-advantage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ticker,
        advantageIndex
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to regenerate advantage')
    }
    
    const data = await response.json()
    
    // Update the advantage in the appropriate data structure
    if (isGenerationResult) {
      const result = generationResults.value.find(r => r.ticker === ticker)
      if (result && result.insights) {
        result.insights.advantages[advantageIndex] = data.advantage
      }
    } else {
      if (tickerStatuses.value[ticker]?.data?.advantages) {
        tickerStatuses.value[ticker].data.advantages[advantageIndex] = data.advantage
      }
    }
  } catch (_error) {
    console.error('Failed to regenerate advantage:', error)
    alert('Failed to regenerate advantage: ' + error.message)
  } finally {
    regeneratingAdvantages.value.delete(key)
  }
}

const isRegenerating = (_ticker, _index) => {
  return regeneratingAdvantages.value.has(`${ticker}-${index}`)
}

// Regenerate single risk
const regenerateRisk = async (ticker, riskIndex, isGenerationResult = false) => {
  const key = `${ticker}-${riskIndex}`
  regeneratingRisks.value.add(key)
  
  try {
    const response = await fetch('/api/regenerate-risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ticker,
        riskIndex
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to regenerate risk')
    }
    
    const data = await response.json()
    
    // Update the risk in the appropriate data structure
    if (isGenerationResult) {
      const result = generationResults.value.find(r => r.ticker === ticker)
      if (result && result.insights) {
        result.insights.risks[riskIndex] = data.risk
      }
    } else {
      if (tickerStatuses.value[ticker]?.data?.risks) {
        tickerStatuses.value[ticker].data.risks[riskIndex] = data.risk
      }
    }
  } catch (_error) {
    console.error('Failed to regenerate risk:', error)
    alert('Failed to regenerate risk: ' + error.message)
  } finally {
    regeneratingRisks.value.delete(key)
  }
}

const isRegeneratingRisk = (_ticker, _index) => {
  return regeneratingRisks.value.has(`${ticker}-${index}`)
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <AppHeader :bundleStats="bundleStats" :ollamaStatus="ollamaStatus" />

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
              @click="handleGenerate" 
              :disabled="isGenerating || tickersToGenerate.size === 0 || ollamaStatus !== 'connected'"
              class="secondary"
            >
              {{ isGenerating ? 'Generating...' : '🚀 Generate' }}
            </button>
          </div>
        </div>

        <!-- Ticker Status -->
        <TickerStatus
          v-if="Object.keys(tickerStatuses).length > 0"
          :invalidTickers="invalidTickers"
          :existingTickers="existingTickers"
          :newTickers="newTickers"
          :tickerStatuses="tickerStatuses"
          :selectedCount="tickersToGenerate.size"
          :isGenerating="isGenerating"
          :isSelected="(ticker) => tickersToGenerate.has(ticker)"
          @selectAll="selectAllForGeneration"
          @deselectAll="deselectAllForGeneration"
          @toggle="toggleGenerationSelection"
        />
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <div class="panel preview-section">
          <div class="preview-header">
            <h2>Data Preview</h2>
            
            <!-- Selection controls -->
            <div v-if="existingTickers.length > 0 || successfulGenerations.length > 0" class="selection-controls">
              <div class="selection-actions">
                <button @click="handleSelectAll" class="btn-small">Select All</button>
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
          <ProgressBar 
            v-if="isGenerating"
            :total="totalTickersToGenerate"
            :completed="completedTickers"
            :percentage="progressPercentage"
          />

          <!-- Empty state -->
          <div v-if="!isGenerating && Object.keys(tickerStatuses).length === 0 && generationResults.length === 0" class="empty-state">
            <p class="text-grey">👈 Enter tickers and click "Check Status" to begin</p>
          </div>

          <!-- Generation Results (takes priority) -->
          <div v-if="!isGenerating && generationResults.length > 0" class="results">
            <div v-for="result in generationResults" :key="result.ticker" class="ticker-card">
              <div class="ticker-card-header">
                <input 
                  v-if="result.success"
                  type="checkbox" 
                  :checked="selectedTickers.has(result.ticker)"
                  @change="toggleSelection(result.ticker)"
                  @click.stop
                  class="ticker-checkbox"
                >
                <div 
                  class="ticker-header-content"
                  @click="toggleTicker(result.ticker)"
                >
                  <div class="ticker-info">
                    <span class="ticker-symbol">{{ result.ticker }}</span>
                    <span class="ticker-date text-grey text-small">
                      {{ result.success ? 'Just generated' : 'Failed' }}
                    </span>
                  </div>
                  <span v-if="result.success" class="expand-icon">
                    {{ expandedTickers.has(result.ticker) ? '▼' : '▶' }}
                  </span>
                </div>
              </div>

              <p v-if="!result.success" class="error-message">{{ result.error }}</p>

              <div v-if="result.success && result.insights && expandedTickers.has(result.ticker)" class="ticker-card-content">
                <div class="insights-section">
                  <h5>✅ Competitive Advantages</h5>
                  <div v-for="(adv, i) in result.insights.advantages" :key="i" class="insight-item">
                    <div class="insight-content">
                      <strong>{{ i + 1 }}. {{ adv.title }}</strong>
                      <p>{{ adv.description }}</p>
                    </div>
                    <button 
                      @click="regenerateAdvantage(result.ticker, i, true)"
                      :disabled="isRegenerating(result.ticker, i)"
                      class="regenerate-btn"
                      title="Generate new variant"
                    >
                      {{ isRegenerating(result.ticker, i) ? '...' : '🔄' }}
                    </button>
                  </div>
                </div>

                <div class="insights-section">
                  <h5>⚠️ Investment Risks</h5>
                  <div v-for="(risk, i) in result.insights.risks" :key="i" class="insight-item">
                    <div class="insight-content">
                      <strong>{{ i + 1 }}. {{ risk.title }}</strong>
                      <p>{{ risk.description }}</p>
                    </div>
                    <button 
                      @click="regenerateRisk(result.ticker, i, true)"
                      :disabled="isRegeneratingRisk(result.ticker, i)"
                      class="regenerate-btn"
                      title="Generate new variant"
                    >
                      {{ isRegeneratingRisk(result.ticker, i) ? '...' : '🔄' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Existing Ticker Preview (only shown when no generation results) -->
          <div v-else-if="!isGenerating && existingTickers.length > 0 && generationResults.length === 0" class="existing-preview">
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
                    <div class="insight-content">
                      <strong>{{ i + 1 }}. {{ adv.title }}</strong>
                      <p>{{ adv.description }}</p>
                    </div>
                    <button 
                      @click="regenerateAdvantage(ticker, i, false)"
                      :disabled="isRegenerating(ticker, i)"
                      class="regenerate-btn"
                      title="Generate new variant"
                    >
                      {{ isRegenerating(ticker, i) ? '...' : '🔄' }}
                    </button>
                  </div>
                </div>

                <div class="insights-section">
                  <h5>⚠️ Investment Risks</h5>
                  <div 
                    v-for="(risk, i) in tickerStatuses[ticker].data?.risks" 
                    :key="i" 
                    class="insight-item"
                  >
                    <div class="insight-content">
                      <strong>{{ i + 1 }}. {{ risk.title }}</strong>
                      <p>{{ risk.description }}</p>
                    </div>
                    <button 
                      @click="regenerateRisk(ticker, i, false)"
                      :disabled="isRegeneratingRisk(ticker, i)"
                      class="regenerate-btn"
                      title="Generate new variant"
                    >
                      {{ isRegeneratingRisk(ticker, i) ? '...' : '🔄' }}
                    </button>
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
  width: 12px;
  height: 12px;
  margin: 0;
  cursor: pointer;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent;
  border: 1px solid #00A88E;
  border-radius: 3px;
  position: relative;
  transition: all 0.2s ease;
}

.ticker-checkbox:hover:not(:disabled) {
  border-color: #00A88E;
  background: rgba(0, 168, 142, 0.1);
}

.ticker-checkbox:checked {
  background: transparent;
  border-color: #00A88E;
  box-shadow: 0 0 8px rgba(0, 168, 142, 0.3);
}

.ticker-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #00A88E;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.ticker-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
}

.status-header h2 {
  margin: 0;
  flex: 1;
}

.status-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
}

.status-controls .text-grey {
  margin-right: 0.1rem;
  font-weight: 500;
}

.btn-tiny {
  background: #2A2A2E;
  color: #E5E5E5;
  border: none;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  line-height: 1.2;
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
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid;
}

.status-item > div {
  flex: 1;
  min-width: 0;
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

.progress-subtitle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.progress-subtitle {
  font-size: 1rem;
  color: var(--color-grey);
  margin: 0;
}

.progress-percentage {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-brand-primary);
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
  gap: 0.5rem;
}

.result-item {
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  border-left: 3px solid;
  overflow: hidden;
  transition: all 0.2s ease;
}

.result-item:hover {
  transform: translateX(2px);
}

.result-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.8rem 0.75rem;
}

.result-header.success {
  background: rgba(0, 168, 142, 0.1);
  border-color: var(--color-success);
}

.result-header.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-danger);
}

.result-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.result-header strong {
  font-size: 0.875rem;
  font-weight: 700;
  color: #E5E5E5;
  letter-spacing: 0.02em;
}

.result-status {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 500;
  color: #9CA3AF;
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
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  position: relative;
}

.insight-content {
  flex: 1;
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

.regenerate-btn {
  background: transparent;
  border: 1px solid #2A2A2E;
  color: #E5E5E5;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  align-self: flex-end;
  min-width: 32px;
  text-align: center;
}

.regenerate-btn:hover:not(:disabled) {
  border-color: #3A3A3E;
  background: rgba(255, 255, 255, 0.02);
}

.regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #6B7280;
  border-color: #374151;
}

.ticker-card {
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  border-left: 3px solid #00A88E;
  background: rgba(0, 168, 142, 0.1);
  margin-bottom: 0.5rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.ticker-card:hover {
  transform: translateX(2px);
}

.ticker-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.8rem 0.75rem;
}

.ticker-header-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;
}

.ticker-header-content:hover {
  opacity: 0.8;
}

.ticker-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.ticker-symbol {
  font-size: 0.875rem;
  font-weight: 700;
  color: #E5E5E5;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.ticker-date {
  font-size: 0.7rem;
  color: #9CA3AF;
  font-weight: 500;
  line-height: 1.2;
}

.expand-icon {
  font-size: 0.7rem;
  color: #9CA3AF;
  transition: transform 0.2s ease;
  margin-top: 2px;
}

.ticker-card-content {
  padding: 0 0.75rem 0.75rem 0.75rem;
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
