<script setup>
import { ref } from 'vue'
import GlobalTickerBar from './components/GlobalTickerBar.vue'

import ValuationTable from './components/ValuationTable.vue'
import CashFlowTable from './components/CashFlowTable.vue'          // NEW
import MarginsGrowthTable from './components/MarginsGrowthTable.vue'// NEW

import PriceChart from './components/PriceChart.vue'
import RevenueChart from './components/RevenueChart.vue'
import FcfChart from './components/FcfChart.vue'

const inputTicker = ref('ACN')
const ticker = ref('ACN')
function applyTicker(){ const t=(inputTicker.value||'').trim().toUpperCase(); if(t) ticker.value=t }
</script>

<template>
  <main class="page">
    <h1>Markets Dashboard</h1>

    <section class="panel" style="max-width: 900px; margin: 0 auto;">
      <GlobalTickerBar v-model="inputTicker" @submit="applyTicker" />
    </section>

    <!-- NEW: 3 info cards in a row -->
    <section class="info-grid">
      <section class="panel"><ValuationTable :ticker="ticker" /></section>
      <section class="panel"><CashFlowTable :ticker="ticker" /></section>
      <section class="panel"><MarginsGrowthTable :ticker="ticker" /></section>
    </section>

    <!-- Charts (unchanged) -->
    <section class="charts">
      <section class="panel"><PriceChart   :ticker="ticker" /></section>
      <section class="panel"><RevenueChart :ticker="ticker" /></section>
      <section class="panel"><FcfChart     :ticker="ticker" /></section>
    </section>
  </main>
</template>
