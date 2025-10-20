<template>
  <BaseTable
    title="Valuation"
    :rows="rows"
    :loading="loading"
    :error="error"
    :on-retry="retry"
    audio-name="Valuation"
    aria-label="Valuation metrics"
    :clickable="true"
    @row-click="handleRowClick"
  />
  
  <ChartModal :is-open="showChartModal" @close="showChartModal = false">
    <component v-if="selectedMetric" :is="selectedMetric.component" />
  </ChartModal>
</template>

<script setup>
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getValuationFromBatch } from '../../services/financials/batchTableService.js'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'

// Import chart components
import PriceChart from '../charts/PriceChart.vue'
import RevenueChart from '../charts/RevenueChart.vue'
import EbitdaChart from '../charts/EbitdaChart.vue'
import InsiderTradingChart from '../charts/InsiderTradingChart.vue'

// Use Pinia store instead of prop
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)
const { refresh: retry } = tickerStore

// Get current ticker
const currentTicker = computed(() => tickerStore.currentTicker)

// Process batch data into valuation metrics
const data = computed(() => getValuationFromBatch(batchData.value))

// Modal state
const showChartModal = ref(false)
const selectedMetric = shallowRef(null)

// Metric to chart component mapping
const metricChartMap = {
  'Market Cap': PriceChart,
  'P/E Ratio': PriceChart,
  'Price to Sales': RevenueChart,
  'Price to Book': PriceChart,
  'EV To EBITDA': EbitdaChart,
  'Insider Trading': InsiderTradingChart,
}

// Handle row click
const handleRowClick = (row) => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Get insider trading summary
const getInsiderTradingSummary = (batchData) => {
  if (!batchData?.data?.insiderTrades) return 'N/A'
  
  const trades = batchData.data.insiderTrades
  if (!Array.isArray(trades) || trades.length === 0) return 'No recent trades'
  
  // Get last 3 months of trades
  const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000)
  const recentTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.transactionDate).getTime()
    return tradeDate > threeMonthsAgo
  })
  
  if (recentTrades.length === 0) return 'No recent trades'
  
  const buys = recentTrades.filter(t => t.acquistionOrDisposition === 'A').length
  const sells = recentTrades.filter(t => t.acquistionOrDisposition === 'D').length
  
  return `${buys} buys, ${sells} sells (90d)`
}

const rows = computed(() => [
  { label: 'Market Cap', value: data.value.marketCap },
  { label: 'P/E Ratio', value: data.value.pe },
  { label: 'Price to Sales', value: data.value.ps },
  { label: 'Price to Book', value: data.value.pb },
  { label: 'EV To EBITDA', value: data.value.evEbitda },
  { label: 'Insider Trading', value: getInsiderTradingSummary(batchData.value) },
])
</script>
