/**
 * Stripe Composable
 * Frontend integration with Stripe Checkout and Customer Portal
 */

import { ref, computed } from 'vue'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useAuthStore } from '../stores/authStore'

// Stripe instance (singleton)
let stripePromise: Promise<Stripe | null> | null = null

interface StripeConfig {
  publishableKey: string
}

interface CheckoutSession {
  sessionId: string
  url: string
}

export function useStripe() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const publishableKey = ref<string | null>(null)

  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const hasActiveSubscription = computed(() => authStore.hasActiveSubscription)

  /**
   * Initialize Stripe by loading publishable key from backend
   */
  async function initializeStripe(): Promise<Stripe | null> {
    try {
      // Get publishable key from backend
      if (!publishableKey.value) {
        const response = await fetch('/api/subscription/config')
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe config')
        }
        const config: StripeConfig = await response.json()
        publishableKey.value = config.publishableKey
      }

      // Load Stripe.js
      if (!stripePromise) {
        stripePromise = loadStripe(publishableKey.value!)
      }

      return await stripePromise
    } catch (err: any) {
      console.error('[Stripe] Initialization error:', err)
      error.value = err.message || 'Failed to initialize Stripe'
      return null
    }
  }

  /**
   * Create Stripe Checkout session and redirect to checkout
   */
  async function createCheckoutSession(): Promise<void> {
    if (!isAuthenticated.value) {
      error.value = 'You must be logged in to subscribe'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Create checkout session (using HttpOnly cookie for auth)
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Send HttpOnly cookie
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const session: CheckoutSession = await response.json()

      // Redirect to Stripe Checkout URL
      // Note: Modern Stripe Checkout uses direct URL redirect instead of redirectToCheckout
      if (session.url) {
        window.location.href = session.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('[Stripe] Checkout error:', err)
      error.value = err.message || 'Failed to start checkout'
    } finally {
      loading.value = false
    }
  }

  /**
   * Open Stripe Customer Portal for subscription management
   */
  async function openCustomerPortal(): Promise<void> {
    if (!isAuthenticated.value) {
      error.value = 'You must be logged in to manage subscription'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Create portal session (using HttpOnly cookie for auth)
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Send HttpOnly cookie
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to open customer portal')
      }

      const { url } = await response.json()

      // Redirect to Stripe Customer Portal
      window.location.href = url
    } catch (err: any) {
      console.error('[Stripe] Portal error:', err)
      error.value = err.message || 'Failed to open customer portal'
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancel subscription at period end
   */
  async function cancelSubscription(): Promise<boolean> {
    if (!isAuthenticated.value) {
      error.value = 'You must be logged in to cancel subscription'
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Cancel subscription (using HttpOnly cookie for auth)
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Send HttpOnly cookie
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel subscription')
      }

      // Refresh user data to get updated subscription status
      await authStore.checkAuth()

      return true
    } catch (err: any) {
      console.error('[Stripe] Cancel error:', err)
      error.value = err.message || 'Failed to cancel subscription'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Resume a canceled subscription
   */
  async function resumeSubscription(): Promise<boolean> {
    if (!isAuthenticated.value) {
      error.value = 'You must be logged in to resume subscription'
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Resume subscription (using HttpOnly cookie for auth)
      const response = await fetch('/api/subscription/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Send HttpOnly cookie
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resume subscription')
      }

      // Refresh user data to get updated subscription status
      await authStore.checkAuth()

      return true
    } catch (err: any) {
      console.error('[Stripe] Resume error:', err)
      error.value = err.message || 'Failed to resume subscription'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    error,
    isAuthenticated,
    hasActiveSubscription,

    // Methods
    initializeStripe,
    createCheckoutSession,
    openCustomerPortal,
    cancelSubscription,
    resumeSubscription
  }
}
