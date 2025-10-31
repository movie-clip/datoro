<template>
  <Transition name="cookie-consent">
    <div v-if="showBanner" class="cookie-consent-overlay">
      <div class="cookie-consent-banner">
        <div class="cookie-content">
          <h3 class="cookie-title">🍪 Cookie Settings</h3>
          <p class="cookie-description">
            We use cookies to enhance your experience. Essential cookies are required for the site to function. 
            You can choose to accept or decline optional cookies for analytics and advertising.
          </p>

          <!-- Cookie Categories -->
          <div class="cookie-categories">
            <!-- Essential Cookies (Always On) -->
            <div class="cookie-category">
              <div class="category-header">
                <div class="category-info">
                  <input 
                    type="checkbox" 
                    id="essential" 
                    checked 
                    disabled
                    class="cookie-checkbox"
                  />
                  <label for="essential" class="category-label">
                    <strong>Essential Cookies</strong>
                    <span class="required-badge">Required</span>
                  </label>
                </div>
              </div>
              <p class="category-description">
                Necessary for authentication, security, and basic site functionality. Cannot be disabled.
              </p>
            </div>

            <!-- Analytics Cookies -->
            <div class="cookie-category">
              <div class="category-header">
                <div class="category-info">
                  <input 
                    type="checkbox" 
                    id="analytics" 
                    v-model="preferences.analytics"
                    class="cookie-checkbox"
                  />
                  <label for="analytics" class="category-label">
                    <strong>Analytics Cookies</strong>
                  </label>
                </div>
              </div>
              <p class="category-description">
                Help us understand how visitors use our site (Google Analytics). Used to improve user experience.
              </p>
            </div>

            <!-- Advertising Cookies -->
            <div class="cookie-category">
              <div class="category-header">
                <div class="category-info">
                  <input 
                    type="checkbox" 
                    id="advertising" 
                    v-model="preferences.advertising"
                    class="cookie-checkbox"
                  />
                  <label for="advertising" class="category-label">
                    <strong>Advertising Cookies</strong>
                  </label>
                </div>
              </div>
              <p class="category-description">
                Used to show you relevant ads and measure campaign effectiveness (Meta Pixel, Google Ads).
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="cookie-actions">
            <button @click="acceptAll" class="btn-accept-all">
              Accept All
            </button>
            <button @click="savePreferences" class="btn-save">
              Save Preferences
            </button>
            <button @click="rejectAll" class="btn-reject">
              Reject Optional
            </button>
          </div>

          <!-- Links -->
          <div class="cookie-links">
            <router-link to="/privacy" class="cookie-link">Privacy Policy</router-link>
            <span class="separator">•</span>
            <router-link to="/cookies" class="cookie-link">Cookie Policy</router-link>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Settings Button (Always Visible) -->
  <button 
    v-if="!showBanner && consentGiven" 
    @click="showBanner = true" 
    class="cookie-settings-btn"
    title="Cookie Settings"
    aria-label="Cookie Settings"
  >
    ⚙️
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface CookiePreferences {
  essential: boolean // Always true
  analytics: boolean
  advertising: boolean
}

const STORAGE_KEY = 'datoro-cookie-consent'
const CONSENT_VERSION = '1.0' // Increment to re-prompt users

const showBanner = ref(false)
const consentGiven = ref(false)
const preferences = ref<CookiePreferences>({
  essential: true,
  analytics: false,
  advertising: false
})

/**
 * Load saved preferences from localStorage
 */
function loadPreferences(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false

    const data = JSON.parse(stored)
    
    // Check if consent version matches
    if (data.version !== CONSENT_VERSION) {
      return false
    }

    preferences.value = {
      essential: true, // Always true
      analytics: data.analytics || false,
      advertising: data.advertising || false
    }

    return true
  } catch (e) {
    console.error('[Cookie Consent] Failed to load preferences:', e)
    return false
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferencesToStorage() {
  try {
    const data = {
      version: CONSENT_VERSION,
      essential: true,
      analytics: preferences.value.analytics,
      advertising: preferences.value.advertising,
      timestamp: new Date().toISOString()
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    consentGiven.value = true
  } catch (e) {
    console.error('[Cookie Consent] Failed to save preferences:', e)
  }
}

/**
 * Apply cookie preferences (enable/disable tracking scripts)
 */
function applyPreferences() {
  // Google Analytics
  if (preferences.value.analytics) {
    enableGoogleAnalytics()
  } else {
    disableGoogleAnalytics()
  }

  // Meta Pixel (Facebook/Instagram)
  if (preferences.value.advertising) {
    enableMetaPixel()
  } else {
    disableMetaPixel()
  }

  console.log('[Cookie Consent] Preferences applied:', preferences.value)
}

/**
 * Enable Google Analytics
 */
function enableGoogleAnalytics() {
  // Check if gtag is available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      'analytics_storage': 'granted'
    })
    console.log('[Cookie Consent] Google Analytics enabled')
  }
}

