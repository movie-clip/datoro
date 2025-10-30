<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { useTickerStore } from './stores/tickerStore'
import { useAuthStore } from './stores/authStore'
import { useWatchlists } from './composables/useWatchlists'
import { STORAGE_KEYS } from './config/storage'
import BRAND from './config/brand'
import { trackDeepFinderOpen, trackDcfCalculatorOpen, trackMacroOpen } from './services/analytics/gaService'

// Temporary type for auth user until authStore is fully typed
interface AuthUser {
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

// Layout components - Load immediately (visible on page load)
import GlobalTickerBar from './components/layout/GlobalTickerBar.vue'
import HeroSection from './components/layout/HeroSection.vue'
import TabNavigation from './components/layout/TabNavigation.vue'
import TabPanel from './components/layout/TabPanel.vue'
import AuthModal from './components/auth/AuthModal.vue'
import WatchlistPanel from './components/common/WatchlistPanel.vue'
import MainMenu from './components/common/MainMenu.vue'
import DeepFinderModal from './components/modals/DeepFinderModal.vue'
import TimeframeToggle from './components/common/TimeframeToggle.vue'

// Lazy load MacroView
const MacroView = defineAsyncComponent(() =>
  import('./components/MacroView.vue')
)

// Lazy load FeedbackForm
const FeedbackForm = defineAsyncComponent(() =>
  import('./components/FeedbackForm.vue')
)

// Lazy load AIAnalysisPanel (only loads when Insights tab is opened)
const AIAnalysisPanel = defineAsyncComponent(() =>
  import('./components/layout/AIAnalysisPanel.vue')
)

// Email verification page
import VerifyEmailPage from './components/auth/VerifyEmailPage.vue'

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

// Cast user to proper type (authStore not fully typed yet)
const user = computed(() => authStore.user as AuthUser | null)

const inputTicker = ref('AAPL')
const companyName = ref('Apple Inc.')

type AuthTab = 'signin' | 'signup'

const showAuthModal = ref(false)
const authModalTab = ref<AuthTab>('signin')

// Main Menu
const showMainMenu = ref(false)

// Deep Finder
const showDeepFinder = ref(false)
const showMacro = ref(false)
const showFeedback = ref(false)
const feedbackSubmitted = ref(false)

// Watchlist (multi-watchlist support)
const { initializeWatchlists, toggleWatchlist, clearAll } = useWatchlists()
const showWatchlistPanel = ref(false)

// Email verification
const showVerifyEmailPage = ref(false)
const verifyEmailToken = ref<string | undefined>(undefined)
const verifyEmailMode = ref<'verify' | 'pending'>('pending')
const verifyEmailAddress = ref<string | undefined>(undefined)

// Initialize auth store on mount
onMounted(async () => {
  // Check for email verification token in URL
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const action = urlParams.get('action')
  
  if (token && action === 'verify-email') {
    verifyEmailToken.value = token
    verifyEmailMode.value = 'verify'
    showVerifyEmailPage.value = true
    // Clean URL without reloading
    window.history.replaceState({}, '', window.location.pathname)
  }
  
  // Wait for auth init before loading watchlist
  try {
    await authStore.init()
    
    // Only initialize watchlist if user is authenticated
    if (authStore.isAuthenticated) {
      await initializeWatchlists()
    }
  } catch (_err) {
    console.error('[App] Auth init failed:', _err)
  }
  
  const savedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)
  if (savedTab && tabs.some(t => t.id === savedTab)) {
    activeTab.value = savedTab
  }
})

// Watch for authentication changes to reinitialize watchlist
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    // User just logged in - force reinitialize watchlist
    initializeWatchlists(true).catch((err: Error) => {
      console.error('[App] Watchlist reinit failed:', err)
    })
  }
})

// Tab state with localStorage persistence
const activeTab = ref('valuation')

interface Tab {
  id: string
  label: string
  icon: string
  badge: string | null
}

// Tab configuration with PNG icon paths
const tabs: Tab[] = [
  { id: 'valuation', label: 'Valuation', icon: '/icons/valuation.png', badge: null },
  { id: 'performance', label: 'Performance', icon: '/icons/performance.png', badge: null },
  { id: 'balance', label: 'Balance', icon: '/icons/balance.png', badge: null },
  { id: 'profitability', label: 'Returns', icon: '/icons/returns.png', badge: null },
  { id: 'insights', label: 'AI Insights', icon: '/icons/ai.png', badge: null }
]

