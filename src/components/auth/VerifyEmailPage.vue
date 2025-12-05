<template>
  <div class="verify-email-page">
    <!-- Loading State -->
    <div
      v-if="status === 'verifying'"
      class="verify-card"
    >
      <div class="spinner" />
      <h2>Verifying Your Email...</h2>
      <p>Please wait while we confirm your email address.</p>
    </div>

    <!-- Success State -->
    <div
      v-else-if="status === 'success'"
      class="verify-card success"
    >
      <div class="icon-check">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2>Email Verified Successfully!</h2>
      <p>Your email has been confirmed. You can now access all features.</p>
      <button
        class="btn-primary"
        @click="closeAndLogin"
      >
        Continue to App
      </button>
    </div>

    <!-- Error State -->
    <div
      v-else-if="status === 'error'"
      class="verify-card error"
    >
      <div class="icon-error">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2>Verification Failed</h2>
      <p>{{ errorMessage }}</p>
      <div
        v-if="canResend"
        class="resend-section"
      >
        <p class="resend-hint">
          Need a new verification link?
        </p>
        <button 
          :disabled="resendLoading" 
          class="btn-secondary"
          @click="resendEmail"
        >
          {{ resendLoading ? 'Sending...' : 'Resend Verification Email' }}
        </button>
        <p
          v-if="resendSuccess"
          class="success-message"
        >
          ✓ Verification email sent! Please check your inbox.
        </p>
      </div>
      <button
        class="btn-text"
        @click="close"
      >
        Back to App
      </button>
    </div>

    <!-- Pending State (for when user just registered) -->
    <div
      v-else-if="status === 'pending'"
      class="verify-card pending"
    >
      <div class="icon-mail">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2>Check Your Email</h2>
      <p>We've sent a verification link to <strong>{{ userEmail }}</strong></p>
      <p class="verify-hint">
        Click the link in the email to verify your account.
      </p>
      
      <div class="tips">
        <h3>Didn't receive the email?</h3>
        <ul>
          <li>Check your spam/junk folder</li>
          <li>Make sure {{ userEmail }} is correct</li>
          <li>Wait a few minutes for delivery</li>
        </ul>
      </div>

      <button 
        :disabled="resendLoading || cooldownSeconds > 0" 
        class="btn-secondary"
        @click="resendEmail"
      >
        {{ resendLoading ? 'Sending...' : cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend Verification Email' }}
      </button>
      <p
        v-if="resendSuccess"
        class="success-message"
      >
        ✓ Email sent! Check your inbox.
      </p>

      <button
        class="btn-text"
        @click="close"
      >
        I'll verify later
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { trackEmailVerification } from '../../services/analytics/gaService'

interface Props {
  token?: string
  mode?: 'verify' | 'pending'
  email?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'pending'
})

const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()

const status = ref<'verifying' | 'success' | 'error' | 'pending'>(props.mode === 'pending' ? 'pending' : 'verifying')
const errorMessage = ref('The verification link is invalid or has expired.')
const canResend = ref(false)
const userEmail = ref(props.email || authStore.user?.email || '')
const resendLoading = ref(false)
const resendSuccess = ref(false)
const cooldownSeconds = ref(0)

let cooldownInterval: number | null = null

const close = () => {
  emit('close')
}

const closeAndLogin = () => {
  // Refresh auth state
  authStore.checkAuth()
  emit('close')
}

const verifyEmail = async () => {
  if (!props.token) {
    status.value = 'error'
    errorMessage.value = 'No verification token provided'
    return
  }

  try {
    status.value = 'verifying'
    
    const response = await fetch(`/api/auth/verify-email/${props.token}`)
    const data = await response.json()

    if (data.success) {
      status.value = 'success'
      
      // Track successful email verification in GA4
      trackEmailVerification()
      
      // Update auth store with verified user
      if (data.data?.user) {
        authStore.user = data.data.user
      }
    } else {
      status.value = 'error'
      errorMessage.value = data.error || 'Verification failed'
      canResend.value = true
      
      // Try to get email from error response or current user
      if (!userEmail.value) {
        userEmail.value = authStore.user?.email || ''
      }
    }
  } catch (error: any) {
    console.error('Verification error:', error)
    status.value = 'error'
    errorMessage.value = 'Network error. Please try again.'
    canResend.value = true
  }
}

const resendEmail = async () => {
  if (!userEmail.value) {
    alert('Email address not found. Please log in and try again.')
    return
  }

  try {
    resendLoading.value = true
    resendSuccess.value = false
    
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail.value })
    })

    const data = await response.json()

    if (data.success) {
      resendSuccess.value = true
      
      // Start 60-second cooldown
      cooldownSeconds.value = 60
      cooldownInterval = window.setInterval(() => {
        cooldownSeconds.value--
        if (cooldownSeconds.value <= 0 && cooldownInterval) {
          clearInterval(cooldownInterval)
          cooldownInterval = null
        }
      }, 1000)
    } else {
      alert(data.error || 'Failed to resend email. Please try again.')
    }
  } catch (error) {
    console.error('Resend error:', error)
    alert('Network error. Please try again.')
  } finally {
    resendLoading.value = false
  }
}

onMounted(() => {
  if (props.mode === 'verify' && props.token) {
    verifyEmail()
  }
})

// Cleanup interval on unmount
const cleanup = () => {
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }
}

// Vue 3 way to handle unmount
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(cleanup)
</script>

<style scoped>
.verify-email-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.verify-card {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #333;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon-check,
.icon-error,
.icon-mail {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-check {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.icon-mail {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.icon-check svg,
.icon-error svg,
.icon-mail svg {
  width: 32px;
  height: 32px;
  stroke-width: 2.5;
}

h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #fff;
}

p {
  color: #a0a0a0;
  margin-bottom: 24px;
  line-height: 1.6;
}

strong {
  color: #3b82f6;
  font-weight: 500;
}

.verify-hint {
  font-size: 14px;
  color: #808080;
}

.tips {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin: 24px 0;
  text-align: left;
}

.tips h3 {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 12px;
}

.tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips li {
  font-size: 14px;
  color: #a0a0a0;
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
}

.tips li:before {
  content: '•';
  color: #3b82f6;
  position: absolute;
  left: 0;
}

.resend-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #333;
}

.resend-hint {
  font-size: 14px;
  margin-bottom: 16px;
}

.btn-primary,
.btn-secondary,
.btn-text {
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  margin: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  border: 1px solid #3b82f6;
  color: #3b82f6;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.1);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-text {
  background: transparent;
  color: #808080;
  padding: 8px 16px;
}

.btn-text:hover {
  color: #a0a0a0;
}

.success-message {
  color: #22c55e;
  font-size: 14px;
  margin-top: 12px;
}

@media (max-width: 640px) {
  .verify-card {
    padding: 32px 24px;
  }

  h2 {
    font-size: 20px;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    margin: 8px 0;
  }
}
</style>
