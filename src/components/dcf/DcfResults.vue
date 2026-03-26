<template>
  <div class="dcf-results">
    <h3 class="section-title">
      Valuation Results
    </h3>
    
    <div
      v-if="intrinsicValue !== null || advancedDcfValue?.intrinsicValue"
      class="results-grid"
    >
      <!-- Custom DCF Intrinsic Value Card -->
      <div 
        class="result-card active" 
        :data-tooltip="getDcfTooltip()"
      >
        <div class="card-label">
          PEG Model
        </div>
        <div
          v-if="intrinsicValue !== null"
          class="card-value"
          :class="getDcfValueClass(intrinsicValue)"
        >
          ${{ formatNumber(intrinsicValue) }}
          <span
            v-if="upside !== null"
            class="upside-inline"
            :class="getUpsideClass(upside)"
          >
            ({{ upside > 0 ? '+' : '' }}{{ upside.toFixed(1) }}%)
          </span>
        </div>
        <div
          v-else-if="pegError"
          class="card-value text-warning"
          title="Click for details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="display: inline-block; vertical-align: middle; margin-right: 4px;"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
          N/A
        </div>
        <div
          v-else
          class="card-value text-muted"
        >
          N/A
        </div>
        <div class="card-hint">
          Custom cash flow model
        </div>
      </div>

      <!-- Advanced DCF Card (not clickable) -->
      <div 
        class="result-card"
        :class="{ 'has-warning': advancedDcfValue?.warning }"
        :data-tooltip="getAdvancedDcfTooltip()"
      >
        <div class="card-label">
          Advanced DCF
          <svg
            v-if="advancedDcfValue?.warning"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="display: inline-block; vertical-align: middle; margin-left: 4px; color: #ff9800;"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
        </div>
        <div
          v-if="advancedDcfValue?.intrinsicValue !== null && advancedDcfValue?.intrinsicValue !== undefined"
          class="card-value"
          :class="getDcfValueClass(advancedDcfValue.intrinsicValue)"
        >
          ${{ formatNumber(advancedDcfValue.intrinsicValue) }}
          <span
            v-if="advancedDcfValue?.upside !== null && advancedDcfValue?.upside !== undefined"
            class="upside-inline"
            :class="getUpsideClass(advancedDcfValue.upside)"
          >
            ({{ advancedDcfValue.upside > 0 ? '+' : '' }}{{ advancedDcfValue.upside.toFixed(1) }}%)
          </span>
        </div>
        <div
          v-else-if="advancedDcfValue?.error"
          class="card-value text-warning"
          title="Click for details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="display: inline-block; vertical-align: middle; margin-right: 4px;"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
          N/A
        </div>
        <div
          v-else
          class="card-value text-muted"
        >
          —
        </div>
        <div class="card-hint">
          FMP 10-year model
        </div>
      </div>
    </div>

    <div
      v-else
      class="results-placeholder"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
        />
        <line
          x1="12"
          y1="16"
          x2="12"
          y2="12"
        />
        <line
          x1="12"
          y1="8"
          x2="12.01"
          y2="8"
        />
      </svg>
      <p>Adjust assumptions to see results</p>
    </div>
  </div>
</template>

<script setup lang="ts">

type ValuationModel = 'peg' | 'advancedDcf'

interface AdvancedDcfValue {
  intrinsicValue?: number | null
  upside?: number | null
  wacc?: number | null
  terminalGrowthRate?: number | null
  error?: string | null
  warning?: string | null
}

interface Props {
  intrinsicValue?: number | null
  currentPrice?: number | null
  upside?: number | null
  advancedDcfValue?: AdvancedDcfValue | null
  pegError?: string | null
  selectedModel?: ValuationModel
}

const props = withDefaults(defineProps<Props>(), {
  intrinsicValue: null,
  currentPrice: null,
  upside: null,
  advancedDcfValue: null,
  pegError: null,
  selectedModel: 'peg'
})

const emit = defineEmits<{
  selectModel: [model: ValuationModel]
}>()

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return 'N/A'
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

const getUpsideClass = (upsideValue: number | null | undefined): string => {
  if (upsideValue === null || upsideValue === undefined) return ''
  if (upsideValue > 0) return 'positive'
  if (upsideValue < 0) return 'negative'
  return 'neutral'
}