/**
 * Disable Google Analytics
 */
function disableGoogleAnalytics() {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      'analytics_storage': 'denied'
    })
    console.log('[Cookie Consent] Google Analytics disabled')
  }
}

/**
 * Enable Meta Pixel
 */
function enableMetaPixel() {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('consent', 'grant')
    console.log('[Cookie Consent] Meta Pixel enabled')
  }
}

/**
 * Disable Meta Pixel
 */
function disableMetaPixel() {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('consent', 'revoke')
    console.log('[Cookie Consent] Meta Pixel disabled')
  }
}

/**
 * Accept all cookies
 */
function acceptAll() {
  preferences.value = {
    essential: true,
    analytics: true,
    advertising: true
  }
  savePreferencesToStorage()
  applyPreferences()
  showBanner.value = false
}

/**
 * Save current preferences
 */
function savePreferences() {
  savePreferencesToStorage()
  applyPreferences()
  showBanner.value = false
}

/**
 * Reject all optional cookies
 */
function rejectAll() {
  preferences.value = {
    essential: true,
    analytics: false,
    advertising: false
  }
  savePreferencesToStorage()
  applyPreferences()
  showBanner.value = false
}

/**
 * Initialize on mount
 */
onMounted(() => {
  const hasConsent = loadPreferences()
  
  if (hasConsent) {
    // Apply saved preferences
    applyPreferences()
    showBanner.value = false
  } else {
    // Show banner if no consent given
    showBanner.value = true
  }
})

/**
 * Watch for preference changes (for live updates)
 */
watch(preferences, () => {
  if (consentGiven.value) {
    applyPreferences()
  }
}, { deep: true })
</script>

<style scoped>
/* Overlay */
.cookie-consent-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  pointer-events: none;
}

/* Banner */
.cookie-consent-banner {
  background: linear-gradient(135deg, #1a1a1d 0%, #2d2d30 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Content */
.cookie-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.cookie-title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 12px 0;
}

.cookie-description {
  font-size: 14px;
  color: #b0b0b0;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

/* Categories */
.cookie-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.cookie-category {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cookie-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #00b596;
}

.cookie-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.category-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}

.cookie-checkbox:disabled + .category-label {
  cursor: not-allowed;
}

.required-badge {
  background: rgba(0, 181, 150, 0.2);
  color: #00b596;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.category-description {
  font-size: 13px;
  color: #888;
  margin: 0;
  line-height: 1.5;
  padding-left: 32px;
}

/* Actions */
.cookie-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cookie-actions button {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-accept-all {
  background: linear-gradient(135deg, #00b596 0%, #00a88e 100%);
  color: #ffffff;
}

.btn-accept-all:hover {
  background: linear-gradient(135deg, #00a88e 0%, #009980 100%);
  transform: translateY(-1px);
}

.btn-save {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-save:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-reject {
  background: transparent;
  color: #888;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-reject:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #aaa;
}

/* Links */
.cookie-links {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.cookie-link {
  color: #00b596;
  text-decoration: none;
}

.cookie-link:hover {
  text-decoration: underline;
}

.separator {
  color: #666;
}

/* Settings Button */
.cookie-settings-btn {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.cookie-settings-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* Transitions */
.cookie-consent-enter-active,
.cookie-consent-leave-active {
  transition: all 0.3s ease;
}

.cookie-consent-enter-from,
.cookie-consent-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .cookie-content {
    padding: 20px 16px;
  }

  .cookie-title {
    font-size: 18px;
  }

  .cookie-description {
    font-size: 13px;
  }

  .cookie-actions {
    flex-direction: column;
  }

  .cookie-actions button {
    width: 100%;
  }

  .category-description {
    padding-left: 0;
    margin-top: 8px;
  }

  .cookie-settings-btn {
    bottom: 16px;
    left: 16px;
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}
</style>
