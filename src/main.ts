import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/globals.css'

// Lazy load ECharts registration - only when needed
let echartsRegistrationPromise: Promise<boolean> | null = null

// Force rebuild: Chart data fix deployed
export function ensureEChartsRegistered(): Promise<boolean> {
  if (!echartsRegistrationPromise) {
    echartsRegistrationPromise = import('./plugins/echarts').then(module => {
      module.registerECharts()
      return true
    })
  }
  return echartsRegistrationPromise
}

const app = createApp(App)
const pinia = createPinia()

import { VueQueryPlugin } from '@tanstack/vue-query'

app.use(pinia)
app.use(VueQueryPlugin)

// Add global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err, info)
  console.error('Component:', instance)
}

// Catch mount errors
try {
  app.mount('#app')
  console.log('App mounted successfully')
} catch (err) {
  console.error('Failed to mount app:', err)
  // Show error to user
  const appDiv = document.getElementById('app')
  if (appDiv) {
    appDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 32px; max-width: 500px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h2 style="color: #f87171; margin-bottom: 12px;">Failed to Load</h2>
          <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 24px;">${err instanceof Error ? err.message : 'Unknown error occurred'}</p>
          <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px;">Reload Page</button>
        </div>
      </div>
    `
  }
}
