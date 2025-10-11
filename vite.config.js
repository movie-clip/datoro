// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  server: {
    host: 'localhost',
    port: 5173,

    proxy: {
      // FMP API - proxy to local backend (port 7071) which injects API key
      '/api/fmp': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        // Don't rewrite - backend expects /api/fmp prefix
      },

      // Other /api routes - proxy to local backend
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
})

