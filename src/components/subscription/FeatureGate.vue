<template>
  <div class="feature-gate">
    <!-- Show content if user has active subscription -->
    <slot v-if="hasAccess" />

    <!-- Show paywall if no access -->
    <div
      v-else
      class="paywall-overlay"
    >
      <div class="paywall-content">
        <div class="lock-icon">
          🔒
        </div>
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        
        <div
          v-if="isInTrial"
          class="trial-notice"
        >
          <p>✨ You have {{ daysRemaining }} days left in your free trial</p>
          <button
            class="btn-upgrade"
            @click="handleUpgrade"
          >
            Upgrade to Pro ($19/month)
          </button>
        </div>

        <div v-else>
          <button
            v-if="!isAuthenticated"
            class="btn-login"
            @click="handleLogin"
          >
            Sign In to Continue
          </button>
          <button
            v-else
            class="btn-upgrade"
            @click="handleUpgrade"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStripe } from '../../composables/useStripe'

interface Props {
  title?: string
  message?: string
  requireSubscription?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Premium Feature',
  message: 'This feature is only available to Datoro Pro subscribers. Upgrade now to unlock advanced analytics and insights.',
  requireSubscription: true
})

const authStore = useAuthStore()
const { createCheckoutSession } = useStripe()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const hasActiveSubscription = computed(() => authStore.hasActiveSubscription)
const isInTrial = computed(() => authStore.isInTrial)

// Check if user has access to the feature
const hasAccess = computed(() => {
  if (!props.requireSubscription) return true
  return hasActiveSubscription.value
})

// Calculate trial days remaining
const daysRemaining = computed(() => {
  const user = authStore.user
  if (!user?.subscription?.trialEndsAt) return 0
  const now = new Date()
  const end = new Date(user.subscription.trialEndsAt)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

function handleLogin() {
  window.location.href = '/login'
}

async function handleUpgrade() {
  await createCheckoutSession()
}
</script>

<style scoped>
.feature-gate {
  position: relative;
}

.paywall-overlay {
  position: relative;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paywall-content {
  max-width: 500px;
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.paywall-content h3 {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0 0 12px 0;
}

.paywall-content p {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.trial-notice {
  background: #e3f2fd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.trial-notice p {
  color: #1976d2;
  font-weight: 600;
  margin-bottom: 12px;
}

.btn-login,
.btn-upgrade {
  padding: 14px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-upgrade {
  background: #1976d2;
  color: white;
}

.btn-upgrade:hover {
  background: #1565c0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.btn-login {
  background: white;
  color: #1976d2;
  border: 2px solid #1976d2;
}

.btn-login:hover {
  background: #f5f5f5;
}
</style>
