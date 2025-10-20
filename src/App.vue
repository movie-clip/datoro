<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTickerStore } from './stores/tickerStore'

// Layout components
import GlobalTickerBar from './components/layout/GlobalTickerBar.vue'
import AIAnalysisPanel from './components/layout/AIAnalysisPanel.vue'
import HeroSection from './components/layout/HeroSection.vue'
import TabNavigation from './components/layout/TabNavigation.vue'
import TabPanel from './components/layout/TabPanel.vue'

// Icon components
import IconValuation from './components/icons/IconValuation.vue'
import IconPerformance from './components/icons/IconPerformance.vue'
import IconBalance from './components/icons/IconBalance.vue'
import IconReturns from './components/icons/IconReturns.vue'
import IconAI from './components/icons/IconAI.vue'

// Chart components
import PriceChart from './components/charts/PriceChart.vue'
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
  { id: 'valuation', label: 'Valuation', icon: IconValuation, badge: null },
  { id: 'performance', label: 'Performance', icon: IconPerformance, badge: null },
  { id: 'balance', label: 'Balance', icon: IconBalance, badge: null },
  { id: 'profitability', label: 'Returns', icon: IconReturns, badge: null },
  { id: 'insights', label: 'AI Insights', icon: IconAI, badge: null }
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
      <div class="header-container">
        <div class="header-left">
          <img 
            src="/logo.png" 
            alt="Factorly Logo" 
            class="brand-logo"
            @error="handleImageError"
          >
          <span class="brand-text">Factorly</span>
        </div>
        
        <div class="header-right">
          <button 
            class="icon-button" 
            title="Settings"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m-7-7h6m6 0h6" />
              <path d="M20.4 8.4l-4.2 4.2m-8.4 0L3.6 8.4M3.6 15.6l4.2-4.2m8.4 0l4.2 4.2" />
            </svg>
          </button>
          <button 
            class="icon-button" 
            title="Theme"
            aria-label="Theme toggle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <section
      class="ticker-bar-section"
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
          <section class="panel">
            <InsiderTradingChart />
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

      <!-- Returns Tab -->
      <TabPanel 
        id="profitability" 
        :active="activeTab === 'profitability'"
        :lazyLoad="true"
      >
        <section class="charts">
          <section class="panel">
            <CapitalReturnedChart />
          </section>
          <section class="panel">
            <DividendYieldChart />
          </section>
          <section class="panel">
            <ExpensesChart />
          </section>
        </section>
      </TabPanel>

      <!-- Balance Tab -->
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
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0.875rem 1.5rem;
  background: rgba(15, 15, 16, 0.98);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid #2A2A2E;
  transition: all 0.3s ease;
}

.app-header:hover {
  border-bottom-color: rgba(0, 89, 76, 0.3);
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 89, 76, 0.4));
  transition: transform 0.3s ease;
}

.brand-logo:hover {
  transform: scale(1.05);
}

/* Branding - Aston Martin British Racing Green */
.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #00594C;
  letter-spacing: -0.02em;
  transition: color 0.3s ease;
}

.brand-text:hover {
  color: #00755F;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: 1px solid #2A2A2E;
  border-radius: 8px;
  color: #9E9E9E;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-button:hover {
  background: rgba(0, 89, 76, 0.1);
  border-color: #00594C;
  color: #00A88E;
  transform: translateY(-1px);
}

.icon-button:active {
  transform: translateY(0);
}

.icon-button svg {
  flex-shrink: 0;
}

/* Ticker Bar Section - spacing after header */
.ticker-bar-section {
  max-width: 900px;
  margin: 1.5rem auto 0;
  padding: 0 12px;
}

/* Header responsive */
@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem 1rem;
  }

  .brand-logo {
    width: 32px;
    height: 32px;
  }

  .brand-text {
    font-size: 1.25rem;
  }

  .icon-button {
    width: 32px;
    height: 32px;
  }

  .icon-button svg {
    width: 18px;
    height: 18px;
  }

  .ticker-bar-section {
    margin-top: 1.25rem;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 0.625rem 0.75rem;
  }

  .brand-logo {
    width: 28px;
    height: 28px;
  }

  .brand-text {
    font-size: 1.125rem;
  }

  .header-right {
    gap: 6px;
  }

  .icon-button {
    width: 30px;
    height: 30px;
  }

  .icon-button svg {
    width: 16px;
    height: 16px;
  }

  .ticker-bar-section {
    margin-top: 1rem;
  }
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
