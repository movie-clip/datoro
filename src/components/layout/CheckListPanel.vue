<template>
  <div class="checklist-panel">
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
        <tbody>
          <tr 
            v-for="(cell, index) in checkListCells" 
            :key="index"
            :class="{ 'is-match': cell.passed }"
          >
            <td
              class="metric-name"
              :class="`status-${cell.colorStatus}`"
            >
              {{ cell.label }}
            </td>
            <td
              class="metric-value"
              :class="`status-${cell.colorStatus}`"
            >
              <div class="value-container">
                <span class="value-text">{{ cell.displayValue }}</span>
                <div 
                  v-if="cell.sparkline && cell.sparkline.length > 0" 
                  class="sparkline"
                >
                  <div
                    v-for="(value, idx) in getSparklineBars(cell.sparkline)"
                    :key="idx"
                    class="bar"
                    :class="`bar-${cell.colorStatus}`"
                    :style="{ height: value + '%' }"
                  />
                </div>
              </div>
            </td>
            <td class="metric-threshold">
              {{ cell.thresholdLabel }}
            </td>
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
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { formatPercent } from '../../utils/formatters'
import { getRevenueSeriesFromBatch, getNetIncomeSeriesFromBatch, getEpsSeriesFromBatch } from '../../services/financials/batchChartService'
import { getGrowthRates } from '../../services/financials/growthService'
import { getCashFlowFactsFromBatch } from '../../services/financials/batchTableService'
import { trackCheckListView } from '../../services/analytics/gaService'

const props = defineProps<{
  companyName?: string
}>()

const tickerStore = useTickerStore()
const { 
  loading, 
  ratios, 
  incomeStatements, 
  balanceSheets, 
  batchData
} = storeToRefs(tickerStore)

// Helper to get latest annual data
const latestRatio = computed(() => ratios.value?.[0])
const latestIncome = computed(() => incomeStatements.value?.annual?.[0])
const latestBalance = computed(() => balanceSheets.value?.annual?.[0])

const hasData = computed(() => {
  return !!latestRatio.value && !!latestIncome.value && !!latestBalance.value
})

// Helper function to calculate 5-year growth rate from series data
// Returns decimal value (e.g., 0.153 for 15.3% growth) or null if insufficient data
const calculateFiveYearGrowth = (series: Array<[number, number, ...any[]]>): number | null => {
  if (!series || series.length === 0) return null
  
  // Convert SeriesPoint [timestamp, value, period, fiscalYear] to [timestamp, value]
  const simpleSeries = series.map(([timestamp, value]) => [timestamp, value] as [number, number])
  const growth = getGrowthRates(simpleSeries)
  
  // Convert from percentage to decimal (growth returns 15.3, we need 0.153)
  return growth.fiveYear !== null ? growth.fiveYear / 100 : null
}

// Metric Calculations - Reuse chart data and growth service
const revenueGrowth = computed(() => {
  const revenueSeries = getRevenueSeriesFromBatch(batchData.value || null, 'annual')
  return calculateFiveYearGrowth(revenueSeries)
})

const netIncomeGrowth = computed(() => {
  const netIncomeSeries = getNetIncomeSeriesFromBatch(batchData.value || null, 'annual')
  return calculateFiveYearGrowth(netIncomeSeries)
})

const epsGrowth = computed(() => {
  const epsSeries = getEpsSeriesFromBatch(batchData.value || null, 'annual')
  return calculateFiveYearGrowth(epsSeries)
})

const fcfYield = computed(() => {
  // Get FCF Yield from calculated cash flow facts (same as health indicators)
  const cashFlow = getCashFlowFactsFromBatch(batchData.value || null)
  // fcfYield is a formatted string like "-87.7%" or "5.2%"
  // Parse it to get the decimal value for threshold check
  const parsed = parseFloat(cashFlow.fcfYield)
  return !isNaN(parsed) ? parsed / 100 : null // Convert -87.7 to -0.877
})