// Function to determine value class based on comparison to current price
const getDcfValueClass = (value: number | null | undefined): string => {
  if (value === null || value === undefined || props.currentPrice === null || props.currentPrice === undefined) return ''
  
  const priceDiff = ((value - props.currentPrice) / props.currentPrice) * 100
  
  // Within ±5% range - neutral/yellow
  if (priceDiff >= -5 && priceDiff <= 5) return 'neutral'
  
  // Intrinsic value higher than current price - positive/green
  if (priceDiff > 5) return 'positive'
  
  // Intrinsic value lower than current price - negative/red
  return 'negative'
}

// Tooltip generators
const getDcfTooltip = (): string => {
  // Show error message if available
  if (props.pegError) {
    return props.pegError
  }
  return `PEG Ratio-Based Valuation:
Future EPS = Current EPS × (1 + Growth Rate)^Years
Target Price = Future EPS × Target P/E`
}

const getAdvancedDcfTooltip = (): string => {
  // Show error message if available
  if (props.advancedDcfValue?.error) {
    return props.advancedDcfValue.error
  }
  // Show warning if negative valuation
  if (props.advancedDcfValue?.warning) {
    return props.advancedDcfValue.warning
  }
  if (!props.advancedDcfValue?.intrinsicValue && props.advancedDcfValue?.intrinsicValue !== 0) return 'No data available'
  const wacc = props.advancedDcfValue?.wacc || 'N/A'
  const terminalGrowth = props.advancedDcfValue?.terminalGrowthRate || 'N/A'
  return `Advanced DCF Model (FMP):
10-year projection with terminal value
WACC: ${wacc}%
Terminal Growth: ${terminalGrowth}%`
}

</script>

<style scoped>
/* ============================================
   CONTAINER
   ============================================ */
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

/* ============================================
   RESULTS GRID
   ============================================ */
.results-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  overflow: visible;
}

/* ============================================
   RESULT CARDS
   ============================================ */
.result-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%) !important;
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;
  cursor: default;
  position: relative;
  overflow: visible;
}

.result-card.clickable {
  cursor: pointer;
}

.result-card.clickable:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.3);
  transform: translateY(-2px);
  overflow: visible;
}

.result-card.active {
  border-color: rgba(56, 189, 248, 0.5);
  /* box-shadow: 0 0 20px #f59f0b3a; */
}

.result-card.has-warning {
  border-color: rgba(255, 152, 0, 0.3);
}

/* ============================================
   CARD CONTENT
   ============================================ */
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
  color: inherit;
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

.card-value.text-warning {
  color: #f39c12;
  font-size: 18px;
  cursor: help;
}

.card-value.text-error {
  color: #ff7675;
  font-size: 18px;
}

.card-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}

/* ============================================
   TOOLTIPS
   ============================================ */
/* Custom tooltip styling matching project design - positioned BELOW */
.result-card[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 16px;
  background: rgba(30, 30, 34, 0.98);
  color: #E5E5E5;
  font-size: 0.8rem;
  line-height: 1.6;
  border-radius: 6px;
  border: 1px solid rgba(0, 89, 76, 0.3);
  white-space: pre-line;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  animation: tooltipFadeInBelow 0.2s ease;
  max-width: 400px;
  min-width: 280px;
  font-weight: 400;
  text-align: left;
}

.result-card[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: rgba(30, 30, 34, 0.98);
  z-index: 1000;
  pointer-events: none;
  animation: tooltipFadeInBelow 0.2s ease;
}

@keyframes tooltipFadeInBelow {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ============================================
   PLACEHOLDER STATE
   ============================================ */
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

/* ============================================
   ANIMATIONS
   ============================================ */
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

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */
@media (max-width: 1200px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

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

@media (max-width: 640px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}

/* iPhone 12-16 Portrait (390px-430px) */
@media (max-width: 430px) {
  .dcf-results {
    padding: 12px;
  }

  .section-title {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .results-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .result-card {
    padding: 12px;
  }

  .card-label {
    font-size: 12px;
  }

  .card-value {
    font-size: 20px;
  }

  .card-description {
    font-size: 11px;
  }

  .model-selector {
    gap: 6px;
    margin-top: 12px;
  }

  .model-button {
    padding: 8px 12px;
    font-size: 12px;
    /* Ensure 44px touch target */
    min-height: 44px;
  }
}

/* iPhone 12-16 Landscape */
@media (max-height: 430px) and (orientation: landscape) {
  .dcf-results {
    padding: 8px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 10px;
  }

  .results-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .result-card {
    padding: 10px;
  }

  .card-value {
    font-size: 18px;
  }

  .model-button {
    min-height: 40px;
    padding: 6px 10px;
  }
}
</style>
