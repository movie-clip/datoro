<template>
  <div class="pricing-card">
    <div class="card-header">
      <h2>Datoro Pro</h2>
      <div class="price">
        <span class="currency">$</span>
        <span class="amount">{{ price }}</span>
        <span class="period">/month</span>
      </div>
      <p class="trial-info">
        {{ trialDays }}-day free trial included
      </p>
    </div>

    <div class="features">
      <h3>Includes:</h3>
      <ul>
        <li
          v-for="feature in features"
          :key="feature"
        >
          <span class="checkmark">✓</span>
          {{ feature }}
        </li>
      </ul>
    </div>

    <button 
      :disabled="loading || !canSubscribe" 
      class="subscribe-btn"
      @click="handleSubscribe"
    >
      {{ buttonText }}
    </button>

    <p
      v-if="error"
      class="error-message"
    >
      {{ error }}
    </p>

    <p class="terms">
      Cancel anytime. No long-term contracts.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStripe } from '../../composables/useStripe'

interface Props {
  price?: number
  trialDays?: number
  features?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  price: 19,
  trialDays: 30,
  features: () => [
    'Unlimited stock analysis',
    'Real-time financial data',
    'Advanced charting tools',
    'AI-powered insights',
    'Custom watchlists',
    'Priority support'
  ]
})

const authStore = useAuthStore()
const { loading, error, createCheckoutSession } = useStripe()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const hasActiveSubscription = computed(() => authStore.hasActiveSubscription)

const canSubscribe = computed(() => {
  return isAuthenticated.value && !hasActiveSubscription.value
})

const buttonText = computed(() => {
  if (loading.value) return 'Loading...'
  if (!isAuthenticated.value) return 'Sign in to Subscribe'
  if (hasActiveSubscription.value) return 'Already Subscribed'
  return `Start ${props.trialDays}-Day Free Trial`
})

async function handleSubscribe() {
  if (!isAuthenticated.value) {
    // Redirect to login page
    window.location.href = '/login'
    return
  }

  if (hasActiveSubscription.value) {
    // Already subscribed, maybe redirect to account page
    window.location.href = '/account'
    return
  }

  // Create checkout session
  await createCheckoutSession()
}
</script>

<style scoped>
.pricing-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: 0 auto;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.card-header h2 {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1976d2;
}

.price {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin: 16px 0;
}

.currency {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-right: 4px;
  margin-top: 8px;
}

.amount {
  font-size: 56px;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.period {
  font-size: 18px;
  color: #666;
  margin-left: 8px;
  align-self: flex-end;
  margin-bottom: 12px;
}

.trial-info {
  color: #2e7d32;
  font-weight: 600;
  font-size: 16px;
  margin: 8px 0 0 0;
}

.features {
  margin: 24px 0;
}

.features h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #333;
}

.features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features li {
  padding: 12px 0;
  display: flex;
  align-items: center;
  color: #555;
  font-size: 15px;
}

.checkmark {
  color: #2e7d32;
  font-weight: 700;
  margin-right: 12px;
  font-size: 18px;
}

.subscribe-btn {
  width: 100%;
  padding: 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 24px;
}

.subscribe-btn:hover:not(:disabled) {
  background: #1565c0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.subscribe-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.terms {
  text-align: center;
  color: #666;
  font-size: 13px;
  margin-top: 16px;
}
</style>
