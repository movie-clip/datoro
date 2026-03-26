<template>
  <Transition name="cookie-consent">
    <div
      v-if="showBanner"
      class="cookie-overlay"
    >
      <div class="cookie-panel">
        <!-- Header -->
        <div class="cookie-header">
          <h2 class="cookie-title">
            Your Privacy
          </h2>
          <p class="cookie-subtitle">
            We use cookies to improve your experience and analyze site traffic.
          </p>
        </div>

        <!-- Cookie Categories (Compact List) -->
        <div class="cookie-list">
          <!-- Essential -->
          <div class="cookie-item">
            <div class="cookie-item-left">
              <div class="checkbox-wrapper">
                <input 
                  id="essential" 
                  type="checkbox" 
                  checked 
                  disabled
                  class="cookie-check"
                >
                <label
                  for="essential"
                  class="cookie-label"
                >
                  Essential
                  <span class="badge-required">Always Active</span>
                </label>
              </div>
              <p class="cookie-desc">
                Required for site functionality
              </p>
            </div>
          </div>

          <!-- Analytics -->
          <div class="cookie-item">
            <div class="cookie-item-left">
              <div class="checkbox-wrapper">
                <input 
                  id="analytics" 
                  v-model="preferences.analytics" 
                  type="checkbox"
                  class="cookie-check"
                >
                <label
                  for="analytics"
                  class="cookie-label"
                >Analytics</label>
              </div>
              <p class="cookie-desc">
                Help us improve user experience
              </p>
            </div>
          </div>

          <!-- Advertising -->
          <div class="cookie-item">
            <div class="cookie-item-left">
              <div class="checkbox-wrapper">
                <input 
                  id="advertising" 
                  v-model="preferences.advertising" 
                  type="checkbox"
                  class="cookie-check"
                >
                <label
                  for="advertising"
                  class="cookie-label"
                >Advertising</label>
              </div>
              <p class="cookie-desc">
                Personalized ads and analytics
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="cookie-footer">
          <div class="cookie-actions">
            <button
              class="btn btn-secondary"
              @click="rejectAll"
            >
              Reject all
            </button>
            <button
              class="btn btn-primary"
              @click="acceptAll"
            >
              Accept all
            </button>
          </div>
          <div class="cookie-links">
            <a
              href="/privacy"
              class="link"
            >Privacy</a>
            <span class="dot">•</span>
            <a
              href="/cookies"
              class="link"
            >Cookies</a>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Settings Icon (Always Visible) -->
  <button 
    v-if="!showBanner && consentGiven" 
    class="cookie-icon" 
    title="Cookie Settings"
    aria-label="Cookie Settings"
    @click="showBanner = true"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M12 1v6m0 6v6m5.2-13.2l-3.5 3.5m-3.4 3.4l-3.5 3.5m13.2.2h-6m-6 0H1m13.2-5.2l-3.5-3.5m-3.4-3.4l-3.5-3.5" />
    </svg>
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

  console.info('[Cookie Consent] Preferences applied:', preferences.value)
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
    console.info('[Cookie Consent] Google Analytics enabled')
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
    console.info('[Cookie Consent] Google Analytics disabled')
  }
}

/**
 * Enable Meta Pixel
 */
function enableMetaPixel() {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('consent', 'grant')
    console.info('[Cookie Consent] Meta Pixel enabled')
  }
}

/**
 * Disable Meta Pixel
 */
function disableMetaPixel() {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('consent', 'revoke')
    console.info('[Cookie Consent] Meta Pixel disabled')
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
/* Overlay - Full screen dark backdrop */
.cookie-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Panel - YouTube style card */
.cookie-panel {
  background: #212121;
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Header */
.cookie-header {
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.cookie-title {
  font-size: 20px;
  font-weight: 500;
  color: #fff;
  margin: 0 0 8px 0;
  letter-spacing: -0.2px;
}

.cookie-subtitle {
  font-size: 14px;
  color: #aaa;
  margin: 0;
  line-height: 1.5;
}

/* Cookie List */
.cookie-list {
  padding: 4px 0;
}

.cookie-item {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.15s ease;
}

.cookie-item:last-child {
  border-bottom: none;
}

.cookie-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.cookie-item-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Custom Checkbox - YouTube style */
.cookie-check {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #717171;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.cookie-check:hover {
  border-color: #aaa;
}

.cookie-check:checked {
  background: #3ea6ff;
  border-color: #3ea6ff;
}

.cookie-check:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.cookie-check:disabled {
  background: #3ea6ff;
  border-color: #3ea6ff;
  cursor: not-allowed;
  opacity: 0.6;
}

.cookie-check:disabled::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* Label */
.cookie-label {
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.cookie-check:disabled + .cookie-label {
  cursor: not-allowed;
}

.badge-required {
  font-size: 11px;
  color: #aaa;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
}

/* Description */
.cookie-desc {
  font-size: 12px;
  color: #888;
  margin: 0;
  padding-left: 30px;
  line-height: 1.4;
}

/* Footer */
.cookie-footer {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cookie-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Buttons - YouTube style */
.btn {
  padding: 10px 16px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  min-width: 100px;
}

.btn-secondary {
  background: transparent;
  color: #3ea6ff;
  border: 1px solid rgba(62, 166, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(62, 166, 255, 0.1);
  border-color: rgba(62, 166, 255, 0.5);
}

.btn-primary {
  background: #3ea6ff;
  color: #0f0f0f;
}

.btn-primary:hover {
  background: #5ab0ff;
}

.btn-primary:active {
  background: #2e9cff;
}

/* Links */
.cookie-links {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 13px;
}

.link {
  color: #3ea6ff;
  text-decoration: none;
  transition: color 0.15s ease;
}

.link:hover {
  color: #5ab0ff;
}

.dot {
  color: #555;
}

/* Settings Icon - Floating button */
.cookie-icon {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(33, 33, 33, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.cookie-icon:hover {
  background: rgba(62, 166, 255, 0.15);
  border-color: rgba(62, 166, 255, 0.3);
  color: #3ea6ff;
  transform: scale(1.05);
}

.cookie-icon svg {
  flex-shrink: 0;
}

/* Transitions */
.cookie-consent-enter-active,
.cookie-consent-leave-active {
  transition: opacity 0.2s ease;
}

.cookie-consent-enter-from,
.cookie-consent-leave-to {
  opacity: 0;
}

.cookie-consent-enter-active .cookie-panel,
.cookie-consent-leave-active .cookie-panel {
  transition: all 0.3s ease;
}

.cookie-consent-enter-from .cookie-panel,
.cookie-consent-leave-to .cookie-panel {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .cookie-overlay {
    padding: 16px;
    align-items: flex-end;
  }

  .cookie-panel {
    max-width: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .cookie-header {
    padding: 20px 20px 16px;
  }

  .cookie-title {
    font-size: 18px;
  }

  .cookie-subtitle {
    font-size: 13px;
  }

  .cookie-item {
    padding: 14px 20px;
  }

  .cookie-footer {
    padding: 16px 20px 20px;
  }

  .cookie-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .btn {
    width: 100%;
    padding: 12px 16px;
  }

  .cookie-icon {
    bottom: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
  }

  .cookie-icon svg {
    width: 18px;
    height: 18px;
  }
}

/* Landscape mobile */
@media (max-width: 768px) and (orientation: landscape) {
  .cookie-overlay {
    align-items: center;
  }

  .cookie-panel {
    border-radius: 12px;
  }
}
</style>
