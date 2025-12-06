<template>
  <div class="checklist-panel">
    <div class="checklist-header">
      <h2>Financial Health Check List</h2>
    </div>

    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>Analyzing fundamentals...</p>
    </div>

    <div
      v-else-if="!hasData"
      class="empty-state"
    >
      <p>Insufficient data for Check List analysis</p>
    </div>

    <div
      v-else
      class="checklist-content"
    >
      <table class="checklist-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(cell, index) in checkListCells" 
            :key="index"
            :class="{ 'is-match': cell.passed }"
          >
            <td class="metric-name" :class="{ 'passed': cell.passed }">
              {{ cell.label }}
            </td>
            <td class="metric-value" :class="{ 'passed': cell.passed }">
              {{ cell.displayValue }}
            </td>
            <td class="metric-threshold">{{ cell.thresholdLabel }}</td>
          </tr>
        </tbody>
      </table>

      <div
        class="checklist-summary"
        :class="summaryClass"
      >
        <h3>{{ summaryTitle }}</h3>
        <p>{{ summaryMessage }}</p>
        <div class="score">
          Score: {{ score }}/7
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { formatPercent, formatNumber } from '../../utils/formatters'
import { getRevenueSeriesFromBatch, getNetIncomeSeriesFromBatch, getEpsSeriesFromBatch } from '../../services/financials/batchChartService'
import { getGrowthRates } from '../../services/financials/growthService'

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
  profile,
  batchData
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

// Metric Calculations - Reuse chart data and growth service
const revenueGrowth = computed(() => {
  const revenueSeries = getRevenueSeriesFromBatch(batchData.value || null, 'annual')
  // Convert SeriesPoint [timestamp, value, period, fiscalYear] to [timestamp, value]
  const simpleSeries = revenueSeries.map(([timestamp, value]) => [timestamp, value] as [number, number])
  const growth = getGrowthRates(simpleSeries)
  // Convert from percentage to decimal (growth returns 15.3, we need 0.153)
  return growth.fiveYear !== null ? growth.fiveYear / 100 : null
})

const netIncomeGrowth = computed(() => {
  const netIncomeSeries = getNetIncomeSeriesFromBatch(batchData.value || null, 'annual')
  const simpleSeries = netIncomeSeries.map(([timestamp, value]) => [timestamp, value] as [number, number])
  const growth = getGrowthRates(simpleSeries)
  return growth.fiveYear !== null ? growth.fiveYear / 100 : null
})

const epsGrowth = computed(() => {
  const epsSeries = getEpsSeriesFromBatch(batchData.value || null, 'annual')
  const simpleSeries = epsSeries.map(([timestamp, value]) => [timestamp, value] as [number, number])
  const growth = getGrowthRates(simpleSeries)
  return growth.fiveYear !== null ? growth.fiveYear / 100 : null
})

const fcfYield = computed(() => {
  // Get current FCF Yield from latest metrics
  return latestMetric.value?.freeCashFlowYield || null
})

const grossMargin = computed(() => {
  // Get current gross margin
  return latestIncome.value?.grossProfitRatio || latestRatio.value?.grossProfitMargin || null
})



const sharesOutstandingChange = computed(() => {
  // Calculate 5-year growth for shares outstanding (negative = buybacks)
  const annual = incomeStatements.value?.annual
  if (!annual || annual.length < 6) return null
  
  // Build time series for shares outstanding
  const sharesSeries = annual
    .filter(stmt => stmt.date && stmt.weightedAverageShsOut)
    .map(stmt => [Date.parse(stmt.date), stmt.weightedAverageShsOut] as [number, number])
  
  const growth = getGrowthRates(sharesSeries)
  return growth.fiveYear !== null ? growth.fiveYear / 100 : null
})

const altmanZScore = computed(() => {
  const scores = batchData.value?.data?.financialScores
  if (!scores || !Array.isArray(scores) || scores.length === 0) return null
  const score = scores[0]?.altmanZScore
  return typeof score === 'number' ? score : (typeof score === 'string' ? parseFloat(score) : null)
})

