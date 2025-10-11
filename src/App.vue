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

const inputTicker = ref('AAPL')
const ticker = ref('AAPL')
function applyTicker(){ const t=(inputTicker.value||'').trim().toUpperCase(); if(t) ticker.value=t }
</script>

<template>
  <main class="page">
    <h1>Markets Dashboard</h1>

    <section class="panel" style="max-width: 900px; margin: 0 auto;">
      <GlobalTickerBar v-model="inputTicker" @submit="applyTicker" />
    </section>

    <!-- Info cards: 4 tables in a row -->
    <section class="info-grid">
      <section class="panel"><ValuationTable :ticker="ticker" /></section>
      <section class="panel"><CashFlowTable :ticker="ticker" /></section>
      <section class="panel"><MarginsGrowthTable :ticker="ticker" /></section>
      <section class="panel"><BalanceTable :ticker="ticker" /></section>
    </section>

    <!-- Charts: 8 charts -->
    <section class="charts">
      <section class="panel"><PriceChart          :ticker="ticker" /></section>
      <section class="panel"><RevenueChart        :ticker="ticker" /></section>
      <section class="panel"><FcfChart            :ticker="ticker" /></section>
      <section class="panel"><EpsChart            :ticker="ticker" /></section>
      <section class="panel"><CashDebtChart       :ticker="ticker" /></section>
      <section class="panel"><SharesChart         :ticker="ticker" /></section>
      <section class="panel"><InsiderTradingChart :ticker="ticker" /></section>
      <section class="panel"><DividendYieldChart  :ticker="ticker" /></section>
    </section>
  </main>
</template>
