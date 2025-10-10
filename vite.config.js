import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // optional: strictPort: true,
    proxy: {
      // Yahoo query2 (fundamentals timeseries) — NO crumb needed
      '/y2api': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/y2api/, ''),
        // secure: false, // uncomment if corporate proxy TLS issues
      },
      // Yahoo query1 (price chart)
      '/yapi': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/yapi/, ''),
        // secure: false,
      },
      // Stooq CSV
      '/stooq': {
        target: 'https://stooq.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/stooq/, ''),
        // secure: false,
      },
      // Local backend (only needed for endpoints that require cookies/crumb)
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
})
