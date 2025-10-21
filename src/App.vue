<script setup>
import { ref, watch, onMounted, defineAsyncComponent } from 'vue'
import { useTickerStore } from './stores/tickerStore'
import { useAuthStore } from './stores/authStore'

// Layout components - Load immediately (visible on page load)
import GlobalTickerBar from './components/layout/GlobalTickerBar.vue'
import HeroSection from './components/layout/HeroSection.vue'
import TabNavigation from './components/layout/TabNavigation.vue'
import TabPanel from './components/layout/TabPanel.vue'
import AuthModal from './components/auth/AuthModal.vue'

// Lazy load AIAnalysisPanel (only loads when Insights tab is opened)
const AIAnalysisPanel = defineAsyncComponent(() =>
  import('./components/layout/AIAnalysisPanel.vue')
)

// PriceChart is used in HeroSection (always visible), so import it statically
import PriceChart from './components/charts/PriceChart.vue'

// Lazy load other chart components (only load when tab is opened)
const PriceTargetBar = defineAsyncComponent(() =>
  import('./components/charts/PriceTargetBar.vue')
)
const RevenueChart = defineAsyncComponent(() =>
  import('./components/charts/RevenueChart.vue')
)
const NetIncomeChart = defineAsyncComponent(() =>
  import('./components/charts/NetIncomeChart.vue')
)
const EpsChart = defineAsyncComponent(() =>
  import('./components/charts/EpsChart.vue')
)
const FcfChart = defineAsyncComponent(() =>
  import('./components/charts/FcfChart.vue')
)
const EbitdaChart = defineAsyncComponent(() =>
  import('./components/charts/EbitdaChart.vue')
)
const ExpensesChart = defineAsyncComponent(() =>
  import('./components/charts/ExpensesChart.vue')
)
const InsiderTradingChart = defineAsyncComponent(() =>
  import('./components/charts/InsiderTradingChart.vue')
)
const CapitalReturnedChart = defineAsyncComponent(() =>
  import('./components/charts/CapitalReturnedChart.vue')
)
const DividendYieldChart = defineAsyncComponent(() =>
  import('./components/charts/DividendYieldChart.vue')
)
const SharesChart = defineAsyncComponent(() =>
  import('./components/charts/SharesChart.vue')
)
const CashDebtChart = defineAsyncComponent(() =>
  import('./components/charts/CashDebtChart.vue')
)

// Use Pinia stores
const tickerStore = useTickerStore()
const authStore = useAuthStore()

const inputTicker = ref('AAPL')
const companyName = ref('Apple Inc.')

// Auth modal state
const showAuthModal = ref(false)
const authModalTab = ref('signin') // 'signin' or 'signup'

// Initialize auth store on mount
onMounted(async () => {
  await authStore.init()
  
  const savedTab = localStorage.getItem('factorly_active_tab')
  if (savedTab && tabs.some(t => t.id === savedTab)) {
    activeTab.value = savedTab
  }
})

// Tab state with localStorage persistence
const activeTab = ref('valuation')

// Tab configuration with PNG icon paths
const tabs = [
  { id: 'valuation', label: 'Valuation', icon: '/icons/valuation.png', badge: null },
  { id: 'performance', label: 'Performance', icon: '/icons/performance.png', badge: null },
  { id: 'balance', label: 'Balance', icon: '/icons/balance.png', badge: null },
  { id: 'profitability', label: 'Returns', icon: '/icons/returns.png', badge: null },
  { id: 'insights', label: 'AI Insights', icon: '/icons/ai.png', badge: null }
]

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

// Auth modal functions
function openSignIn() {
  authModalTab.value = 'signin'
  showAuthModal.value = true
}

function openSignUp() {
  authModalTab.value = 'signup'
  showAuthModal.value = true
}

function closeAuthModal() {
  showAuthModal.value = false
}

function handleAuthSuccess() {
  console.log('[App] User authenticated:', authStore.user)
  // Could show a success toast here
}

function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    authStore.logout()
  }
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
          <!-- Show auth buttons if not logged in -->
          <template v-if="!authStore.isAuthenticated">
            <button class="auth-button sign-in" @click="openSignIn">
              Sign In
            </button>
            <button class="auth-button sign-up" @click="openSignUp">
              Sign Up
            </button>
          </template>
          
          <!-- Show user menu if logged in -->
          <template v-else>
            <div class="user-menu">
              <img 
                v-if="authStore.user?.avatarUrl" 
                :src="authStore.user.avatarUrl" 
                :alt="authStore.user.name || 'User'"
                class="user-avatar"
              />
              <div v-else class="user-avatar-placeholder">
                {{ (authStore.user?.name || authStore.user?.email || 'U')[0].toUpperCase() }}
              </div>
              <span class="user-name">{{ authStore.user?.name || authStore.user?.email }}</span>
              <button class="logout-button" @click="handleLogout" title="Sign Out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </template>
        </div>
      </div>
    </header>

    <!-- Auth Modal -->
    <AuthModal 
      :is-open="showAuthModal"
      :default-tab="authModalTab"
      @close="closeAuthModal"
      @success="handleAuthSuccess"
    />

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

/* Auth Buttons */
.auth-button {
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.auth-button.sign-in {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-button.sign-in:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.auth-button.sign-up {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.auth-button.sign-up:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* User Menu */
.user-menu {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar,
.user-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-placeholder {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.user-name {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-button:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
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

  .auth-button {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }

  .user-name {
    display: none; /* Hide name on tablet */
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
