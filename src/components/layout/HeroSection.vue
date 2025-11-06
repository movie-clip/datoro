<template>
  <div class="hero-container">
    <!-- Primary: Price Chart (60% width) -->
    <div class="price-chart-container">
      <!-- Tab Navigation -->
      <TabNavigation 
        v-model="activeTab" 
        :tabs="tabs"
      />
      
      <!-- About Tab - Company Description -->
      <div v-show="activeTab === 'about'" class="tab-content">
        <div v-if="loading" class="description-skeleton">
          <SkeletonLoader 
            variant="text" 
            :style="{ marginBottom: '8px', height: '14px' }" 
          />
          <SkeletonLoader 
            variant="text" 
            :style="{ marginBottom: '8px', height: '14px' }" 
          />
          <SkeletonLoader 
            variant="text" 
            :style="{ height: '14px' }" 
          />
        </div>
        <CollapsibleContent 
          v-else-if="companyDescription"
          :min-height="110"
          :collapsed-lines="3"
        >
          {{ companyDescription }}
        </CollapsibleContent>
        <div v-else class="description-placeholder">
          <p>No company description available</p>
        </div>
      </div>

      <!-- News Tab -->
      <div v-show="activeTab === 'news'" class="tab-content">
        <div v-if="newsLoading" class="description-skeleton">
          <SkeletonLoader 
            variant="text" 
            :style="{ marginBottom: '8px', height: '14px' }" 
          />
          <SkeletonLoader 
            variant="text" 
            :style="{ marginBottom: '8px', height: '14px' }" 
          />
          <SkeletonLoader 
            variant="text" 
            :style="{ height: '14px' }" 
          />
        </div>
        <div v-else-if="newsItems.length > 0" class="news-container">
          <!-- First News Item (always visible) -->
          <NewsCard v-if="newsItems[0]" :item="newsItems[0]" />
          
          <!-- Additional News Items (collapsible) -->
          <div v-if="newsItems.length > 1" class="news-expandable">
            <div v-show="newsExpanded" class="additional-news">
              <NewsCard 
                v-for="(item, index) in newsItems.slice(1, 3)" 
                :key="index"
                :item="item"
              />
            </div>
            <button 
              class="news-toggle"
              @click="newsExpanded = !newsExpanded"
            >
              {{ newsExpanded ? 'less' : 'more' }}
            </button>
          </div>
        </div>
        <div v-else class="description-placeholder">
          <p>{{ newsError || 'No recent news available' }}</p>
        </div>
      </div>
      
      <!-- Price Chart -->
      <PriceChart />
    </div>

      <!-- Secondary: Key Metrics Card (40% width) -->
      <div class="key-metrics-card">
        <h3 class="metrics-title">Key Metrics</h3>
        
        <!-- Loading State -->
        <div v-if="loading" class="metrics-loading">
          <SkeletonLoader 
            v-for="i in 6" 
            :key="i" 
            variant="card" 
            :style="{ marginBottom: '16px', height: '90px', borderRadius: '8px' }" 
          />
        </div>

        <!-- Metrics Grid -->
        <div v-else-if="!error" class="metrics-grid">
          <!-- Market Cap -->
          <div class="metric-item">
            <div class="metric-label">Market Cap</div>
            <div class="metric-value">{{ data.marketCap }}</div>
          </div>

          <!-- P/E Ratio -->
          <div class="metric-item">
            <div class="metric-label">P/E Ratio</div>
            <div class="metric-value">{{ data.pe }}</div>
          </div>

          <!-- FCF Yield -->
          <div class="metric-item">
            <div class="metric-label">FCF Yield</div>
            <div 
              class="metric-value"
              :class="getYieldClass(data.fcfYield)"
            >
              {{ data.fcfYield }}
            </div>
          </div>

          <!-- Profit Margin -->
          <div class="metric-item">
            <div class="metric-label">Profit Margin</div>
            <div 
              class="metric-value"
              :class="getMarginClass(data.profitMargin)"
            >
              {{ data.profitMargin }}
            </div>
          </div>

          <!-- Health Indicator -->
          <div class="metric-item metric-item-full">
            <div class="metric-label">Overall Health</div>
            <div class="health-indicators">
              <div 
                v-for="indicator in healthIndicators" 
                :key="indicator.label"
                class="health-indicator"
                :class="`health-${indicator.status}`"
                :data-tooltip="indicator.tooltip"
              >
                <span class="health-dot"></span>
                <span class="health-label">{{ indicator.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="metrics-error">
          <p>{{ error }}</p>
        </div>
    </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getValuationFromBatch, getCashFlowFactsFromBatch, getMarginsGrowthFromBatch, getBalanceFromBatch } from '../../services/financials/batchTableService'
import { calculateAllHealthIndicators, type HealthIndicator } from '../../services/health/healthIndicatorService'
import { useTickerNews } from '../../composables/useTickerNews'
import PriceChart from '../charts/PriceChart.vue'
import SkeletonLoader from '../common/SkeletonLoader.vue'
import TabNavigation, { type Tab } from '../common/TabNavigation.vue'
import NewsCard from '../news/NewsCard.vue'
import CollapsibleContent from '../common/CollapsibleContent.vue'

const tickerStore = useTickerStore()
const { batchData, loading, error, currentTicker } = storeToRefs(tickerStore)

// Tab Navigation State
const activeTab = ref<string>('about')
const tabs: Tab[] = [
  { id: 'about', label: 'About' },
  { id: 'news', label: 'News' }
]

// Reset to About tab when ticker changes
watch(currentTicker, () => {
  activeTab.value = 'about'
  newsExpanded.value = false // Reset news expansion
})

// News Data
const { newsItems, loading: newsLoading, error: newsError } = useTickerNews(currentTicker, { 
  limit: 5, // Fetch top 5 news items but display only the most important one
  autoFetch: true 
})

// News expansion state
const newsExpanded = ref(false)

// Extract company description from batch data
const companyDescription = computed(() => {
  const profile = batchData.value?.data?.profile?.[0]
  return profile?.description || ''
})

// Aggregate key metrics from multiple data sources
const data = computed(() => {
  const valuation = getValuationFromBatch(batchData.value)
  const cashFlow = getCashFlowFactsFromBatch(batchData.value)
  const margins = getMarginsGrowthFromBatch(batchData.value)
  const balance = getBalanceFromBatch(batchData.value)

  return {
    marketCap: valuation.marketCap || '—',
    pe: valuation.pe || '—',
    ps: valuation.ps || '—',
    evEbitda: valuation.evEbitda || '—',
    fcfYield: cashFlow.fcfYield || '—',
    profitMargin: margins.profitMargin || '—',
    altmanZScore: balance.altmanZScore || '—',
    altmanZColor: balance.altmanZColor || 'grey'
  }
})

// Health indicators using centralized service with caching
// This prevents duplicate growth calculations and improves performance
const healthIndicators = computed<HealthIndicator[]>(() => {
  const valuation = getValuationFromBatch(batchData.value)
  const cashFlow = getCashFlowFactsFromBatch(batchData.value)
  const balance = getBalanceFromBatch(batchData.value)
  
  if (!batchData.value) return []
  
  return calculateAllHealthIndicators({
    valuation: {
      pe: parseFloat(data.value.pe),
      ps: parseFloat(data.value.ps),
      evEbitda: parseFloat(data.value.evEbitda)
    },
    batchData: batchData.value,
    ticker: currentTicker.value,
    fcfYield: cashFlow.fcfYield,
    balance
  })
})

// Helper functions
const getYieldClass = (yieldStr: string): string => {
  const val = parseFloat(yieldStr)
  if (isNaN(val)) return ''
  if (val > 5) return 'positive'
  if (val > 2) return 'neutral'
  return 'negative'
}

const getMarginClass = (marginStr: string): string => {
  const val = parseFloat(marginStr)
  if (isNaN(val)) return ''
  if (val > 20) return 'positive'
  if (val > 10) return 'neutral'
  return 'negative'
}
</script>

<style scoped>
.hero-container {
  display: grid;
  grid-template-columns: 1.5fr 1fr; /* Changed from 1.5fr 1fr - gives chart 66% width instead of 60% */
  gap: 20px;
}

.price-chart-container {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  min-height: 475px; /* Reduced by 5% (was 500px) */
  overflow: hidden; /* Prevent content from expanding container */
  max-width: 100%; /* Ensure it doesn't exceed grid column width */
}

.price-chart-container:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.3);
  transform: translateY(-2px);
}

