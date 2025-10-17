<script setup>
import { ref, watch } from 'vue'
import { useTickerStore } from './stores/tickerStore'
import GlobalTickerBar from './components/GlobalTickerBar.vue'

import ValuationTable from './components/ValuationTable.vue'
import CashFlowTable from './components/CashFlowTable.vue'
import MarginsGrowthTable from './components/MarginsGrowthTable.vue'
import BalanceTable from './components/BalanceTable.vue'

import PriceChart from './components/PriceChart.vue'
import RevenueChart from './components/RevenueChart.vue'
import NetIncomeChart from './components/NetIncomeChart.vue'
import FcfChart from './components/FcfChart.vue'
import EpsChart from './components/EpsChart.vue'
import EbitdaChart from './components/EbitdaChart.vue'
import CapitalReturnedChart from './components/CapitalReturnedChart.vue'
import CashDebtChart from './components/CashDebtChart.vue'
import SharesChart from './components/SharesChart.vue'
import InsiderTradingChart from './components/InsiderTradingChart.vue'
import DividendYieldChart from './components/DividendYieldChart.vue'
import ExpensesChart from './components/ExpensesChart.vue'
import AIAnalysisPanel from './components/AIAnalysisPanel.vue'

// Use Pinia store for centralized state
const tickerStore = useTickerStore()

const inputTicker = ref('AAPL')
const companyName = ref('Apple Inc.')

// Watch ticker changes and update store
watch(() => inputTicker.value, (newTicker) => {
  if (newTicker && newTicker.trim()) {
    tickerStore.setTicker(newTicker.trim().toUpperCase())
  }
}, { immediate: true })

function applyTicker(){ 
  const t=(inputTicker.value||'').trim().toUpperCase()
  if(t) {
    tickerStore.setTicker(t)
    // Reset company name when ticker changes - it will be updated by CompanyHeader
    companyName.value = ''
  }
}

// Hide logo if image fails to load
function handleImageError(event) {
  event.target.style.display = 'none'
}
</script>

<template>
  <main class="page">
    <header class="app-header">
      <h1 class="brand-title">
        <!-- Replace /logo.svg with your icon path: /logo.png, /logo.jpg, etc. -->
        <img 
          src="/logo.png" 
          alt="Factorly Logo" 
          class="brand-logo"
          @error="handleImageError"
        >
        <span class="brand">Factorly</span>
      </h1>
    </header>

    <section
      class="panel"
      style="max-width: 900px; margin: 0 auto;"
    >
      <GlobalTickerBar 
        v-model="inputTicker"
        :confirmed-ticker="tickerStore.currentTicker"
        @submit="applyTicker" 
        @update:company-name="companyName = $event"
      />
    </section>

    <!-- Info cards: 4 tables in a row (no longer need ticker prop - use store) -->
    <section class="info-grid">
      <section class="panel">
        <ValuationTable />
      </section>
      <section class="panel">
        <CashFlowTable />
      </section>
      <section class="panel">
        <MarginsGrowthTable />
      </section>
      <section class="panel">
        <BalanceTable />
      </section>
    </section>

    <!-- Charts: 12 charts (no longer need ticker prop - use store) -->
    <section class="charts">
      <section class="panel">
        <PriceChart />
      </section>
      <section class="panel">
        <RevenueChart />
      </section>
      <section class="panel">
        <NetIncomeChart />
      </section>
      <section class="panel">
        <FcfChart />
      </section>
      <section class="panel">
        <EpsChart />
      </section>
      <section class="panel">
        <EbitdaChart />
      </section>
      <section class="panel">
        <ExpensesChart />
      </section>
      <section class="panel">
        <CashDebtChart />
      </section>
      <section class="panel">
        <SharesChart />
      </section>
      <section class="panel">
        <CapitalReturnedChart />
      </section>
      <section class="panel">
        <DividendYieldChart />
      </section>
      <section class="panel">
        <InsiderTradingChart />
      </section>
    </section>

    <!-- AI Analysis: 2 panels in a row -->
    <section class="ai-analysis-grid">
      <AIAnalysisPanel
        :company-name="companyName"
        type="advantages"
      />
      <AIAnalysisPanel
        :company-name="companyName"
        type="risks"
      />
    </section>
  </main>
</template>

<style>
/* Header */
.app-header {
  text-align: center;
  padding: 24px 0 16px;
}

.brand-title {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 2.5rem;
}

.brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

/* Branding */
.brand {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.ai-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 1200px;
  margin: 12px auto 24px;
}

@media (max-width: 768px) {
  .ai-analysis-grid {
    grid-template-columns: 1fr;
  }
}
</style>
