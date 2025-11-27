<template>
  <div class="bingo-panel">
    <div class="bingo-header">
      <h2>Financial Health Bingo</h2>
      <p class="subtitle">Check if {{ companyName }} passes the fundamental tests</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing fundamentals...</p>
    </div>

    <div v-else-if="!hasData" class="empty-state">
      <p>Insufficient data for Bingo analysis</p>
    </div>

    <div v-else class="bingo-content">
      <div class="bingo-grid">
        <div 
          v-for="(cell, index) in bingoCells" 
          :key="index"
          class="bingo-cell"
          :class="{ 'is-match': cell.passed }"
        >
          <div class="cell-content">
            <div class="cell-header">
              <span class="metric-name">{{ cell.label }}</span>
              <span class="status-icon">{{ cell.passed ? '✓' : '✗' }}</span>
            </div>
            <div class="metric-value">{{ cell.displayValue }}</div>
            <div class="metric-threshold">Target: {{ cell.thresholdLabel }}</div>
          </div>
        </div>
      </div>

      <div class="bingo-summary" :class="summaryClass">
        <h3>{{ summaryTitle }}</h3>
        <p>{{ summaryMessage }}</p>
        <div class="score">Score: {{ score }}/9</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { formatPercent, formatNumber } from '../../utils/formatters'

const props = defineProps<{
  companyName?: string
}>()

const tickerStore = useTickerStore()
const { 
  loading, 
  ratios, 
  keyMetrics, 
  incomeStatements, 
  balanceSheets, 
  cashFlowStatements,
  profile
} = storeToRefs(tickerStore)

// Helper to get latest annual data
const latestRatio = computed(() => ratios.value?.[0])
const latestMetric = computed(() => keyMetrics.value?.[0])
const latestIncome = computed(() => incomeStatements.value?.annual?.[0])
const prevIncome = computed(() => incomeStatements.value?.annual?.[1])
const latestBalance = computed(() => balanceSheets.value?.annual?.[0])
const latestCashFlow = computed(() => cashFlowStatements.value?.annual?.[0])
const prevCashFlow = computed(() => cashFlowStatements.value?.annual?.[1])

const hasData = computed(() => {
  return !!latestRatio.value && !!latestIncome.value && !!latestBalance.value
})

// Metric Calculations
const revenueGrowth = computed(() => {
  if (!latestIncome.value || !prevIncome.value) return null
  return (latestIncome.value.revenue - prevIncome.value.revenue) / prevIncome.value.revenue
})

const netIncomeGrowth = computed(() => {
  if (!latestIncome.value || !prevIncome.value) return null
  // Handle negative base case? For simplicity, just standard growth formula
  return (latestIncome.value.netIncome - prevIncome.value.netIncome) / Math.abs(prevIncome.value.netIncome)
})

const grossMargin = computed(() => latestIncome.value?.grossProfitRatio || latestRatio.value?.grossProfitMargin)
const roe = computed(() => latestRatio.value?.returnOnEquity)
const roic = computed(() => latestRatio.value?.returnOnInvestedCapital)
const currentRatio = computed(() => latestRatio.value?.currentRatio)
const debtToEquity = computed(() => latestRatio.value?.debtEquityRatio)
const freeCashFlow = computed(() => latestCashFlow.value?.freeCashFlow)
const sharesOutstandingChange = computed(() => {
  if (!latestIncome.value || !prevIncome.value) return null
  // Negative change means buybacks (good)
  return (latestIncome.value.weightedAverageShsOut - prevIncome.value.weightedAverageShsOut) / prevIncome.value.weightedAverageShsOut
})