/* Make Price Chart taller (only affects chart in this container) */
.price-chart-container :deep(.echart) {
  height: 428px !important; /* Reduced by 5% (was 450px) */
}

/* Tab Content Area - Fixed sizing */
.tab-content {
  min-height: 110px; /* Fixed height to prevent layout shift */
  margin-bottom: 16px;
}

.description-skeleton {
  padding: 8px 0;
  min-height: 110px;
}

.description-placeholder {
  min-height: 110px;
  padding: 16px 0;
  color: rgba(158, 158, 158, 0.8);
  font-size: 14px;
}

.description-placeholder p {
  margin: 0;
}

/* News Container - Constrain width */
.news-container {
  width: 100%;
  max-width: 100%;
  overflow: hidden; /* Prevent horizontal overflow */
}

/* News Expandable Section */
.news-expandable {
  margin-top: 8px;
}

/* Additional News Container */
.additional-news {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 8px;
}

/* News Toggle Button - Match CollapsibleContent style */
.news-toggle {
  display: inline-block;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  color: #00A88E;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.news-toggle:hover {
  background: rgba(0, 89, 76, 0.1);
  border-color: #00594C;
  transform: translateY(-1px);
}

.news-toggle:active {
  transform: translateY(0);
}

.key-metrics-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  min-height: 570px; /* Reduced by 5% (was 600px) */
}

