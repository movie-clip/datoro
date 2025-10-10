<template>
  <main class="page">
    <h1>Markets Dashboard</h1>

    <!-- single global input -->
    <GlobalTickerBar v-model="inputTicker" @submit="applyTicker" />

    <!-- responsive grid of charts -->
    <section class="charts">
      <PriceChart   :ticker="ticker" />
      <RevenueChart :ticker="ticker" />
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import GlobalTickerBar from './components/GlobalTickerBar.vue'
import PriceChart from './components/PriceChart.vue'
import RevenueChart from './components/RevenueChart.vue'

const inputTicker = ref('ACN')  // what user types
const ticker = ref('ACN')       // applied to charts

function applyTicker() {
  const t = (inputTicker.value || '').trim().toUpperCase()
  if (t) ticker.value = t
}
</script>

<style>
:root { color-scheme: dark; }
html, body, #app { height: 100%; margin: 0; }
.page {
  min-height: 100%;
  padding: 16px;
  background: #808080;
  color: #fff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
}
h1 { margin: 0 0 12px; font-size: 20px; text-align: center; }
.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 600px));
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
}
</style>
