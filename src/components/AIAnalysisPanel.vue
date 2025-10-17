<template>
  <section class="analysis-panel">
    <div class="analysis-header">
      <h3>{{ title }}</h3>
      <button 
        v-if="!loading && data" 
        class="refresh-btn" 
        title="Refresh analysis"
        @click="refresh"
      >
        ↻
      </button>
    </div>
    
    <div
      v-if="loading"
      class="loading"
    >
      <div class="loading-spinner" />
      <p>Analyzing...</p>
    </div>
    
    <div
      v-else-if="error"
      class="error"
    >
      <p>{{ error }}</p>
      <button
        class="retry-btn"
        @click="refresh"
      >
        Try Again
      </button>
    </div>
    
    <div
      v-else-if="data"
      class="content"
    >
      <div
        class="analysis-text"
        v-html="formattedData"
      />
      <div class="footer-info">
        <div
          v-if="cached"
          class="cache-indicator"
          title="Loaded from cache"
        >
          📌 Cached (expires in {{ daysUntilExpiry }} days)
        </div>
        <div
          v-if="provider"
          class="provider-indicator"
          :title="`Using ${provider === 'ollama' ? 'local Ollama' : 'OpenAI API'}`"
        >
          🤖 {{ provider === 'ollama' ? 'Ollama' : 'OpenAI' }}
        </div>
      </div>
    </div>
    
    <div
      v-else
      class="empty"
    >
      <p>AI analysis temporarily disabled</p>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
// AI features temporarily disabled - keeping imports for future use
// eslint-disable-next-line no-unused-vars
import { getCompetitiveAdvantages as _getCompetitiveAdvantages, getInvestmentRisks as _getInvestmentRisks } from '../services/ai/chatgptService'

// Re-enable AI functions by assigning to expected names
const getCompetitiveAdvantages = _getCompetitiveAdvantages
const getInvestmentRisks = _getInvestmentRisks

const props = defineProps({
  companyName: { type: String, default: '' },
  type: { type: String, required: true, validator: (v) => ['advantages', 'risks'].includes(v) }
})

// Use Pinia store for ticker with storeToRefs to maintain reactivity
const tickerStore = useTickerStore()
const { currentTicker } = storeToRefs(tickerStore)
const data = ref(null)
const loading = ref(false)
const error = ref(null)
const cached = ref(false)
const provider = ref(null)

const title = computed(() => 
  props.type === 'advantages' ? 'Competitive Advantages' : 'Investment Risks'
)

const formattedData = computed(() => {
  if (!data.value) return ''
  
  // Handle new JSON format: array of {title, description}
  if (data.value.success !== false && Array.isArray(data.value.data)) {
    return data.value.data
      .map(item => {
        const title = item.title ? `<strong>${item.title}:</strong>` : ''
        const description = item.description || ''
        return `<div class="bullet-point">${title} ${description}</div>`
      })
      .join('')
  }
  
  // Fallback for old format (plain text with bullet points)
  const text = typeof data.value === 'string' ? data.value : data.value.data?.[0]?.description || ''
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Handle bullet points
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        return `<div class="bullet-point">${line.substring(1).trim()}</div>`
      }
      return `<div class="bullet-point">${line}</div>`
    })
    .join('')
})

const daysUntilExpiry = computed(() => {
  // Simple calculation - actual expiry is tracked in localStorage
  return 30
})

// AI feature temporarily disabled - parameter marked as unused
// eslint-disable-next-line no-unused-vars
async function fetchAnalysis(_clearCache = false) {
  // AI feature disabled - show message without making API call
  const t = (currentTicker.value || '').trim().toUpperCase()
  if (!t) {
    return
  }
  
  // Set a friendly disabled message
  loading.value = false
  error.value = null
  data.value = null
  cached.value = false
  
  // Show disabled message instead of making API call
  // Uncomment the code below to re-enable AI features:
  
  // loading.value = true
  // error.value = null
  // data.value = null
  // cached.value = false
  
  // Wait for company name to be available (max 3 seconds)
  let company = props.companyName
  if (!company) {
    console.log(`[AI] Waiting for company name for ${t}...`)
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (props.companyName) {
        company = props.companyName
        console.log(`[AI] Got company name: ${company}`)
        break
      }
    }
  }
  
  try {
    const fetchFn = props.type === 'advantages' ? getCompetitiveAdvantages : getInvestmentRisks
  const result = await fetchFn(t, company || t, _clearCache)
    
    if (result.error) {
      // Check if it's an API key error and show a friendly message
      const errorMsg = result.error
      if (errorMsg.includes('API key not configured') || errorMsg.includes('401')) {
        error.value = 'AI analysis requires an API key to be configured. This feature is optional.'
      } else {
        error.value = result.error
      }
      provider.value = result.provider
    } else {
      // Store the entire result object (includes parsed data)
      data.value = result.data
      cached.value = result.cached || false
      provider.value = result.provider
    }
  } catch (e) {
    const errorMsg = e.message || 'Failed to load analysis'
    // Check if it's an API key error
    if (errorMsg.includes('API key not configured') || errorMsg.includes('401')) {
      error.value = 'AI analysis requires an API key to be configured. This feature is optional.'
    } else {
      error.value = errorMsg
    }
  } finally {
    loading.value = false
  }
  
}

// Manual refresh - clears cache and fetches fresh
async function refresh() {
  await fetchAnalysis(true)
}

// Auto-refresh when ticker changes - uses cache
watch(currentTicker, () => fetchAnalysis(false), { immediate: true })
</script>

<style scoped>
.analysis-panel {
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.analysis-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.refresh-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ddd;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #aaa;
  gap: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #4a9eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ff6a6a;
  gap: 12px;
}

.retry-btn {
  background: rgba(255, 106, 106, 0.1);
  border: 1px solid rgba(255, 106, 106, 0.3);
  color: #ff6a6a;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(255, 106, 106, 0.2);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-text {
  color: #ddd;
  font-size: 14px;
  line-height: 1.6;
  flex: 1;
}

.bullet-point {
  margin-bottom: 12px;
  padding-left: 20px;
  position: relative;
}

.bullet-point::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #4a9eff;
  font-weight: bold;
  font-size: 16px;
}

.bullet-point :deep(strong) {
  color: #fff;
  font-weight: 600;
  display: inline-block;
  margin-right: 4px;
}

.footer-info {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.cache-indicator,
.provider-indicator {
  font-size: 11px;
  color: #888;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: help;
  white-space: nowrap;
}

.provider-indicator {
  background: rgba(74, 158, 255, 0.1);
  color: #4a9eff;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}
</style>
