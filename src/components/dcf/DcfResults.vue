<template>
  <div class="dcf-results">
    <h3 class="section-title">Valuation Results</h3>
    
    <div v-if="intrinsicValue !== null" class="results-grid">
      <!-- Intrinsic Value Card -->
      <div class="result-card">
        <div class="card-label">Intrinsic Value</div>
        <div class="card-value" :class="intrinsicValueClass">${{ formatNumber(intrinsicValue) }}</div>
        <div class="card-hint">Fair value per share</div>
      </div>

      <!-- Current Price Card -->
      <div class="result-card">
        <div class="card-label">Current Price</div>
        <div class="card-value">${{ formatNumber(currentPrice) }}</div>
        <div class="card-hint">Market price</div>
      </div>

      <!-- Upside/Downside Card -->
      <div class="result-card">
        <div class="card-label">Upside / Downside</div>
        <div class="card-value" :class="upsideClass">
          {{ upside > 0 ? '+' : '' }}{{ upside.toFixed(1) }}%
        </div>
        <div class="card-hint">Potential return</div>
      </div>
    </div>

    <div v-else class="results-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <p>Adjust assumptions to see results</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  intrinsicValue: {
    type: Number,
    default: null
  },
  currentPrice: {
    type: Number,
    default: null
  },
  upside: {
    type: Number,
    default: null
  }
})

const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A'
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

const upsideClass = computed(() => {
  if (props.upside === null) return ''
  if (props.upside > 0) return 'positive'
  if (props.upside < 0) return 'negative'
  return 'neutral'
})

const intrinsicValueClass = computed(() => {
  if (props.intrinsicValue === null || props.currentPrice === null) return ''
  
  const priceDiff = ((props.intrinsicValue - props.currentPrice) / props.currentPrice) * 100
  
  // Within ±5% range - neutral/yellow
  if (priceDiff >= -5 && priceDiff <= 5) return 'neutral'
  
  // Intrinsic value higher than current price - positive/green
  if (priceDiff > 5) return 'positive'
  
  // Intrinsic value lower than current price - negative/red
  return 'negative'
})
</script>

<style scoped>
.dcf-results {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(0, 89, 76, 0.1);
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.result-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}

.result-card:hover {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.15);
}

.card-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.card-value.positive {
  color: #00b894;
}

.card-value.negative {
  color: #ff7675;
}

.card-value.neutral {
  color: #fdcb6e;
}

.card-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}

.results-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.4);
  gap: 16px;
}

.results-placeholder svg {
  opacity: 0.3;
}

.results-placeholder p {
  margin: 0;
  font-size: 15px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .result-card {
    padding: 16px;
  }

  .card-value {
    font-size: 24px;
  }

  .dcf-results {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>