// Save tab preference
watch(activeTab, (newTab) => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, newTab)
})

// Watch ticker changes and update store
watch(() => inputTicker.value, (newTicker) => {
  if (newTicker && newTicker.trim()) {
    tickerStore.setTicker(newTicker.trim().toUpperCase())
  }
}, { immediate: true })

const applyTicker = (): void => {
  const t = (inputTicker.value || '').trim().toUpperCase()
  if (t) {
    // Don't call setTicker here - the watcher already handles it
    // This prevents duplicate GA4 search_ticker events
    // tickerStore.setTicker(t)
    
    // Reset company name when ticker changes - it will be updated by CompanyHeader
    companyName.value = ''
  }
}

// Hide logo if image fails to load
const handleImageError = (event: Event): void => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

// Auth modal functions
const openSignIn = (): void => {
  authModalTab.value = 'signin'
  showAuthModal.value = true
}

const openSignUp = (): void => {
  authModalTab.value = 'signup'
  showAuthModal.value = true
}

const closeAuthModal = (): void => {
  showAuthModal.value = false
}

const handleAuthSuccess = (): void => {
  console.log('[App] User authenticated:', authStore.user)
  // Could show a success toast here
}

const handleShowVerifyEmail = (email: string, mode: 'pending' | 'verify'): void => {
  verifyEmailAddress.value = email
  verifyEmailMode.value = mode
  showVerifyEmailPage.value = true
}

const handleLogout = (): void => {
  if (confirm('Are you sure you want to sign out?')) {
    clearAll()
    authStore.logout()
  }
}

const toggleMainMenu = (): void => {
  showMainMenu.value = !showMainMenu.value
}

const toggleDeepFinder = (): void => {
  showDeepFinder.value = !showDeepFinder.value
  
  // Track when Deep Finder is opened
  if (showDeepFinder.value) {
    trackDeepFinderOpen(tickerStore.currentTicker || undefined)
  }
}

const toggleMacro = (): void => {
  showMacro.value = !showMacro.value
  
  // Track when Macro Dashboard is opened
  if (showMacro.value) {
    trackMacroOpen()
  }
}

const toggleFeedback = (): void => {
  showFeedback.value = !showFeedback.value
  if (!showFeedback.value) {
    feedbackSubmitted.value = false
  }
}

const handleFeedbackSubmitted = (): void => {
  feedbackSubmitted.value = true
}

const toggleWatchlistPanel = (): void => {
  showWatchlistPanel.value = !showWatchlistPanel.value
}

const handleToggleWatchlist = async (ticker: string): Promise<void> => {
  try {
    await toggleWatchlist(ticker)
  } catch (_error) {
    console.error('Error toggling watchlist:', _error)
    const message = _error instanceof Error ? _error.message : 'Failed to update watchlist'
    alert(message)
  }
}

const handleSelectTicker = (ticker: string): void => {
  // Save current scroll position before updating ticker
  const scrollY = window.scrollY
  
  // Update the input field (the watcher will handle calling setTicker)
  inputTicker.value = ticker
  
  // Don't call setTicker here - the watcher already handles it
  // This prevents duplicate GA4 search_ticker events
  // tickerStore.setTicker(ticker)
  
  // Restore scroll position after Vue updates the DOM
  // Use nextTick to ensure DOM has updated
  nextTick(() => {
    window.scrollTo(0, scrollY)
  })
}
</script>

