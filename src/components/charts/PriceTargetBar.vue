<template>
  <div class="price-target-container">
    <h3 class="chart-title">
      Analyst Price Target
    </h3>
    
    <div v-if="loading" class="loading">Loading price target data...</div>
    
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else-if="hasData" class="visualization">
      <!-- Labels above bar -->
      <div class="labels-row">
        <div class="label-item undervalued">
          <span class="label-text">Undervalued</span>
        </div>
        <div class="label-item fair">
          <span class="label-text">Fair Value</span>
        </div>
        <div class="label-item overvalued">
          <span class="label-text">Overvalued</span>
        </div>
      </div>

      <!-- The horizontal bar with zones -->
      <div class="bar-container">
        <div class="zone-bar">
          <!-- Green zone (strong upside >20%) -->
          <div 
            class="zone green-zone"
            :style="{ width: '40%' }"
          />
          <!-- Yellow zone (hold ±20%) -->
          <div 
            class="zone yellow-zone"
            :style="{ width: '20%' }"
          />
          <!-- Red zone (downside >20%) -->
          <div 
            class="zone red-zone"
            :style="{ width: '40%' }"
          />
        </div>

        <!-- Current price marker -->
        <div 
          v-if="currentPricePosition !== null"
          class="price-marker current-price"
          :style="{ left: currentPricePosition + '%' }"
          :title="`Current: $${currentPrice.toFixed(2)}`"
        >
          <div class="marker-line" />
          <div class="marker-label">
            <div class="marker-value">${{ currentPrice.toFixed(2) }}</div>
            <div class="marker-name">Current</div>
          </div>
        </div>

        <!-- Consensus target marker -->
        <div 
          class="price-marker fair-value"
          :style="{ left: '50%' }"
          :title="`Consensus: $${targetConsensus.toFixed(2)}`"
        >
          <div class="marker-line target" />
          <div class="marker-label target">
            <div class="marker-value">${{ targetConsensus.toFixed(2) }}</div>
            <div class="marker-name">Consensus</div>
          </div>
        </div>
      </div>

      <!-- Price range labels -->
      <div class="range-labels">
        <span class="range-label left" :title="`Low: $${targetLow.toFixed(2)}`">${{ minPrice.toFixed(2) }}</span>
        <span class="range-label right" :title="`High: $${targetHigh.toFixed(2)}`">${{ maxPrice.toFixed(2) }}</span>
      </div>

      <!-- Analysis text -->
      <div class="analysis-text" :class="analysisClass">
        {{ analysisMessage }}
      </div>
    </div>

    <div v-else class="no-data">
      No analyst price target data available for this stock
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'

const tickerStore = useTickerStore()
const { batchData, loading, currentTicker } = storeToRefs(tickerStore)

interface PriceTarget {
  symbol?: string
  targetConsensus: number
  targetHigh: number
  targetLow: number
  targetMedian?: number
}

interface PriceTargetSummary {
  lastMonth?: number
  lastQuarter?: number
  lastYear?: number
  allTime?: number
}

// Extract analyst price targets from batch data
const priceTargetData = computed<PriceTarget | null>(() => {
  // FMP API returns array: [{ symbol, targetConsensus, targetHigh, targetLow, targetMedian }]
  return batchData.value?.data?.priceTargetConsensus?.[0] || null
})

const targetConsensus = computed(() => {
  return priceTargetData.value?.targetConsensus || 0
})

const targetHigh = computed(() => {
  return priceTargetData.value?.targetHigh || 0
})

const targetLow = computed(() => {
  return priceTargetData.value?.targetLow || 0
})

const analystCount = computed(() => {
  // FMP API returns array: [{ lastMonth, lastQuarter, lastYear, allTime, ... }]
  const summary = batchData.value?.data?.priceTargetSummary?.[0] as PriceTargetSummary | undefined
  // Use most recent analyst count (last quarter is good balance of recency vs sample size)
  return summary?.lastQuarter || summary?.lastMonth || summary?.lastYear || 0
})

const currentPrice = computed(() => {
  const quote = batchData.value?.data?.quote?.[0]
  return quote?.price || 0
})

const hasData = computed(() => {
  return targetConsensus.value > 0 && currentPrice.value > 0 && analystCount.value > 0
})

const error = computed(() => {
  if (!currentTicker.value) return 'Enter a ticker symbol'
  return null
})

// Calculate price range based on analyst targets
const minPrice = computed(() => {
  // Use analyst low or 30% below consensus
  const low = targetLow.value > 0 ? targetLow.value : targetConsensus.value * 0.7
  return Math.min(low, currentPrice.value * 0.7)
})

const maxPrice = computed(() => {
  // Use analyst high or 30% above consensus
  const high = targetHigh.value > 0 ? targetHigh.value : targetConsensus.value * 1.3
  return Math.max(high, currentPrice.value * 1.3)
})

// Calculate current price position on the bar (0-100%)
const currentPricePosition = computed<number | null>(() => {
  if (!hasData.value) return null
  
  const min = minPrice.value
  const max = maxPrice.value
  const current = currentPrice.value
  
  // Clamp between 0 and 100
  const position = ((current - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, position))
})

// Calculate upside/downside percentage
const upsidePercentage = computed(() => {
  if (!hasData.value) return 0
  return ((targetConsensus.value - currentPrice.value) / currentPrice.value) * 100
})

const upsideClass = computed(() => {
  const upside = upsidePercentage.value
  if (upside > 15) return 'positive'
  if (upside < -15) return 'negative'
  return 'neutral'
})

const analysisClass = computed(() => {
  const upside = upsidePercentage.value
  if (upside > 20) return 'undervalued'
  if (upside < -20) return 'overvalued'
  return 'fair'
})