// Check List Cells Configuration
const checkListCells = computed(() => {
  const cells = [
    {
      id: 'rev_growth',
      label: 'Revenue Growth (5Y)',
      value: revenueGrowth.value,
      displayValue: formatPercent(revenueGrowth.value),
      threshold: 0.15,
      thresholdLabel: '> 15%',
      check: (v: number) => v > 0.15
    },
    {
      id: 'ni_growth',
      label: 'Net Income Growth (5Y)',
      value: netIncomeGrowth.value,
      displayValue: formatPercent(netIncomeGrowth.value),
      threshold: 0.15,
      thresholdLabel: '> 15%',
      check: (v: number) => v > 0.15
    },
    {
      id: 'fcf_yield',
      label: 'FCF Yield',
      value: fcfYield.value,
      displayValue: formatPercent(fcfYield.value),
      threshold: 0.025,
      thresholdLabel: '> 2.5%',
      check: (v: number) => v > 0.025
    },
    {
      id: 'eps_growth',
      label: 'EPS Growth (5Y)',
      value: epsGrowth.value,
      displayValue: formatPercent(epsGrowth.value),
      threshold: 0.15,
      thresholdLabel: '> 15%',
      check: (v: number) => v > 0.15
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
      id: 'shares',
      label: 'Share Buybacks (5Y)',
      value: sharesOutstandingChange.value,
      displayValue: formatPercent(sharesOutstandingChange.value),
      threshold: 0,
      thresholdLabel: 'Decreasing',
      check: (v: number) => v < 0 // Negative growth means buybacks
    },
    {
      id: 'altman_z',
      label: 'Altman Z-Score',
      value: altmanZScore.value,
      displayValue: altmanZScore.value?.toFixed(2),
      threshold: 2.99,
      thresholdLabel: '> 2.99',
      check: (v: number) => v > 2.99
    }
  ]

  return cells.map(cell => ({
    ...cell,
    passed: cell.value != null && cell.check(cell.value)
  }))
})

const score = computed(() => checkListCells.value.filter(c => c.passed).length)

const summaryTitle = computed(() => {
  if (score.value >= 6) return 'Excellent Candidate!'
  if (score.value >= 5) return 'Strong Fundamentals'
  if (score.value >= 3) return 'Mixed Results'
  return 'Needs Caution'
})

const summaryMessage = computed(() => {
  if (score.value >= 6) return 'This company passes almost all fundamental tests. Definitely worth researching deeply.'
  if (score.value >= 5) return 'Shows good potential with some strong metrics. Check the failed areas.'
  if (score.value >= 3) return 'Some good signs, but several red flags. Dig deeper into the weaknesses.'
  return 'Fails many fundamental tests. Proceed with significant caution.'
})

const summaryClass = computed(() => {
  if (score.value >= 6) return 'summary-excellent'
  if (score.value >= 5) return 'summary-good'
  if (score.value >= 3) return 'summary-mixed'
  return 'summary-poor'
})

</script>

<style scoped>
.checklist-panel {
  padding: 24px;
  background: #151518;
  border-radius: 12px;
  color: #E5E5E5;
  width: 100%;
  margin: 0 auto;
}

.checklist-header {
  text-align: center;
  margin-bottom: 32px;
}

.checklist-header h2 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); /* Blue gradient */
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #9CA3AF;
  font-size: 16px;
}

.checklist-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
  background: transparent;
  border-radius: 0;
}

.checklist-table thead {
  background: #2A2A2E;
}

.checklist-table th {
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #E5E5E5;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #3B82F6;
  background: #2A2A2E;
}

.checklist-table tbody tr {
  border-bottom: 1px solid #2A2A2E;
  transition: background-color 0.2s ease;
}

.checklist-table tbody tr:last-child {
  border-bottom: none;
}

.checklist-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.checklist-table td {
  padding: 20px;
  background: transparent;
}

.checklist-table tr.is-match {
  background: rgba(59, 130, 246, 0.08);
  border-bottom-color: rgba(59, 130, 246, 0.2);
}

.checklist-table tr.is-match:hover {
  background: rgba(59, 130, 246, 0.12);
}

.metric-name {
  font-size: 15px;
  color: #ef4444;
  font-weight: 500;
}

.metric-name.passed {
  color: #10b981;
  font-weight: 600;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #ef4444;
}

.metric-value.passed {
  color: #10b981;
}

.metric-threshold {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
}

.checklist-summary {
  text-align: center;
  padding: 24px;
  border-radius: 12px;
  background: #1E1E22;
  border: 1px solid #2A2A2E;
}

.checklist-summary h3 {
  font-size: 20px;
  margin: 0 0 8px 0;
}

.checklist-summary p {
  color: #9CA3AF;
  margin: 0 0 16px 0;
}

.score {
  font-size: 32px;
  font-weight: 800;
  color: #E5E5E5;
}

.summary-excellent {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
}

.summary-excellent h3, .summary-excellent .score {
  color: #10b981;
}

.summary-good {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
}

.summary-good h3, .summary-good .score {
  color: #3b82f6;
}

.summary-mixed {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
}

.summary-mixed h3, .summary-mixed .score {
  color: #f59e0b;
}

.summary-poor {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
}

.summary-poor h3, .summary-poor .score {
  color: #ef4444;
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
  .checklist-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .checklist-grid {
    grid-template-columns: 1fr;
  }
}
</style>