<template>
  <main class="page">
    <header class="app-header">
      <div class="header-container">
        <div class="header-left">
          <!-- Hamburger Menu Button -->
          <button 
            class="hamburger-menu-button" 
            @click="toggleMainMenu"
            title="Menu"
            aria-label="Open main menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <img 
            src="/logo.png" 
            :alt="`${BRAND.name} Logo`"
            class="brand-logo"
            @error="handleImageError"
          >
          <span class="brand-text">{{ BRAND.name }}</span>
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
                v-if="user?.avatarUrl" 
                :src="user.avatarUrl" 
                :alt="user.name || 'User'"
                class="user-avatar"
              />
              <div v-else class="user-avatar-placeholder">
                {{ (user?.name || user?.email || 'U')[0]?.toUpperCase() || 'U' }}
              </div>
              <span class="user-name">{{ user?.name || user?.email }}</span>
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
      @show-verify-email="handleShowVerifyEmail"
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

    <!-- Tab Navigation + Timeframe Toggle Row -->
    <div class="nav-row">
      <TabNavigation 
        :model-value="activeTab"
        @update:model-value="(value: string) => activeTab = value"
        :tabs="tabs"
        class="tab-navigation"
      />
      <TimeframeToggle />
    </div>

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
    
    <!-- Main Menu -->
    <MainMenu 
      :is-open="showMainMenu"
      :is-authenticated="authStore.isAuthenticated"
      @close="showMainMenu = false"
      @toggle-watchlist="handleToggleWatchlist"
      @select-ticker="handleSelectTicker"
      @show-deep-finder="toggleDeepFinder"
      @show-macro="toggleMacro"
      @show-feedback="toggleFeedback"
    />
    
    <!-- Deep Finder Modal -->
    <DeepFinderModal v-model="showDeepFinder" />

    <!-- Macro Dashboard Modal -->
    <Teleport to="body">
      <div v-if="showMacro" class="modal-overlay" @click.self="showMacro = false">
        <div class="modal-container macro-modal">
          <button class="modal-close macro-close" @click="showMacro = false" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <MacroView />
        </div>
      </div>
    </Teleport>

    <!-- Feedback Modal -->
    <Teleport to="body">
      <div v-if="showFeedback" class="modal-overlay" @click.self="showFeedback = false">
        <div class="modal-container feedback-modal">
          <button v-if="!feedbackSubmitted" class="modal-close" @click="showFeedback = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <FeedbackForm @submitted="handleFeedbackSubmitted" />
        </div>
      </div>
    </Teleport>
    
    <!-- Watchlist Panel -->
    <WatchlistPanel 
      :is-open="showWatchlistPanel"
      @close="showWatchlistPanel = false"
      @toggle-watchlist="handleToggleWatchlist"
      @select-ticker="handleSelectTicker"
    />
    
    <!-- Email Verification Page -->
    <VerifyEmailPage 
      v-if="showVerifyEmailPage"
      :token="verifyEmailToken"
      :mode="verifyEmailMode"
      :email="verifyEmailAddress"
      @close="showVerifyEmailPage = false"
    />
    
    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-section">
          <p class="footer-copyright">© 2025 Datoro. All rights reserved.</p>
        </div>
        <div class="footer-section">
          <a href="/privacy-policy.html" target="_blank" class="footer-link">Privacy Policy</a>
          <span class="footer-divider">|</span>
          <a href="/terms-of-service.html" target="_blank" class="footer-link">Terms of Service</a>
          <span class="footer-divider">|</span>
          <a href="/cookie-policy.html" target="_blank" class="footer-link">Cookie Policy</a>
        </div>
      </div>
    </footer>
  </main>
</template>

<style>
/* ============================================
   APP HEADER
   ============================================ */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0.875rem 0;
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
  padding: 0 12px;
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

/* ============================================
   BRANDING (Aston Martin British Racing Green)
   ============================================ */
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

/* ============================================
   HAMBURGER MENU BUTTON
   ============================================ */
.hamburger-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #9E9E9E;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hamburger-menu-button:hover {
  background: rgba(0, 89, 76, 0.1);
  border-color: rgba(0, 89, 76, 0.3);
  color: #00A88E;
  transform: translateY(-1px);
}

.hamburger-menu-button:active {
  transform: translateY(0);
}

.hamburger-menu-button svg {
  width: 24px;
  height: 24px;
}

/* ============================================
   ICON BUTTON
   ============================================ */
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

/* ============================================
   AUTH BUTTONS
   ============================================ */
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
  color: #E5E5E5;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.auth-button.sign-in:hover {
  background: rgba(0, 168, 142, 0.1);
  border-color: rgba(0, 168, 142, 0.3);
  color: #00A88E;
  transform: translateY(-1px);
}

