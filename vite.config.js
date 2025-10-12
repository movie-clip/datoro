// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:7071'

  return {
    plugins: [vue()],

    server: {
      host: 'localhost',
      port: 5173,

      proxy: {
        // FMP API - proxy to backend which injects API key
        '/api/fmp': {
          target: apiBaseUrl,
          changeOrigin: true,
          // Don't rewrite - backend expects /api/fmp prefix
        },

        // Other /api routes - proxy to backend
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },

    // Production build optimization
    build: {
      // Minify using terser for better control
      minify: 'terser',
      terserOptions: {
        compress: {
          // Remove all console.* calls in production
          drop_console: true,
          // Remove debugger statements
          drop_debugger: true,
          // Remove pure function calls (functions with no side effects)
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace']
        },
        format: {
          // Remove comments in production
          comments: false
        }
      },
      // Enable source maps for production debugging (optional - disable for smaller builds)
      sourcemap: false,
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Optimize chunks
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'vue-vendor': ['vue'],
            'charts': ['echarts', 'vue-echarts', 'chart.js']
          }
        }
      }
    }
  }
})
