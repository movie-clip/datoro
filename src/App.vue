<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTickerStore } from './stores/tickerStore'

// Layout components
import GlobalTickerBar from './components/layout/GlobalTickerBar.vue'
import AIAnalysisPanel from './components/layout/AIAnalysisPanel.vue'
import HeroSection from './components/layout/HeroSection.vue'
import TabNavigation from './components/layout/TabNavigation.vue'
import TabPanel from './components/layout/TabPanel.vue'

// Chart components
import PriceTargetBar from './components/charts/PriceTargetBar.vue'
import RevenueChart from './components/charts/RevenueChart.vue'
import NetIncomeChart from './components/charts/NetIncomeChart.vue'
import EpsChart from './components/charts/EpsChart.vue'
import FcfChart from './components/charts/FcfChart.vue'
import EbitdaChart from './components/charts/EbitdaChart.vue'
import ExpensesChart from './components/charts/ExpensesChart.vue'
import InsiderTradingChart from './components/charts/InsiderTradingChart.vue'
import CapitalReturnedChart from './components/charts/CapitalReturnedChart.vue'
import DividendYieldChart from './components/charts/DividendYieldChart.vue'
import SharesChart from './components/charts/SharesChart.vue'
import CashDebtChart from './components/charts/CashDebtChart.vue'

// Use Pinia store for centralized state
const tickerStore = useTickerStore()

const inputTicker = ref('AAPL')
const companyName = ref('Apple Inc.')

// Tab state with localStorage persistence
const activeTab = ref('valuation')

// Tab configuration
const tabs = [
  { id: 'valuation', label: 'Valuation', icon: '💎', badge: null },
  { id: 'performance', label: 'Performance', icon: '📊', badge: null },
  { id: 'profitability', label: 'Profitability', icon: '💰', badge: null },
  { id: 'balance', label: 'Balance & Returns', icon: '💵', badge: null },
  { id: 'insights', label: 'AI Insights', icon: '🤖', badge: null }
]

// Load saved tab preference
onMounted(() => {
  const savedTab = localStorage.getItem('factorly_active_tab')
  if (savedTab && tabs.some(t => t.id === savedTab)) {
    activeTab.value = savedTab
  }
})

// Save tab preference
watch(activeTab, (newTab) => {
  localStorage.setItem('factorly_active_tab', newTab)
})

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

    <!-- Hero Section: Price Chart + Key Metrics -->
    <section class="hero-section">
      <HeroSection />
    </section>

    <!-- Tab Navigation -->
    <TabNavigation 
      v-model="activeTab"
      :tabs="tabs"
      class="tab-navigation"
    />

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Valuation Tab -->
      <TabPanel 
        id="valuation" 
        :active="activeTab === 'valuation'"
        :lazyLoad="true"
      >
        <section class="charts">
          <section class="panel">
            <EpsChart />
          </section>
          <section class="panel">
            <EbitdaChart />
          </section>
        </section>
      </TabPanel>

      <!-- Performance Tab -->
      <TabPanel 
        id="performance" 
        :active="activeTab === 'performance'"
        :lazyLoad="true"
      >
        <section class="charts">
          <section class="panel">
            <RevenueChart />
          </section>
          <section class="panel">
            <NetIncomeChart />
          </section>
          <section class="panel">
            <FcfChart />
          </section>
        </section>
      </TabPanel>

      <!-- Profitability Tab -->
      <TabPanel 
        id="profitability" 
        :active="activeTab === 'profitability'"
        :lazyLoad="true"
      >
        <section class="charts">
          <section class="panel">
            <ExpensesChart />
          </section>
        </section>
      </TabPanel>

      <!-- Balance & Returns Tab -->
      <TabPanel 
        id="balance" 
        :active="activeTab === 'balance'"
        :lazyLoad="true"
      >
        <section class="charts">
          <section class="panel">
            <CashDebtChart />
          </section>
          <section class="panel">
            <CapitalReturnedChart />
          </section>
          <section class="panel">
            <DividendYieldChart />
          </section>
          <section class="panel">
            <SharesChart />
          </section>
        </section>
      </TabPanel>

      <!-- AI Insights Tab -->
      <TabPanel 
        id="insights" 
        :active="activeTab === 'insights'"
        :lazyLoad="true"
      >
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
        
        <!-- Insider Trading Chart in Insights Tab -->
        <section class="charts" style="margin-top: 2rem;">
          <section class="panel">
            <InsiderTradingChart />
          </section>
        </section>
      </TabPanel>
    </div>

    <!-- Price Target Bar: After all tabs -->
    <section class="price-target-section">
      <section class="panel">
        <PriceTargetBar />
      </section>
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
  max-width: 1400px;
  margin: 12px auto 24px;
  padding: 0 12px;
}

.price-target-section {
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 12px;
}

.price-target-section > .panel {
  width: 100%;
}

/* Hero Section */
.hero-section {
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 12px;
}

/* Tab Navigation */
.tab-navigation {
  max-width: 1400px;
  margin: 32px auto 0;
  padding: 0 12px;
}

/* Tab Content */
.tab-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
  width: 100%;
  position: relative;
  min-height: 500px;
}

/* Mobile-specific sections */
.mobile-only {
  display: none;
}

.desktop-only {
  display: block;
}

/* Special display for grid-based desktop-only sections */
.charts.desktop-only,
.ai-analysis-grid.desktop-only {
  display: grid;
}

/* Mobile responsive: show mobile-only, hide desktop-only */
@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
  
  .desktop-only {
    display: none !important;
  }
}

</style>
