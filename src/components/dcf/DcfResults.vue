<template>
  <div class="dcf-results">
    <h3 class="section-title">Valuation Results</h3>
    
    <div v-if="intrinsicValue !== null || buffettValue?.intrinsicValue || fmpDcfValue?.intrinsicValue" class="results-grid">
      <!-- Custom DCF Intrinsic Value Card -->
      <div class="result-card" :title="getDcfTooltip()">
        <div class="card-label">DCF Model</div>
        <div v-if="intrinsicValue !== null" class="card-value" :class="getDcfValueClass(intrinsicValue)">
          ${{ formatNumber(intrinsicValue) }}
          <span v-if="upside !== null" class="upside-inline" :class="getUpsideClass(upside)">
            ({{ upside > 0 ? '+' : '' }}{{ upside.toFixed(1) }}%)
          </span>
        </div>
        <div v-else class="card-value text-muted">N/A</div>
        <div class="card-hint">Custom cash flow model</div>
      </div>

      <!-- Buffett's Formula Card -->
      <div class="result-card" :title="getBuffettTooltip()">
        <div class="card-label">Buffett Formula</div>
        <div v-if="buffettValue?.intrinsicValue" class="card-value" :class="getDcfValueClass(buffettValue.intrinsicValue)">
          ${{ formatNumber(buffettValue.intrinsicValue) }}
          <span v-if="buffettValue?.upside" class="upside-inline" :class="getUpsideClass(buffettValue.upside)">
            ({{ buffettValue.upside > 0 ? '+' : '' }}{{ buffettValue.upside.toFixed(1) }}%)
          </span>
        </div>
        <div v-else class="card-value text-muted">N/A</div>
        <div class="card-hint">EPS growth model</div>
      </div>

      <!-- FMP DCF Card -->
      <div class="result-card" :title="getFmpTooltip()">
        <div class="card-label">
          FMP Fair Value
          <span v-if="fmpDcfLoading" class="loading-indicator">⋯</span>
        </div>
        <div v-if="fmpDcfValue?.intrinsicValue" class="card-value" :class="getDcfValueClass(fmpDcfValue.intrinsicValue)">
          ${{ formatNumber(fmpDcfValue.intrinsicValue) }}
          <span v-if="fmpDcfValue?.upside" class="upside-inline" :class="getUpsideClass(fmpDcfValue.upside)">
            ({{ fmpDcfValue.upside > 0 ? '+' : '' }}{{ fmpDcfValue.upside.toFixed(1) }}%)
          </span>
        </div>
        <div v-else-if="fmpDcfLoading" class="card-value text-muted">Loading...</div>
        <div v-else-if="fmpDcfError" class="card-value text-error">Error</div>
        <div v-else class="card-value text-muted">N/A</div>
        <div class="card-hint">FMP proprietary DCF</div>
      </div>

      <!-- Current Price Card -->
      <div class="result-card" :title="getCurrentPriceTooltip()">
        <div class="card-label">Current Price</div>
        <div class="card-value">${{ formatNumber(currentPrice) }}</div>
        <div class="card-hint">Market price</div>
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
  },
  buffettValue: {
    type: Object,
    default: null
  },
  fmpDcfValue: {
    type: Object,
    default: null
  },
  fmpDcfLoading: {
    type: Boolean,
    default: false
  },
  fmpDcfError: {
    type: String,
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

const getUpsideClass = (upsideValue) => {
  if (upsideValue === null || upsideValue === undefined) return ''
  if (upsideValue > 0) return 'positive'
  if (upsideValue < 0) return 'negative'
  return 'neutral'
}

const upsideClass = computed(() => {
  return getUpsideClass(props.upside)
})

// Function to determine value class based on comparison to current price
const getDcfValueClass = (value) => {
  if (value === null || props.currentPrice === null) return ''
  
  const priceDiff = ((value - props.currentPrice) / props.currentPrice) * 100
  
  // Within ±5% range - neutral/yellow
  if (priceDiff >= -5 && priceDiff <= 5) return 'neutral'
  
  // Intrinsic value higher than current price - positive/green
  if (priceDiff > 5) return 'positive'
  
  // Intrinsic value lower than current price - negative/red
  return 'negative'
}

// Tooltip generators
const getDcfTooltip = () => {
  if (props.intrinsicValue === null) return 'No DCF valuation available'
  const diff = props.intrinsicValue - props.currentPrice
  const pct = props.upside !== null ? props.upside.toFixed(1) : 'N/A'
  return `DCF Intrinsic Value: $${formatNumber(props.intrinsicValue)}\nCurrent Price: $${formatNumber(props.currentPrice)}\nDifference: $${diff.toFixed(2)} (${pct}%)\n\nBased on discounted cash flow projections with your custom assumptions.`
}

const getBuffettTooltip = () => {
  if (!props.buffettValue?.intrinsicValue) return 'No Buffett valuation available'
  const diff = props.buffettValue.intrinsicValue - props.currentPrice
  const pct = props.buffettValue.upside !== null ? props.buffettValue.upside.toFixed(1) : 'N/A'
  const years = props.buffettValue.years || 10
  const growth = props.buffettValue.growthRate || 15
  const pe = props.buffettValue.fairPE || 15
  return `Buffett Formula: $${formatNumber(props.buffettValue.intrinsicValue)}\nCurrent Price: $${formatNumber(props.currentPrice)}\nDifference: $${diff.toFixed(2)} (${pct}%)\n\nAssumptions:\n• ${growth}% annual earnings growth\n• Fair P/E ratio: ${pe}\n• ${years}-year timeframe`
}

const getFmpTooltip = () => {
  if (!props.fmpDcfValue?.intrinsicValue) {
    if (props.fmpDcfLoading) return 'Loading FMP DCF valuation...'
    if (props.fmpDcfError) return `Error: ${props.fmpDcfError}`
    return 'No FMP DCF data available'
  }
  const diff = props.fmpDcfValue.intrinsicValue - props.currentPrice
  const pct = props.fmpDcfValue.upside !== null ? props.fmpDcfValue.upside.toFixed(1) : 'N/A'
  const date = props.fmpDcfValue.date ? `\nCalculated: ${new Date(props.fmpDcfValue.date).toLocaleDateString()}` : ''
  return `FMP Fair Value: $${formatNumber(props.fmpDcfValue.intrinsicValue)}\nCurrent Price: $${formatNumber(props.currentPrice)}\nDifference: $${diff.toFixed(2)} (${pct}%)${date}\n\nProfessional DCF calculation by Financial Modeling Prep using their proprietary models and assumptions.`
}

const getCurrentPriceTooltip = () => {
  return `Current Market Price: $${formatNumber(props.currentPrice)}\n\nThis is the latest stock price from the market.`
}
</script>

<style scoped>
.dcf-results {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(0, 89, 76, 0.1);
  display: flex;
  flex-direction: column;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
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
  cursor: help;
}

.result-card:hover {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
  line-height: 1.2;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
}

.upside-inline {
  font-size: 16px;
  font-weight: 600;
  margin-top: 4px;
}

.upside-inline.positive {
  color: #00b894;
}

.upside-inline.negative {
  color: #ff7675;
}

.upside-inline.neutral {
  color: #fdcb6e;
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

.card-value.text-muted {
  color: rgba(255, 255, 255, 0.3);
  font-size: 20px;
}

.card-value.text-error {
  color: #ff7675;
  font-size: 18px;
}

.loading-indicator {
  display: inline-block;
  margin-left: 6px;
  animation: pulse 1.5s ease-in-out infinite;
  color: rgba(255, 255, 255, 0.4);
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
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
