<template>
  <section class="analysis-panel panel">
    <div class="analysis-header">
      <h3>{{ title }}</h3>
    </div>
    
    <div
      v-if="loading"
      class="loading"
    >
      <div class="loading-spinner" />
      <p>Loading...</p>
    </div>
    
    <div
      v-else-if="error"
      class="error"
    >
      <p>{{ error }}</p>
    </div>
    
    <div
      v-else-if="data"
      class="content"
    >
      <div
        class="analysis-text"
        v-html="formattedData"
      />
    </div>
    
    <div
      v-else
      class="empty"
    >
      <p>No analysis available</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
// AI insights from static JSON files (pre-generated locally)
import { getCompetitiveAdvantages, getInvestmentRisks } from '../../services/ai/insightsService'

type AnalysisType = 'advantages' | 'risks'

interface Props {
  companyName?: string
  type: AnalysisType
}

const props = withDefaults(defineProps<Props>(), {
  companyName: ''
})

interface InsightItem {
  title?: string
  description?: string
}

interface InsightData {
  data: InsightItem[]
  success?: boolean
}

// Use Pinia store for ticker with storeToRefs to maintain reactivity
const tickerStore = useTickerStore()
const { currentTicker } = storeToRefs(tickerStore)
const data = ref<InsightData | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const title = computed(() => 
  props.type === 'advantages' ? 'Competitive Advantages' : 'Investment Risks'
)

const formattedData = computed(() => {
  if (!data.value) return ''
  
  // Handle JSON format: array of {title, description}
  // This includes both success=true (real insights) and success=false (friendly messages)
  if (Array.isArray(data.value.data)) {
    return data.value.data
      .map(item => {
        const title = item.title ? `<strong>${item.title}:</strong>` : ''
        const description = item.description || ''
        return `<div class="bullet-point">${title} ${description}</div>`
      })
      .join('')
  }
  
  return ''
})

async function fetchAnalysis(): Promise<void> {
  const t = (currentTicker.value || '').trim().toUpperCase()
  if (!t) {
    return
  }
  
  loading.value = true
  error.value = null
  data.value = null
  
  try {
    const fetchFn = props.type === 'advantages' ? getCompetitiveAdvantages : getInvestmentRisks
    const result = await fetchFn(t, props.companyName || t)
    
    if (result.error) {
      error.value = result.error
    } else {
      data.value = result.data
    }
  } catch (_e) {
    error.value = (_e as Error).message || 'Failed to load analysis'
  } finally {
    loading.value = false
  }
}

// Auto-load when ticker changes
watch(currentTicker, () => fetchAnalysis(), { immediate: true })
</script>

<style scoped>
.analysis-panel {
  /* Inherits styling from .panel class in globals.css:
     - gradient background: linear-gradient(135deg, #151518 0%, #1E1E22 100%)
     - border: 1px solid #2A2A2E with hover effect
     - box-shadow: 0 4px 12px rgba(0,0,0,0.3)
     - border-radius: 12px
     - padding: 1.5rem
     - hover effects with Aston Martin green glow */
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

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}
</style>
