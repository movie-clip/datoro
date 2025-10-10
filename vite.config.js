// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// A reasonable browser UA helps avoid upstream blocks
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export default defineConfig({
  plugins: [vue()],

  server: {
    host: 'localhost',
    port: 5173,
    // strictPort: true,

    proxy: {
      // Yahoo query1 (quotes, charts, v7 APIs)
      '/yapi': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/yapi/, ''),
        headers: {
          'user-agent': UA,
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'en-US,en;q=0.9',
          'referer': 'https://finance.yahoo.com/',
        },
        // secure: false, // uncomment if your network MITMs TLS
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('user-agent', UA)
            proxyReq.setHeader('referer', 'https://finance.yahoo.com/')
            proxyReq.setHeader('accept', 'application/json, text/plain, */*')
            proxyReq.setHeader('accept-language', 'en-US,en;q=0.9')
          })
        },
      },

      // Yahoo query2 (fundamentals timeseries: revenue, FCF, EBITDA, etc.)
      '/y2api': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/y2api/, ''),
        headers: {
          'user-agent': UA,
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'en-US,en;q=0.9',
          'referer': 'https://finance.yahoo.com/',
        },
        // secure: false,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('user-agent', UA)
            proxyReq.setHeader('referer', 'https://finance.yahoo.com/')
            proxyReq.setHeader('accept', 'application/json, text/plain, */*')
            proxyReq.setHeader('accept-language', 'en-US,en;q=0.9')
          })
        },
      },

      // Stooq CSV (price fallback)
      '/stooq': {
        target: 'https://stooq.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/stooq/, ''),
        // secure: false,
      },

      // Your local backend (crumb/cookie proxy, optional)
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },

      '/fmp': {
      target: 'https://financialmodelingprep.com',
      changeOrigin: true,
      rewrite: p => p.replace(/^\/fmp/, ''),
      },

    },
  },
})

