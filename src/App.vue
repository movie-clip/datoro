<script setup>
import { ref, watch } from 'vue'
import { useTickerStore } from './stores/tickerStore'

// Layout components
import GlobalTickerBar from './components/layout/GlobalTickerBar.vue'
import AIAnalysisPanel from './components/layout/AIAnalysisPanel.vue'

// Table components
import ValuationTable from './components/tables/ValuationTable.vue'
import CashFlowTable from './components/tables/CashFlowTable.vue'
import MarginsGrowthTable from './components/tables/MarginsGrowthTable.vue'
import BalanceTable from './components/tables/BalanceTable.vue'
import CapitalReturnedTable from './components/tables/CapitalReturnedTable.vue'

// Chart components
import PriceChart from './components/charts/PriceChart.vue'
import PriceTargetBar from './components/charts/PriceTargetBar.vue'
import RevenueChart from './components/charts/RevenueChart.vue'
import NetIncomeChart from './components/charts/NetIncomeChart.vue'
import FcfChart from './components/charts/FcfChart.vue'
import EpsChart from './components/charts/EpsChart.vue'
import EbitdaChart from './components/charts/EbitdaChart.vue'
import CapitalReturnedChart from './components/charts/CapitalReturnedChart.vue'
import CashDebtChart from './components/charts/CashDebtChart.vue'
import SharesChart from './components/charts/SharesChart.vue'
import InsiderTradingChart from './components/charts/InsiderTradingChart.vue'
import DividendYieldChart from './components/charts/DividendYieldChart.vue'
import ExpensesChart from './components/charts/ExpensesChart.vue'

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

    <!-- Info cards: 5 tables in a row (no longer need ticker prop - use store) -->
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
      <section class="panel">
        <CapitalReturnedTable />
      </section>
    </section>

    <!-- Charts: 12 charts (hidden on mobile) -->
    <section class="charts desktop-only">
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

    <!-- Price Target Bar: Full width section -->
    <section class="price-target-section">
      <section class="panel">
        <PriceTargetBar />
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
  padding: 2rem 0 1.5rem;
  background: linear-gradient(180deg, #0F0F10 0%, rgba(15, 15, 16, 0.95) 100%);
}

.brand-title {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 2.5rem;
  transition: transform 0.3s ease;
}

.brand-title:hover {
  transform: scale(1.02);
}

.brand-logo {
  width: 70px;
  height: 70px;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 89, 76, 0.5));
}

/* Branding - Aston Martin British Racing Green */
.brand {
  color: #00594C;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: unset;
  background-clip: text;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ai-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 1200px;
  margin: 12px auto 24px;
}

.price-target-section {
  max-width: 940px;
  margin: 24px;
  padding: 0 12px;
}

.price-target-section > .panel {
  width: 100%;
}

/* Mobile-specific sections */
.mobile-only {
  display: none;
}

.desktop-only {
  display: grid;
}

.metrics-overview-section {
  max-width: 940px;
  margin: 24px auto;
  padding: 0 12px;
}

/* Mobile responsive: show mobile-only, hide desktop-only */
@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
  
  .desktop-only {
    display: none;
  }
}

</style>
