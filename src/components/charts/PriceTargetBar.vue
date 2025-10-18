<template>
  <div class="price-target-container">
    <h3 class="chart-title">Price Target Analysis</h3>
    
    <div v-if="loading" class="loading">Loading price target...</div>
    
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
          <!-- Green zone (undervalued) -->
          <div 
            class="zone green-zone"
            :style="{ width: '40%' }"
          />
          <!-- Yellow zone (fair value ±20%) -->
          <div 
            class="zone yellow-zone"
            :style="{ width: '20%' }"
          />
          <!-- Red zone (overvalued) -->
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

        <!-- Fair value marker -->
        <div 
          class="price-marker fair-value"
          :style="{ left: '50%' }"
          :title="`Target: $${priceTarget.toFixed(2)}`"
        >
          <div class="marker-line target" />
          <div class="marker-label target">
            <div class="marker-value">${{ priceTarget.toFixed(2) }}</div>
            <div class="marker-name">Target</div>
          </div>
        </div>
      </div>

      <!-- Price range labels -->
      <div class="range-labels">
        <span class="range-label left">${{ minPrice.toFixed(2) }}</span>
        <span class="range-label right">${{ maxPrice.toFixed(2) }}</span>
      </div>

      <!-- Analysis text -->
      <div class="analysis-text" :class="analysisClass">
        {{ analysisMessage }}
      </div>
    </div>

    <div v-else class="no-data">
      No price target data available
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'

const tickerStore = useTickerStore()
const { batchData, loading, currentTicker } = storeToRefs(tickerStore)

// Extract price target and current price from batch data
const priceTarget = computed(() => {
  const profile = batchData.value?.data?.profile?.[0]
  return profile?.dcf || profile?.price || 0
})

const currentPrice = computed(() => {
  const quote = batchData.value?.data?.quote?.[0]
  return quote?.price || 0
})

const hasData = computed(() => {
  return priceTarget.value > 0 && currentPrice.value > 0
})

const error = computed(() => {
  if (!currentTicker.value) return 'Enter a ticker symbol'
  return null
})

// Calculate price range (fair value ±20% for yellow zone, extend beyond for full range)
const minPrice = computed(() => {
  // Undervalued zone extends 50% below fair value
  return priceTarget.value * 0.5
})

const maxPrice = computed(() => {
  // Overvalued zone extends 50% above fair value
  return currentPrice.value * 1.5
})

// Calculate current price position on the bar (0-100%)
const currentPricePosition = computed(() => {
  if (!hasData.value) return null
  
  const min = minPrice.value
  const max = maxPrice.value
  const current = currentPrice.value
  
  // Clamp between 0 and 100
  const position = ((current - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, position))
})

// Analysis based on current price vs target
const priceDifference = computed(() => {
  if (!hasData.value) return 0
  return ((currentPrice.value - priceTarget.value) / priceTarget.value) * 100
})

const analysisClass = computed(() => {
  const diff = priceDifference.value
  if (diff < -20) return 'undervalued'
  if (diff > 20) return 'overvalued'
  return 'fair'
})

const analysisTitle = computed(() => {
  const diff = priceDifference.value
  if (diff < -20) return 'Undervalued'
  if (diff > 20) return 'Overvalued'
  return 'Fair Value'
})

const analysisMessage = computed(() => {
  const diff = priceDifference.value
  const absDiff = Math.abs(diff)
  
  if (diff < -20) {
    return `Stock is trading ${absDiff.toFixed(1)}% below fair value.`
  }
  if (diff > 20) {
    return `Stock is trading ${absDiff.toFixed(1)}% above fair value.`
  }
  return `Stock is trading within ±20% of fair value (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%).`
})
</script>

<style scoped>
.price-target-container {
  padding: 1rem;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #E5E5E5;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 2rem;
  color: rgba(229, 229, 229, 0.6);
  font-size: 14px;
}

.error {
  color: #ef4444;
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
  color: #00A88E;
  text-align: left;
}

.label-item.fair {
  color: #FFC107;
}

.label-item.overvalued {
  color: #ef4444;
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
  background: linear-gradient(to right, #00A88E, #00C9A7);
}

.yellow-zone {
  background: linear-gradient(to right, #FFD54F, #FFC107);
}

.red-zone {
  background: linear-gradient(to right, #FF6B6B, #ef4444);
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
  border: 1px solid #00A88E;
  color: #00A88E;
}

.analysis-text.fair {
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid #FFC107;
  color: #FFC107;
}

.analysis-text.overvalued {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .price-target-container {
    min-height: 280px;
    padding: 1.5rem 0.5rem;
  }

  .chart-title {
    font-size: 14px;
    margin-bottom: 0.5rem;
  }

  .labels-row {
    margin-top: 0.5rem;
  }

  .label-text {
    font-size: 10px;
  }

  .bar-container {
    height: 70px;
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

  .marker-label {
    top: -40px;
    padding: 4px 30px;
  }

  .price-marker.current-price .marker-label {
    top: 50px;
  }

  .marker-value {
    font-size: 12px;
  }

  .marker-name {
    font-size: 10px;
    margin-top: 3px;
  }

  .analysis-text {
    font-size: 11px;
    padding: 0.5rem;
    margin-top: 1rem;
  }
}
</style>