const grossMargin = computed(() => {
  // Get current gross margin - grossProfitMargin from ratios is in decimal (0.82)
  // grossProfitRatio from income might be in percentage (82) or decimal - use ratios for consistency
  return latestRatio.value?.grossProfitMargin || null
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

// Get sparkline data for metrics (last 5 years)
const getSparklineData = (id: string): number[] => {
  try {
    const annual = incomeStatements.value?.annual
    if (!annual || annual.length < 2) return []
    
    const ratiosData = ratios.value || []
    const last5Years = annual.slice(0, Math.min(5, annual.length)).reverse() // Oldest to newest, max 5
    
    let data: number[] = []
    
    switch (id) {
      case 'rev_growth':
        data = last5Years.map(stmt => stmt.revenue || 0)
        break
      case 'ni_growth':
        data = last5Years.map(stmt => stmt.netIncome || 0)
        break
      case 'eps_growth':
        data = last5Years.map(stmt => stmt.eps || 0)
        break
      case 'gross_margin':
        data = ratiosData.slice(0, Math.min(5, ratiosData.length)).reverse().map(r => (r.grossProfitMargin || 0) * 100)
        break
      case 'shares':
        data = last5Years.map(stmt => stmt.weightedAverageShsOut || 0)
        break
      default:
        return []
    }
    
    // Filter out invalid data points
    return data.filter(val => typeof val === 'number' && isFinite(val))
  } catch (error) {
    // Silently fail - return empty array if data extraction fails
    return []
  }
}

// Helper function to determine color status based on value proximity to target
// Returns 'green' (passed), 'yellow' (within 20% of target), or 'red' (failed)
const getColorStatus = (value: number | null, threshold: number, checkFn: (v: number) => boolean): 'green' | 'yellow' | 'red' => {
  if (value === null) return 'red'
  
  // Check if it passes the threshold
  if (checkFn(value)) return 'green'
  
  // Calculate 20% tolerance from threshold
  const tolerance = Math.abs(threshold * 0.20)
  const lowerBound = threshold - tolerance
  
  // Check if value is within 20% of target (yellow zone)
  // For positive thresholds (e.g., FCF Yield > 2.5%), check if value >= lowerBound
  // For negative thresholds (e.g., Shares < 0%), check if value <= upperBound
  if (threshold > 0) {
    return value >= lowerBound ? 'yellow' : 'red'
  } else if (threshold < 0) {
    const upperBound = threshold + tolerance
    return value <= upperBound ? 'yellow' : 'red'
  } else {
    // For threshold = 0, check if value is within ±20% tolerance
    return Math.abs(value) <= 0.20 ? 'yellow' : 'red'
  }
}

// Check List Cells Configuration
const checkListCells = computed(() => {
  const cells = [
    {
      id: 'rev_growth',
      label: 'Revenue Growth (5Y)',
      value: revenueGrowth.value,
      displayValue: formatPercent(revenueGrowth.value),
      sparkline: getSparklineData('rev_growth'),
      threshold: 0.20,
      thresholdLabel: '> 20%',
      check: (v: number) => v > 0.20
    },
    {
      id: 'ni_growth',
      label: 'Net Income Growth (5Y)',
      value: netIncomeGrowth.value,
      displayValue: formatPercent(netIncomeGrowth.value),
      sparkline: getSparklineData('ni_growth'),
      threshold: 0.20,
      thresholdLabel: '> 20%',
      check: (v: number) => v > 0.20
    },
    {
      id: 'fcf_yield',
      label: 'FCF Yield',
      value: fcfYield.value,
      displayValue: formatPercent(fcfYield.value),
      sparkline: [],
      threshold: 0.025,
      thresholdLabel: '> 2.5%',
      check: (v: number) => v > 0.025
    },
    {
      id: 'eps_growth',
      label: 'EPS Growth (5Y)',
      value: epsGrowth.value,
      displayValue: formatPercent(epsGrowth.value),
      sparkline: getSparklineData('eps_growth'),
      threshold: 0.20,
      thresholdLabel: '> 20%',
      check: (v: number) => v > 0.20
    },
    {
      id: 'gross_margin',
      label: 'Gross Margin',
      value: grossMargin.value,
      displayValue: formatPercent(grossMargin.value),
      sparkline: getSparklineData('gross_margin'),
      threshold: 0.50,
      thresholdLabel: '> 50%',
      check: (v: number) => v > 0.50
    },
    {
      id: 'shares',
      label: 'Shares Outstanding (5Y)',
      value: sharesOutstandingChange.value,
      displayValue: formatPercent(sharesOutstandingChange.value),
      sparkline: getSparklineData('shares'),
      threshold: -0.05,
      thresholdLabel: '< -5%',
      check: (v: number) => v <= -0.05 // Shares should decrease by at least 5% (buybacks)
    },
    {
      id: 'altman_z',
      label: 'Altman Z-Score',
      value: altmanZScore.value,
      displayValue: altmanZScore.value !== null ? altmanZScore.value.toFixed(2) : 'N/A',
      sparkline: [],
      threshold: 2.99,
      thresholdLabel: '> 2.99',
      check: (v: number) => v > 2.99
    }
  ]

  return cells.map(cell => {
    let colorStatus: 'green' | 'yellow' | 'red'
    
    // Special color logic for shares outstanding
    if (cell.id === 'shares' && cell.value !== null) {
      if (cell.value > 0) {
        colorStatus = 'red' // Shares increasing - bad
      } else if (cell.value > -0.05) {
        colorStatus = 'yellow' // Between 0% and -5% - slight decrease
      } else {
        colorStatus = 'green' // -5% or less - significant buybacks
      }
    } else {
      colorStatus = getColorStatus(cell.value, cell.threshold, cell.check)
    }
    
    return {
      ...cell,
      passed: cell.value != null && cell.check(cell.value),
      colorStatus
    }
  })
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

// Sparkline visualization constants
const SPARKLINE_MIN_HEIGHT = 20  // Minimum bar height percentage
const SPARKLINE_MAX_HEIGHT = 100 // Maximum bar height percentage
const SPARKLINE_RANGE = 80       // Range between min and max (100 - 20)

// Generate bar heights for sparkline (normalized to 20-100% for better visual distinction)
const getSparklineBars = (data: number[]): number[] => {
  if (!data || data.length === 0) return []
  
  try {
    const validData = data.filter(val => typeof val === 'number' && isFinite(val))
    if (validData.length === 0) return []
    
    const min = Math.min(...validData)
    const max = Math.max(...validData)
    const range = max - min || 1
    
    return validData.map(value => {
      // Scale to SPARKLINE_MIN_HEIGHT-SPARKLINE_MAX_HEIGHT range for better visual differentiation
      const normalized = ((value - min) / range) * SPARKLINE_RANGE + SPARKLINE_MIN_HEIGHT
      return Math.max(SPARKLINE_MIN_HEIGHT, Math.min(SPARKLINE_MAX_HEIGHT, normalized))
    })
  } catch (error) {
    // Silently fail - return empty array if normalization fails
    return []
  }
}

const summaryClass = computed(() => {
  if (score.value >= 6) return 'summary-excellent'
  if (score.value >= 5) return 'summary-good'
  if (score.value >= 3) return 'summary-mixed'
  return 'summary-poor'
})

// Track Check List view when data loads
watch(() => checkListCells.value, (cells) => {
  if (cells.length > 0 && !loading.value && hasData.value) {
    const ticker = tickerStore.currentTicker
    if (ticker) {
      trackCheckListView(ticker)
    }
  }
}, { immediate: true })

</script>

<style scoped>
.checklist-panel {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 24px;
  transition: all 0.3s ease;
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
  transition: opacity 0.2s ease;
}

.checklist-table tbody tr:last-child {
  border-bottom: none;
}

.checklist-table tbody tr:hover {
  opacity: 0.9;
}

.checklist-table td {
  padding: 20px;
  background: transparent;
}

.metric-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.metric-name.status-green {
  color: #10b981;
}

.metric-name.status-yellow {
  color: #f59e0b;
}

.metric-name.status-red {
  color: #ef4444;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
}

.metric-value.status-green {
  color: #10b981;
}

.metric-value.status-yellow {
  color: #f59e0b;
}

.metric-value.status-red {
  color: #ef4444;
}

.value-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.value-text {
  min-width: 80px;
  flex-shrink: 0;
}

.sparkline {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 36px;
  flex-shrink: 0;
}

.sparkline .bar {
  flex: 1;
  min-width: 12px;
  border-radius: 2px 2px 0 0;
  transition: all 0.2s ease;
}

.sparkline .bar.bar-green {
  background: #10b981;
  opacity: 0.8;
}

.sparkline .bar.bar-yellow {
  background: #f59e0b;
  opacity: 0.8;
}

.sparkline .bar.bar-red {
  background: #ef4444;
  opacity: 0.8;
}

.sparkline .bar:hover {
  opacity: 1;
  filter: brightness(1.1);
}

.metric-threshold {
  font-size: 13px;
  color: #9CA3AF;
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
