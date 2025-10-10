import { createApp } from 'vue'
import App from './App.vue'
import './styles/globals.css'
import { registerECharts } from './plugins/echarts'

registerECharts()
createApp(App).mount('#app')