.key-metrics-card:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.3);
  transform: translateY(-2px);
}

.metrics-title {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #E5E5E5;
}

.metrics-grid {
  display: grid;
  gap: 16px;
}

.metric-item {
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  min-height: 86px; /* Reduced by 5% (was 90px) */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.metric-item:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(0, 168, 142, 0.3);
}

.metric-item-full {
  grid-column: 1 / -1;
  min-height: 95px; /* Reduced by 5% (was 100px) */
}

.metric-label {
  font-size: 0.85rem;
  color: #9E9E9E;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  min-height: 18px; /* Fixed height for label */
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #E5E5E5;
  line-height: 1.2;
  min-height: 32px; /* Reduced by 5% (was 34px) */
  display: flex;
  align-items: center;
}

.metric-value.positive {
  color: #00C087;
}

.metric-value.negative {
  color: #FF4976;
}

.metric-value.neutral {
  color: #FFB800;
}

.health-indicators {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.health-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  border: 1px solid transparent;
  cursor: help;
  transition: all 0.2s ease;
}

.health-indicator:hover {
  transform: translateY(-2px);
}

.health-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.health-good .health-dot {
  background: #00C087;
  box-shadow: 0 0 8px rgba(0, 192, 135, 0.5);
}

.health-neutral .health-dot {
  background: #FFB800;
  box-shadow: 0 0 8px rgba(255, 184, 0, 0.5);
}

.health-warning .health-dot {
  background: #FF4976;
  box-shadow: 0 0 8px rgba(255, 73, 118, 0.5);
}

.health-good {
  border-color: rgba(0, 192, 135, 0.3);
}

.health-neutral {
  border-color: rgba(255, 184, 0, 0.3);
}

.health-warning {
  border-color: rgba(255, 73, 118, 0.3);
}

.health-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #E5E5E5;
}

/* Custom tooltip styling for health indicators */
.health-indicator[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: rgba(30, 30, 34, 0.98);
  color: #E5E5E5;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #2A2A2E;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: tooltipFadeIn 0.2s ease;
}

.health-indicator[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(30, 30, 34, 0.98);
  z-index: 1000;
  pointer-events: none;
  animation: tooltipFadeIn 0.2s ease;
}

.health-indicator {
  position: relative;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.metrics-loading,
.metrics-error {
  padding: 20px;
  text-align: center;
  color: #9E9E9E;
}

/* Tablet and below */
@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
  }

  .metric-value {
    font-size: 1.5rem;
    min-height: 29px; /* Reduced by 5% (was 30px) */
  }

  .metric-item {
    min-height: 81px; /* Reduced by 5% (was 85px) */
  }
}

/* Mobile */
@media (max-width: 768px) {
  .hero-section {
    margin: 16px auto;
    padding: 0 8px;
  }

  .hero-container {
    gap: 12px;
  }

  .price-chart-container,
  .key-metrics-card {
    padding: 1rem;
  }

  .metrics-title {
    font-size: 1.25rem;
    margin-bottom: 16px;
  }

  .metric-value {
    font-size: 1.35rem;
    min-height: 27px; /* Reduced by 5% (was 28px) */
  }

  .metric-item {
    min-height: 76px; /* Reduced by 5% (was 80px) */
  }

  .metric-item-full {
    min-height: 86px; /* Reduced by 5% (was 90px) */
  }

  .health-indicators {
    gap: 8px;
  }

  .health-indicator {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
}

/* iPhone 12-16 Portrait (390px-430px) */
@media (max-width: 430px) {
  .hero-section {
    padding: 0 12px;
    margin: 12px auto;
  }

  .price-chart-container,
  .key-metrics-card {
    padding: 0.875rem;
  }

  .metrics-grid {
    gap: 10px;
  }
}

/* iPhone 12-16 Landscape */
@media (max-height: 430px) and (orientation: landscape) {
  .hero-section {
    margin: 8px auto;
  }

  .hero-container {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .price-chart-container,
  .key-metrics-card {
    padding: 0.75rem;
  }

  .metrics-title {
    font-size: 1.1rem;
    margin-bottom: 12px;
  }

  .metric-item {
    min-height: 67px; /* Reduced by 5% (was 70px) */
  }

  .metric-item-full {
    min-height: 71px; /* Reduced by 5% (was 75px) */
  }
}
</style>