.auth-button.sign-up {
  background: linear-gradient(135deg, #00594C 0%, #00755F 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.2);
}

.auth-button.sign-up:hover {
  background: linear-gradient(135deg, #00755F 0%, #00A88E 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 89, 76, 0.4);
}

/* ============================================
   USER MENU
   ============================================ */
.user-menu {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.75rem;
  background: rgba(0, 89, 76, 0.05);
  border: 1px solid rgba(0, 89, 76, 0.15);
  border-radius: 8px;
  transition: all 0.2s;
}

.user-menu:hover {
  background: rgba(0, 89, 76, 0.08);
  border-color: rgba(0, 89, 76, 0.25);
}

.user-avatar,
.user-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 168, 142, 0.2);
}

.user-avatar-placeholder {
  background: linear-gradient(135deg, #00594C 0%, #00755F 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.2);
}

.user-name {
  color: #E5E5E5;
  font-size: 0.9rem;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watchlist-button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #9CA3AF;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.watchlist-button svg {
  width: 18px;
  height: 18px;
}

.watchlist-button:hover {
  background: rgba(255, 184, 0, 0.1);
  border-color: rgba(255, 184, 0, 0.3);
  color: #FFB800;
}

.logout-button {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-button:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  transform: translateY(-1px);
}

/* ============================================
   MAIN SECTIONS
   ============================================ */
.ticker-bar-section {
  max-width: 1400px;
  margin: 1.5rem auto 0;
  padding: 0 12px;
}

.hero-section {
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 12px;
}

.price-target-section {
  max-width: 1400px;
  margin: 12px auto 16px;
  padding: 0 12px;
}

.price-target-section > .panel {
  width: 100%;
}

.ai-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 1400px;
  margin: 12px auto 24px;
  padding: 0 12px;
}

/* ============================================
   TAB NAVIGATION & CONTENT
   ============================================ */
.nav-row {
  max-width: calc(1400px - 24px);
  margin: 0 auto 0;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #151518 0%, #1A1A1D 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  box-sizing: border-box;
}

.tab-navigation {
  flex: 0 1 auto;
}

.tab-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 0;
  width: 100%;
  position: relative;
  min-height: 430px;
}

/* ============================================
   MOBILE / DESKTOP VISIBILITY
   ============================================ */
.mobile-only {
  display: none;
}

.desktop-only {
  display: block;
}

.charts.desktop-only,
.ai-analysis-grid.desktop-only {
  display: grid;
}

/* ============================================
   MODAL OVERLAY & CONTAINERS
   ============================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

/* size of Macro window */
.modal-container.macro-modal {
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #2A2A2E;
  max-width: 1200px;
  width: 95%;
  min-height: 600px;
  max-height: 93vh;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  padding: 20px;
}

.modal-container.macro-modal::-webkit-scrollbar {
  width: 8px;
}

.modal-container.macro-modal::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.modal-container.macro-modal::-webkit-scrollbar-thumb {
  background: rgba(0, 89, 76, 0.3);
  border-radius: 4px;
}

.modal-container.macro-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 89, 76, 0.5);
}

.modal-container.feedback-modal {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid #2A2A2E;
  max-width: 450px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.modal-close svg {
  color: #fff;
}

/* Smaller close button for Macro modal */
.modal-close.macro-close {
  width: 32px;
  height: 32px;
  top: 2px;
  right: 2px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.modal-close.macro-close:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.modal-close.macro-close svg {
  width: 18px;
  height: 18px;
}

/* ============================================
   RESPONSIVE - HEADER (TABLET & MOBILE)
   ============================================ */
@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem 0;
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
    display: none;
  }
  
  .mobile-only {
    display: block;
  }
  
  .desktop-only {
    display: none !important;
  }
}

/* ============================================
   RESPONSIVE - MOBILE SMALL
   ============================================ */
@media (max-width: 480px) {
  .app-header {
    padding: 0.625rem 0;
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

/* ============================================
   APP FOOTER
   ============================================ */
.app-footer {
  background: #0f0f10;
  border-top: 1px solid #2A2A2E;
  padding: 30px 20px;
  margin-top: 60px;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  text-align: center;
}

.footer-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-copyright {
  color: #9E9E9E;
  font-size: 0.875rem;
  margin: 0;
}

.footer-link {
  color: #C0C0C0;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #00A88E;
  text-decoration: underline;
}

.footer-divider {
  color: #666;
  font-size: 0.875rem;
}

@media (min-width: 768px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>