const analysisMessage = computed(() => {
  const upside = upsidePercentage.value
  const absUpside = Math.abs(upside)
  const count = analystCount.value
  
  if (upside > 20) {
    return `${count} analyst${count > 1 ? 's' : ''} see ${absUpside.toFixed(1)}% upside. Stock appears undervalued.`
  }
  if (upside < -20) {
    return `${count} analyst${count > 1 ? 's' : ''} see ${absUpside.toFixed(1)}% downside. Stock appears overvalued.`
  }
  if (upside > 0) {
    return `${count} analyst${count > 1 ? 's' : ''} see ${upside.toFixed(1)}% upside. Stock near fair value.`
  }
  return `${count} analyst${count > 1 ? 's' : ''} see ${absUpside.toFixed(1)}% downside. Stock near fair value.`
})
</script>

<style scoped>
.price-target-container {
  padding: 0;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #E5E5E5;
  margin: 0 0 1rem 0;
  text-align: center;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 2rem;
  color: rgba(229, 229, 229, 0.6);
  font-size: 14px;
}

.error {
  color: var(--color-danger, #ef4444);
}

.visualization {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.labels-row {
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
  margin-bottom: 0.75rem;
  margin-top: 0.5rem;
}

.label-item {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-item.undervalued {
  color: var(--color-success, #00A88E);
  text-align: left;
}

.label-item.fair {
  color: var(--color-warning, #F59E0B);
  text-align: center;
}

.label-item.overvalued {
  color: var(--color-danger, #ef4444);
  text-align: right;
}

.bar-container {
  position: relative;
  height: 60px;
  margin: 2rem 0 0.5rem 0;
  gap: 0.5rem;
}

.zone-bar {
  display: flex;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.zone {
  transition: all 0.3s ease;
}

.green-zone {
  background: linear-gradient(to right, var(--color-success, #00A88E), #00C9A7);
}

.yellow-zone {
  background: linear-gradient(to right, #FFD54F, var(--color-warning, #F59E0B));
}

.red-zone {
  background: linear-gradient(to right, #FF6B6B, var(--color-danger, #ef4444));
}

.price-marker {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  z-index: 10;
}

.price-marker.current-price {
  top: 0;
  bottom: auto;
}

.price-marker.current-price .marker-line {
  height: 40px;
}

.price-marker.current-price .marker-label {
  top: 45px;
  bottom: auto;
}

.marker-line {
  width: 3px;
  height: 40px;
  background: #E5E5E5;
  margin: 0 auto;
  box-shadow: 0 0 8px rgba(229, 229, 229, 0.5);
}

.marker-line.target {
  background: #E5E5E5;
  box-shadow: 0 0 8px rgba(229, 229, 229, 0.6);
  width: 3px;
}

.marker-label {
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  background: transparent;
  padding: 4px 8px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.marker-value {
  font-size: 13px;
  font-weight: 700;
  color: #E5E5E5;
  line-height: 1.2;
  text-align: center;
  width: 100%;
}

.marker-name {
  font-size: 10px;
  color: rgba(229, 229, 229, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
  text-align: center;
  width: 100%;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.range-label {
  font-size: 11px;
  color: rgba(229, 229, 229, 0.5);
  font-weight: 500;
}

.analysis-text {
  margin-top: 1rem;
  padding: 0.5rem 0.5rem;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
}

.analysis-text.undervalued {
  background: rgba(0, 168, 142, 0.15);
  border: 1px solid var(--color-success, #00A88E);
  color: var(--color-success, #00A88E);
}

.analysis-text.fair {
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid var(--color-warning, #F59E0B);
  color: var(--color-warning, #F59E0B);
}

.analysis-text.overvalued {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--color-danger, #ef4444);
  color: var(--color-danger, #ef4444);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .price-target-container {
    min-height: 320px;
    padding: 1.5rem 0.5rem;
  }

  .chart-title {
    font-size: 14px;
    margin-bottom: 0.75rem;
  }

  .analyst-info {
    padding: 0.5rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .info-item {
    min-width: 80px;
  }

  .info-label {
    font-size: 10px;
  }

  .info-value {
    font-size: 14px;
  }

  .labels-row {
    margin-top: 0.5rem;
  }

  .label-text {
    font-size: 10px;
  }

  .bar-container {
    height: 70px;
    margin: 2rem 0 0.5rem 0;
  }

  .zone-bar {
    height: 45px;
  }

  .marker-line {
    height: 45px;
  }

  .marker-line.target {
    height: 45px;
  }

  .price-marker.current-price .marker-line {
    height: 45px;
  }

  .marker-label {
    top: -45px;
    padding: 4px 6px;
    min-width: 70px;
  }

  .price-marker.current-price .marker-label {
    top: 50px;
  }

  .marker-value {
    font-size: 11px;
  }

  .marker-name {
    font-size: 9px;
    margin-top: 2px;
  }

  .range-labels {
    margin-top: 0.5rem;
  }

  .range-label {
    font-size: 10px;
  }

  .analysis-text {
    font-size: 11px;
    padding: 0.5rem;
    margin-top: 1rem;
    line-height: 1.5;
  }
}

/* Extra small screens */
@media (max-width: 375px) {
  .analyst-info {
    padding: 0.5rem 0.25rem;
  }

  .info-item {
    min-width: 70px;
  }

  .info-label {
    font-size: 9px;
  }

  .info-value {
    font-size: 13px;
  }

  .marker-label {
    padding: 3px 4px;
    min-width: 60px;
  }

  .marker-value {
    font-size: 10px;
  }

  .marker-name {
    font-size: 8px;
  }

  .analysis-text {
    font-size: 10px;
    padding: 0.5rem 0.25rem;
  }
}
</style>
