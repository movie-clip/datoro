<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useIsMobile } from '../../composables/useIsMobile'

type SentryWindow = Window & {
  Sentry?: {
    captureException: (error: Error, context: unknown) => void
  }
}

const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const { isMobile } = useIsMobile()

const showDetails = ref(false)

const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'

onErrorCaptured((err: Error, instance, info: string) => {
  error.value = err
  errorInfo.value = info
  
  // Log error details for debugging
  console.error('Error caught by boundary:', {
    error: err,
    message: err.message,
    stack: err.stack,
    info,
    component: instance?.$options?.name,
    isMobile: isMobile.value
  })
  
  // Send to monitoring service if available
  const sentryWindow = window as SentryWindow
  if (typeof window !== 'undefined' && sentryWindow.Sentry) {
    sentryWindow.Sentry.captureException(err, {
      contexts: {
        vue: {
          componentName: instance?.$options?.name,
          errorInfo: info,
          isMobile: isMobile.value
        }
      }
    })
  }
  
  // Prevent error from propagating
  return false
})

const reload = () => {
  window.location.reload()
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<template>
  <div
    v-if="error"
    class="error-boundary"
    :class="{ 'mobile': isMobile }"
  >
    <div class="error-container">
      <div class="error-icon">
        ⚠️
      </div>
      <h2 class="error-title">
        Oops! Something went wrong
      </h2>
      <p class="error-message">
        {{ error.message || 'An unexpected error occurred' }}
      </p>
      
      <div class="error-actions">
        <button
          class="btn-reload"
          @click="reload"
        >
          🔄 Reload Page
        </button>
        <button
          class="btn-details"
          @click="toggleDetails"
        >
          {{ showDetails ? '▲ Hide Details' : '▼ Show Details' }}
        </button>
      </div>
      
      <div
        v-if="showDetails"
        class="error-details"
      >
        <h3>Error Details:</h3>
        <pre>{{ error.stack }}</pre>
        <p v-if="errorInfo">
          <strong>Component Info:</strong> {{ errorInfo }}
        </p>
        <p><strong>Device:</strong> {{ isMobile ? 'Mobile' : 'Desktop' }}</p>
        <p><strong>User Agent:</strong> {{ userAgent }}</p>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.error-container {
  max-width: 600px;
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.error-title {
  font-size: 28px;
  font-weight: 600;
  color: #f87171;
  margin-bottom: 12px;
}

.error-message {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.btn-reload,
.btn-details {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  min-width: 140px;
}

.btn-reload {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-reload:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-details {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-details:hover {
  background: rgba(255, 255, 255, 0.15);
}

.error-details {
  margin-top: 24px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  text-align: left;
  max-height: 300px;
  overflow-y: auto;
}

.error-details h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fbbf24;
  margin-bottom: 12px;
}

.error-details pre {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 12px;
  font-family: 'Courier New', monospace;
  line-height: 1.4;
}

.error-details p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.error-details strong {
  color: #60a5fa;
  font-weight: 600;
}

/* Mobile-specific adjustments */
.error-boundary.mobile .error-container {
  padding: 24px 16px;
}

.error-boundary.mobile .error-title {
  font-size: 24px;
}

.error-boundary.mobile .error-message {
  font-size: 14px;
}

.error-boundary.mobile .error-icon {
  font-size: 48px;
}

.error-boundary.mobile .btn-reload,
.error-boundary.mobile .btn-details {
  min-width: 120px;
  padding: 10px 20px;
  font-size: 14px;
  /* Ensure touch targets are at least 44x44px */
  min-height: 44px;
}

.error-boundary.mobile .error-actions {
  flex-direction: column;
}

.error-boundary.mobile .btn-reload,
.error-boundary.mobile .btn-details {
  width: 100%;
}

/* Scrollbar styling for details */
.error-details::-webkit-scrollbar {
  width: 6px;
}

.error-details::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.error-details::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.error-details::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>
