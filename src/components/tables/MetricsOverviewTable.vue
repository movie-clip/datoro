<template>
  <div class="metrics-overview-container">
    <BaseTable
      title="Key Metrics"
      :rows="metricsRows"
      :loading="loading"
      :error="error"
      :clickable="true"
      @row-click="handleRowClick"
    />
    
    <!-- Modal for showing chart -->
    <ChartModal
      :is-open="showChartModal"
      @close="closeChartModal"
    >
      <component
        v-if="selectedMetric"
        :is="selectedMetric.component"
        :key="selectedMetric.key"
      />
    </ChartModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore, type BatchData } from '../../stores/tickerStore'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'
import type { Component } from 'vue'
import { formatNumber } from '@/utils/formatters'

// Import all chart components
import RevenueChart from '../charts/RevenueByCategoryChart.vue'
import NetIncomeChart from '../charts/NetIncomeChart.vue'
import EpsChart from '../charts/EpsChart.vue'
import FcfChart from '../charts/FcfChart.vue'
import EbitdaChart from '../charts/EbitdaChart.vue'
import ExpensesChart from '../charts/ExpensesChart.vue'
import SharesChart from '../charts/SharesChart.vue'
import DividendYieldChart from '../charts/DividendYieldChart.vue'
import CapitalReturnedChart from '../charts/CapitalReturnedChart.vue'
import CashDebtChart from '../charts/CashDebtChart.vue'
import PriceChart from '../charts/PriceChart.vue'
import InsiderTradingChart from '../charts/InsiderTradingChart.vue'

const tickerStore = useTickerStore()
const { batchData, loading: storeLoading } = storeToRefs(tickerStore)

interface SelectedMetric {
  key: string
  component: Component
}

const showChartModal = ref(false)
const selectedMetric = ref<SelectedMetric | null>(null)

const loading = computed(() => storeLoading.value && !batchData.value)
const error = computed(() => null)

interface MetricDefinition {
  key: string
  label: string
  component: Component
  getValue: (data: BatchData | null) => number | null
}

// Define all available metrics with their chart components
const metricsDefinitions: MetricDefinition[] = [
  { 
    key: 'revenue', 
    label: 'Revenue', 
    component: RevenueChart,
    getValue: (_data) => {
      const income = data?.data?.incomeAnnual?.[0]
      return income?.revenue || null
    }
  },
  { 
    key: 'netIncome', 
    label: 'Net Income', 
    component: NetIncomeChart,
    getValue: (_data) => {
      const income = data?.data?.incomeAnnual?.[0]
      return income?.netIncome || null
    }
  },
  { 
    key: 'eps', 
    label: 'EPS', 
    component: EpsChart,
    getValue: (_data) => {
      const income = data?.data?.incomeAnnual?.[0]
      return income?.eps || null
    }
  },
  { 
    key: 'fcf', 
    label: 'Free Cash Flow', 
    component: FcfChart,
    getValue: (_data) => {
      const cashflow = data?.data?.cashflowAnnual?.[0]
      return cashflow?.freeCashFlow || null
    }
  },
  { 
    key: 'ebitda', 
    label: 'EBITDA', 
    component: EbitdaChart,
    getValue: (_data) => {
      const income = data?.data?.incomeAnnual?.[0]
      return income?.ebitda || null
    }
  },
  { 
    key: 'expenses', 
    label: 'Operating Expenses', 
    component: ExpensesChart,
    getValue: (_data) => {
      const income = data?.data?.incomeAnnual?.[0]
      return income?.operatingExpenses || null
    }
  },
  { 
    key: 'shares', 
    label: 'Shares Outstanding', 
    component: SharesChart,
    getValue: (_data) => {
      const income = data?.data?.incomeAnnual?.[0]
      return income?.weightedAverageShsOutDil || null
    }
  },
  { 
    key: 'dividend', 
    label: 'Dividend Yield', 
    component: DividendYieldChart,
    getValue: (_data) => {
      const ratios = data?.data?.ratiosAnnual?.[0]
      return ratios?.dividendYield ? (ratios.dividendYield * 100) : null
    }
  },
  { 
    key: 'capitalReturned', 
    label: 'Capital Returned', 
    component: CapitalReturnedChart,
    getValue: (_data) => {
      const cashflow = data?.data?.cashflowAnnual?.[0]
      const dividends = cashflow?.dividendsPaid || 0
      const buybacks = cashflow?.commonStockRepurchased || 0
      return Math.abs(dividends) + Math.abs(buybacks)
    }
  },
  { 
    key: 'cash', 
    label: 'Cash & Debt', 
    component: CashDebtChart,
    getValue: (_data) => {
      const balance = data?.data?.balanceAnnual?.[0]
      return balance?.cashAndCashEquivalents || null
    }
  },
  { 
    key: 'price', 
    label: 'Stock Price', 
    component: PriceChart,
    getValue: (_data) => {
      const quote = data?.data?.quote?.[0]
      return quote?.price || null
    }
  },
  { 
    key: 'insider', 
    label: 'Insider Trading', 
    component: InsiderTradingChart,
    getValue: () => null // No single value for this
  },
]

// Format value for display
const formatValue = (value: number | null): string => {
  return formatNumber(value, { currency: true, decimals: 2 })
}

interface MetricRow {
  metricKey: string
  label: string
  value: string
  component: Component
  rawValue: number | null
}

// Build table rows from metrics
const metricsRows = computed(() => {
  if (!batchData.value) return []
  
  return metricsDefinitions.map(metric => ({
    metricKey: metric.key,
    label: metric.label,
    value: formatValue(metric.getValue(batchData.value)),
    component: metric.component,
    // Store raw data for potential use
    rawValue: metric.getValue(batchData.value)
  } as MetricRow))
})

const handleRowClick = (row: any): void => {
  selectedMetric.value = {
    key: row.metricKey,
    component: row.component
  }
  showChartModal.value = true
}

const closeChartModal = (): void => {
  showChartModal.value = false
  selectedMetric.value = null
}
</script>

<style scoped>
.metrics-overview-container {
  width: 100%;
}
</style>
