import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/globals.css'

// Lazy load ECharts registration - only when needed
let echartsRegistrationPromise = null

// Force rebuild: Chart data fix deployed
export function ensureEChartsRegistered() {
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

app.use(pinia)
app.mount('#app')
