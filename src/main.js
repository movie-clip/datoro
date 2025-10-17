import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/globals.css'
import { registerECharts } from './plugins/echarts'

registerECharts()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