// Bingo Cells Configuration
const bingoCells = computed(() => {
  const cells = [
    {
      id: 'rev_growth',
      label: 'Revenue Growth',
      value: revenueGrowth.value,
      displayValue: formatPercent(revenueGrowth.value),
      threshold: 0.10,
      thresholdLabel: '> 10%',
      check: (v: number) => v > 0.10
    },
    {
      id: 'ni_growth',
      label: 'Net Income Growth',
      value: netIncomeGrowth.value,
      displayValue: formatPercent(netIncomeGrowth.value),
      threshold: 0.10,
      thresholdLabel: '> 10%',
      check: (v: number) => v > 0.10
    },
    {
      id: 'gross_margin',
      label: 'Gross Margin',
      value: grossMargin.value,
      displayValue: formatPercent(grossMargin.value),
      threshold: 0.30,
      thresholdLabel: '> 30%',
      check: (v: number) => v > 0.30
    },
    {
      id: 'roe',
      label: 'Return on Equity',
      value: roe.value,
      displayValue: formatPercent(roe.value),
      threshold: 0.15,
      thresholdLabel: '> 15%',
      check: (v: number) => v > 0.15
    },
    {
      id: 'roic',
      label: 'ROIC',
      value: roic.value,
      displayValue: formatPercent(roic.value),
      threshold: 0.10,
      thresholdLabel: '> 10%',
      check: (v: number) => v > 0.10
    },
    {
      id: 'fcf',
      label: 'Free Cash Flow',
      value: freeCashFlow.value,
      displayValue: formatNumber(freeCashFlow.value),
      threshold: 0,
      thresholdLabel: 'Positive',
      check: (v: number) => v > 0
    },
    {
      id: 'current_ratio',
      label: 'Current Ratio',
      value: currentRatio.value,
      displayValue: currentRatio.value?.toFixed(2),
      threshold: 1.5,
      thresholdLabel: '> 1.5',
      check: (v: number) => v > 1.5
    },
    {
      id: 'debt_equity',
      label: 'Debt / Equity',
      value: debtToEquity.value,
      displayValue: debtToEquity.value?.toFixed(2),
      threshold: 0.8,
      thresholdLabel: '< 0.8',
      check: (v: number) => v < 0.8
    },
    {
      id: 'shares',
      label: 'Share Buybacks',
      value: sharesOutstandingChange.value,
      displayValue: formatPercent(sharesOutstandingChange.value),
      threshold: 0,
      thresholdLabel: 'Decreasing',
      check: (v: number) => v < 0 // Negative growth means buybacks
    }
  ]

  return cells.map(cell => ({
    ...cell,
    passed: cell.value != null && cell.check(cell.value)
  }))
})

const score = computed(() => bingoCells.value.filter(c => c.passed).length)

const summaryTitle = computed(() => {
  if (score.value >= 8) return 'Excellent Candidate!'
  if (score.value >= 6) return 'Strong Fundamentals'
  if (score.value >= 4) return 'Mixed Results'
  return 'Needs Caution'
})

const summaryMessage = computed(() => {
  if (score.value >= 8) return 'This company passes almost all fundamental tests. Definitely worth researching deeply.'
  if (score.value >= 6) return 'Shows good potential with some strong metrics. Check the failed areas.'
  if (score.value >= 4) return 'Some good signs, but several red flags. Dig deeper into the weaknesses.'
  return 'Fails many fundamental tests. Proceed with significant caution.'
})

const summaryClass = computed(() => {
  if (score.value >= 8) return 'summary-excellent'
  if (score.value >= 6) return 'summary-good'
  if (score.value >= 4) return 'summary-mixed'
  return 'summary-poor'
})

</script>

<style scoped>
.bingo-panel {
  padding: 24px;
  background: #151518;
  border-radius: 12px;
  color: #E5E5E5;
  width: 100%; /* Full width */
  margin: 0 auto;
}

.bingo-header {
  text-align: center;
  margin-bottom: 32px;
}

.bingo-header h2 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); /* Blue gradient */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #9CA3AF;
  font-size: 16px;
}

.bingo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.bingo-cell {
  background: #1E1E22;
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 24px; /* Increased padding */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.bingo-cell.is-match {
  background: rgba(59, 130, 246, 0.1); /* Blue background tint */
  border-color: #3B82F6; /* Blue border */
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15); /* Blue glow */
}

.cell-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.metric-name {
  font-size: 15px;
  color: #9CA3AF;
  font-weight: 500;
}

.status-icon {
  font-size: 18px;
  font-weight: bold;
  color: #EF4444; /* Red X by default */
}

.bingo-cell.is-match .status-icon {
  color: #3B82F6; /* Blue Check */
}

.bingo-cell.is-match .metric-name {
  color: #E5E5E5;
}

.metric-value {
  font-size: 28px; /* Larger font */
  font-weight: 700;
  color: #E5E5E5;
  margin-bottom: 6px;
}

.metric-threshold {
  font-size: 13px;
  color: #6B7280;
}

.bingo-summary {
  text-align: center;
  padding: 24px;
  border-radius: 12px;
  background: #1E1E22;
  border: 1px solid #2A2A2E;
}

.bingo-summary h3 {
  font-size: 20px;
  margin: 0 0 8px 0;
}

.bingo-summary p {
  color: #9CA3AF;
  margin: 0 0 16px 0;
}

.score {
  font-size: 32px;
  font-weight: 800;
  color: #E5E5E5;
}

.summary-excellent {
  border-color: #3B82F6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
}

.summary-excellent h3, .summary-excellent .score {
  color: #3B82F6;
}

.summary-good {
  border-color: #60A5FA;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(96, 165, 250, 0.05) 100%);
}

.summary-good h3, .summary-good .score {
  color: #60A5FA;
}

.summary-mixed {
  border-color: #F59E0B;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
}

.summary-mixed h3, .summary-mixed .score {
  color: #F59E0B;
}

.summary-poor {
  border-color: #EF4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
}

.summary-poor h3, .summary-poor .score {
  color: #EF4444;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #9CA3AF;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: #3B82F6; /* Blue spinner */
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .bingo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .bingo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
