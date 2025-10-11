<script setup>
import { ref } from 'vue'
import GlobalTickerBar from './components/GlobalTickerBar.vue'

import ValuationTable from './components/ValuationTable.vue'
import CashFlowTable from './components/CashFlowTable.vue'
import MarginsGrowthTable from './components/MarginsGrowthTable.vue'
import BalanceTable from './components/BalanceTable.vue'

import PriceChart from './components/PriceChart.vue'
import RevenueChart from './components/RevenueChart.vue'
import FcfChart from './components/FcfChart.vue'
import EpsChart from './components/EpsChart.vue'
import CashDebtChart from './components/CashDebtChart.vue'
import SharesChart from './components/SharesChart.vue'
import InsiderTradingChart from './components/InsiderTradingChart.vue'
import DividendYieldChart from './components/DividendYieldChart.vue'
import ExpensesChart from './components/ExpensesChart.vue'
import AIAnalysisPanel from './components/AIAnalysisPanel.vue'

const inputTicker = ref('AAPL')
const ticker = ref('AAPL')
const companyName = ref('Apple Inc.')
function applyTicker(){ const t=(inputTicker.value||'').trim().toUpperCase(); if(t) ticker.value=t }
</script>

<template>
  <main class="page">
    <h1>Markets Dashboard</h1>

    <section class="panel" style="max-width: 900px; margin: 0 auto;">
      <GlobalTickerBar 
        v-model="inputTicker" 
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

    <!-- Charts: 9 charts -->
    <section class="charts">
      <section class="panel"><PriceChart          :ticker="ticker" /></section>
      <section class="panel"><RevenueChart        :ticker="ticker" /></section>
      <section class="panel"><FcfChart            :ticker="ticker" /></section>
      <section class="panel"><EpsChart            :ticker="ticker" /></section>
      <section class="panel"><ExpensesChart       :ticker="ticker" /></section>
      <section class="panel"><CashDebtChart       :ticker="ticker" /></section>
      <section class="panel"><SharesChart         :ticker="ticker" /></section>
      <section class="panel"><DividendYieldChart  :ticker="ticker" /></section>
      <section class="panel"><InsiderTradingChart :ticker="ticker" /></section>
    </section>

    <!-- AI Analysis: 2 panels in a row -->
    <section class="ai-analysis-grid">
      <section class="panel">
        <AIAnalysisPanel :ticker="ticker" :companyName="companyName" type="advantages" />
      </section>
      <section class="panel">
        <AIAnalysisPanel :ticker="ticker" :companyName="companyName" type="risks" />
      </section>
    </section>
  </main>
</template>

<style>
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
