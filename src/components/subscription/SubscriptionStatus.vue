<template>
  <div class="subscription-status">
    <!-- Loading State -->
    <div
      v-if="!user"
      class="status-loading"
    >
      <div class="spinner" />
      <p>Loading subscription...</p>
    </div>

    <!-- No Subscription (should not happen - all users have subscriptions) -->
    <div
      v-else-if="!user.subscription"
      class="status-error"
    >
      <p>No subscription found. Please contact support.</p>
    </div>

    <!-- Active Trial -->
    <div
      v-else-if="isInTrial && !isTrialExpired"
      class="status-trial"
    >
      <div class="status-header">
        <h3>Free Trial Active</h3>
        <span class="status-badge trial">Trial</span>
      </div>
      
      <p class="trial-message">
        You have <strong>{{ daysRemaining }} days</strong> remaining in your free trial.
      </p>
      
      <div class="trial-details">
        <p v-if="user.subscription.trialEndsAt">
          <strong>Trial ends:</strong> {{ formatDate(user.subscription.trialEndsAt) }}
        </p>
        <p class="trial-note">
          Upgrade to Pro to continue enjoying premium features after your trial ends.
        </p>
      </div>

      <button
        class="btn-primary"
        :disabled="loading"
        @click="handleUpgrade"
      >
        {{ loading ? 'Loading...' : 'Upgrade to Pro ($19/month)' }}
      </button>
    </div>

    <!-- Expired Trial -->
    <div
      v-else-if="isInTrial && isTrialExpired"
      class="status-expired"
    >
      <div class="status-header">
        <h3>Trial Expired</h3>
        <span class="status-badge expired">Expired</span>
      </div>
      
      <p>Your free trial has ended. Upgrade to Pro to continue accessing premium features.</p>

      <button
        class="btn-primary"
        :disabled="loading"
        @click="handleUpgrade"
      >
        {{ loading ? 'Loading...' : 'Upgrade to Pro ($19/month)' }}
      </button>
    </div>

    <!-- Active Paid Subscription -->
    <div
      v-else-if="user.subscription.status === 'ACTIVE'"
      class="status-active"
    >
      <div class="status-header">
        <h3>Datoro Pro</h3>
        <span class="status-badge active">Active</span>
      </div>
      
      <div class="subscription-details">
        <p><strong>Plan:</strong> Pro ($19/month)</p>
        <p v-if="user.subscription.currentPeriodEnd">
          <strong>Next billing:</strong> {{ formatDate(user.subscription.currentPeriodEnd) }}
        </p>
        <p
          v-if="user.subscription.cancelAtPeriodEnd && user.subscription.currentPeriodEnd"
          class="cancel-notice"
        >
          ⚠️ Your subscription will be canceled on {{ formatDate(user.subscription.currentPeriodEnd) }}
        </p>
      </div>

      <div class="action-buttons">
        <button
          class="btn-secondary"
          :disabled="loading"
          @click="handleManageSubscription"
        >
          {{ loading ? 'Loading...' : 'Manage Subscription' }}
        </button>
        
        <button 
          v-if="user.subscription.cancelAtPeriodEnd" 
          class="btn-primary" 
          :disabled="loading" 
          @click="handleResume"
        >
          {{ loading ? 'Loading...' : 'Resume Subscription' }}
        </button>
      </div>
    </div>

    <!-- Other Status (Past Due, Canceled, etc.) -->
    <div
      v-else
      class="status-inactive"
    >
      <div class="status-header">
        <h3>Subscription Issue</h3>
        <span class="status-badge inactive">{{ user.subscription.status }}</span>
      </div>
      
      <p>There's an issue with your subscription. Please update your payment method.</p>

      <button
        class="btn-primary"
        :disabled="loading"
        @click="handleManageSubscription"
      >
        {{ loading ? 'Loading...' : 'Update Payment Method' }}
      </button>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="error-message"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStripe } from '../../composables/useStripe'

const authStore = useAuthStore()
const { loading, error, createCheckoutSession, openCustomerPortal, resumeSubscription } = useStripe()

const user = computed(() => authStore.user)
const isInTrial = computed(() => authStore.isInTrial)

// Calculate trial expiry
const isTrialExpired = computed(() => {
  if (!user.value?.subscription?.trialEndsAt) return false
  return new Date(user.value.subscription.trialEndsAt) < new Date()
})

const daysRemaining = computed(() => {
  if (!user.value?.subscription?.trialEndsAt) return 0
  const now = new Date()
  const end = new Date(user.value.subscription.trialEndsAt)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

// Format date helper
function formatDate(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Actions
async function handleUpgrade() {
  await createCheckoutSession()
}

async function handleManageSubscription() {
  await openCustomerPortal()
}

async function handleResume() {
  const success = await resumeSubscription()
  if (success) {
    // User data will be refreshed automatically by composable
  }
}
</script>

<style scoped>
.subscription-status {
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #E5E5E5;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.trial {
  background: rgba(0, 168, 142, 0.15);
  color: #00A88E;
}

.status-badge.active {
  background: rgba(0, 168, 142, 0.15);
  color: #00A88E;
}

.status-badge.expired,
.status-badge.inactive {
  background: rgba(255, 82, 82, 0.15);
  color: #FF5252;
}

.trial-message {
  font-size: 15px;
  margin: 12px 0;
  color: #E5E5E5;
}

.trial-message strong {
  color: #00A88E;
}

.trial-details {
  background: rgba(0, 89, 76, 0.1);
  border: 1px solid rgba(0, 168, 142, 0.2);
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
}

.trial-details p {
  margin: 8px 0;
  color: #E5E5E5;
}

.trial-details strong {
  color: #00A88E;
}

.trial-note {
  color: #9E9E9E;
  font-size: 14px;
}

.subscription-details {
  margin: 16px 0;
}

.subscription-details p {
  margin: 8px 0;
  color: #E5E5E5;
}

.subscription-details strong {
  color: #00A88E;
}

.cancel-notice {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  padding: 12px;
  border-radius: 6px;
  color: #FF9800;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 14px;
}

.btn-primary {
  background: linear-gradient(135deg, #00A88E 0%, #00594C 100%);
  color: white;
  border: 1px solid #00594C;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #00594C 0%, #003D35 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 142, 0.3);
}

.btn-secondary {
  background: transparent;
  color: #00A88E;
  border: 2px solid #00A88E;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(0, 168, 142, 0.1);
  border-color: #00594C;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 82, 82, 0.1);
  border: 1px solid rgba(255, 82, 82, 0.3);
  color: #FF5252;
  border-radius: 6px;
  font-size: 14px;
}

.status-loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #00A88E;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-loading p {
  color: #9E9E9E;
}

.status-error,
.status-trial,
.status-expired,
.status-active,
.status-inactive {
  color: #E5E5E5;
}

.status-error {
  text-align: center;
  padding: 24px;
  color: #FF5252;
}
</style>
