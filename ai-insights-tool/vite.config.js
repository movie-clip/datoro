import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:7072',
        changeOrigin: true
      }
    },
    watch: {
      ignored: ['**/venv/**', '**/output/**', '**/*.py', '**/*.pyc']
    }
  },
  optimizeDeps: {
    exclude: ['venv']
  }
})
