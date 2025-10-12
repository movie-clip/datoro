<script setup>
import { ref } from 'vue'
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

const inputTicker = ref('AAPL')
const ticker = ref('AAPL')
const companyName = ref('Apple Inc.')

function applyTicker(){ 
  const t=(inputTicker.value||'').trim().toUpperCase()
  if(t) {
    ticker.value=t
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
          alt="Kazoku Logo" 
          class="brand-logo"
          @error="handleImageError"
        />
        <span class="brand">Kazoku</span>
      </h1>
    </header>

    <section class="panel" style="max-width: 900px; margin: 0 auto;">
      <GlobalTickerBar 
        v-model="inputTicker"
        :confirmedTicker="ticker"
        @submit="applyTicker" 
        @update:companyName="companyName = $event"
      />
    </section>

    <!-- Info cards: 4 tables in a row -->
    <section class="info-grid">
      <section class="panel"><ValuationTable :ticker="ticker" /></section>
      <section class="panel"><CashFlowTable :ticker="ticker" /></section>
      <section class="panel"><MarginsGrowthTable :ticker="ticker" /></section>
      <section class="panel"><BalanceTable :ticker="ticker" /></section>
    </section>

    <!-- Charts: 12 charts -->
    <section class="charts">
      <section class="panel"><PriceChart          :ticker="ticker" /></section>
      <section class="panel"><RevenueChart        :ticker="ticker" /></section>
      <section class="panel"><NetIncomeChart      :ticker="ticker" /></section>
      <section class="panel"><FcfChart            :ticker="ticker" /></section>
      <section class="panel"><EpsChart            :ticker="ticker" /></section>
      <section class="panel"><EbitdaChart         :ticker="ticker" /></section>
      <section class="panel"><ExpensesChart       :ticker="ticker" /></section>
      <section class="panel"><CashDebtChart       :ticker="ticker" /></section>
      <section class="panel"><SharesChart         :ticker="ticker" /></section>
      <section class="panel"><CapitalReturnedChart :ticker="ticker" /></section>
      <section class="panel"><DividendYieldChart  :ticker="ticker" /></section>
      <section class="panel"><InsiderTradingChart :ticker="ticker" /></section>
    </section>

    <!-- AI Analysis: 2 panels in a row -->
    <section class="ai-analysis-grid">
      <AIAnalysisPanel :ticker="ticker" :companyName="companyName" type="advantages" />
      <AIAnalysisPanel :ticker="ticker" :companyName="companyName" type="risks" />
    </section>
  </main>
</template>

<style>
/* Header */
.app-header {
  text-align: center;
  padding: 24px 0 16px;
  animation: fadeInDown 0.6s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  transition: transform 0.3s ease;
}

.brand-logo:hover {
  transform: rotate(10deg) scale(1.1);
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
