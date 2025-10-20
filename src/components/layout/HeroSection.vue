<template>
  <section class="hero-section">
    <div class="hero-container">
      <!-- Primary: Price Chart (60% width) -->
      <div class="price-chart-container">
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
            variant="text" 
            :style="{ marginBottom: '16px', height: '60px' }" 
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
                :title="indicator.tooltip"
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
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getValuationFromBatch, getCashFlowFactsFromBatch, getMarginsGrowthFromBatch } from '../../services/financials/batchTableService.js'
import PriceChart from '../charts/PriceChart.vue'
import SkeletonLoader from '../common/SkeletonLoader.vue'

const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Aggregate key metrics from multiple data sources
const data = computed(() => {
  const valuation = getValuationFromBatch(batchData.value)
  const cashFlow = getCashFlowFactsFromBatch(batchData.value)
  const margins = getMarginsGrowthFromBatch(batchData.value)

  return {
    marketCap: valuation.marketCap || '—',
    pe: valuation.pe || '—',
    ps: valuation.ps || '—',
    evEbitda: valuation.evEbitda || '—',
    fcfYield: cashFlow.fcfYield || '—',
    profitMargin: margins.profitMargin || '—'
  }
})

// Health indicators based on multiple metrics
const healthIndicators = computed(() => {
  const indicators = []
  
  // Valuation health (composite score from P/E, P/S, EV/EBITDA)
  const pe = parseFloat(data.value.pe)
  const ps = parseFloat(data.value.ps)
  const evEbitda = parseFloat(data.value.evEbitda)
  
  let valuationScore = 0
  let validMetrics = 0
  
  // Score P/E Ratio (lower is better)
  if (!isNaN(pe) && pe > 0) {
    validMetrics++
    if (pe < 15) valuationScore += 2      // Good
    else if (pe < 25) valuationScore += 1  // Neutral
    else valuationScore += 0               // Overvalued
  }
  
  // Score P/S Ratio (lower is better)
  if (!isNaN(ps) && ps > 0) {
    validMetrics++
    if (ps < 2) valuationScore += 2        // Good
    else if (ps < 5) valuationScore += 1   // Neutral
    else valuationScore += 0               // Overvalued
  }
  
  // Score EV/EBITDA (lower is better)
  if (!isNaN(evEbitda) && evEbitda > 0) {
    validMetrics++
    if (evEbitda < 10) valuationScore += 2    // Good
    else if (evEbitda < 15) valuationScore += 1  // Neutral
    else valuationScore += 0                  // Overvalued
  }
  
  // Calculate average score (0-2 range)
  if (validMetrics > 0) {
    const avgScore = valuationScore / validMetrics
    
    if (avgScore >= 1.5) {
      indicators.push({ 
        label: 'Valuation', 
        status: 'good', 
        tooltip: `Attractive valuation (P/E: ${data.value.pe}, P/S: ${data.value.ps}, EV/EBITDA: ${data.value.evEbitda})` 
      })
    } else if (avgScore >= 0.8) {
      indicators.push({ 
        label: 'Valuation', 
        status: 'neutral', 
        tooltip: `Fair valuation (P/E: ${data.value.pe}, P/S: ${data.value.ps}, EV/EBITDA: ${data.value.evEbitda})` 
      })
    } else {
      indicators.push({ 
        label: 'Valuation', 
        status: 'warning', 
        tooltip: `Expensive valuation (P/E: ${data.value.pe}, P/S: ${data.value.ps}, EV/EBITDA: ${data.value.evEbitda})` 
      })
    }
  }
  
  // Cash flow health (FCF Yield)
  const fcfYield = parseFloat(data.value.fcfYield)
  if (!isNaN(fcfYield)) {
    if (fcfYield > 5) {
      indicators.push({ label: 'Cash Flow', status: 'good', tooltip: 'FCF Yield > 5% - Strong cash generation' })
    } else if (fcfYield > 2) {
      indicators.push({ label: 'Cash Flow', status: 'neutral', tooltip: 'FCF Yield 2-5% - Moderate cash generation' })
    } else {
      indicators.push({ label: 'Cash Flow', status: 'warning', tooltip: 'FCF Yield < 2% - Weak cash generation' })
    }
  }
  
  // Profitability health
  const margin = parseFloat(data.value.profitMargin)
  if (!isNaN(margin)) {
    if (margin > 20) {
      indicators.push({ label: 'Profitability', status: 'good', tooltip: 'Profit Margin > 20% - Highly profitable' })
    } else if (margin > 10) {
      indicators.push({ label: 'Profitability', status: 'neutral', tooltip: 'Profit Margin 10-20% - Solid profitability' })
    } else {
      indicators.push({ label: 'Profitability', status: 'warning', tooltip: 'Profit Margin < 10% - Lower profitability' })
    }
  }
  
  return indicators
})

// Helper functions
const getYieldClass = (yieldStr) => {
  const val = parseFloat(yieldStr)
  if (isNaN(val)) return ''
  if (val > 5) return 'positive'
  if (val > 2) return 'neutral'
  return 'negative'
}

const getMarginClass = (marginStr) => {
  const val = parseFloat(marginStr)
  if (isNaN(val)) return ''
  if (val > 20) return 'positive'
  if (val > 10) return 'neutral'
  return 'negative'
}
</script>

<style scoped>
.hero-section {
  width: 100%;
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 12px;
}

.hero-container {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

.price-chart-container {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
}

.price-chart-container:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.3);
  transform: translateY(-2px);
}

.key-metrics-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
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
}

.metric-item:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(0, 168, 142, 0.3);
}

.metric-item-full {
  grid-column: 1 / -1;
}

.metric-label {
  font-size: 0.85rem;
  color: #9E9E9E;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #E5E5E5;
  line-height: 1.2;
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
  }

  .health-indicators {
    gap: 8px;
  }

  .health-indicator {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
}
</style>
