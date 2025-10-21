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
      host: '0.0.0.0', // Allow access from local network (iPhone, etc.)
      port: 5173,
      
      // Performance optimizations for dev server
      hmr: {
        overlay: false // Disable error overlay for faster HMR
      },
      
      // Enable faster dev server
      fs: {
        strict: true,
        allow: ['..'] // Allow serving files from parent directory
      },
      
      // Aggressive dev server optimizations
      warmup: {
        // Pre-transform critical modules on server start (Vite 5+)
        clientFiles: [
          './src/main.js',
          './src/App.vue',
          './src/stores/tickerStore.js',
          './src/composables/useTickerData.js',
          './src/services/financials/batchChartService.js',
          './src/services/financials/batchTableService.js'
        ]
      },

      proxy: {
        // FMP API - proxy to backend which injects API key
        '/api/fmp': {
          target: apiBaseUrl,
          changeOrigin: false,  // Don't change origin - preserve cookies
          cookieDomainRewrite: false,  // Don't rewrite cookie domain
          cookiePathRewrite: false,  // Don't rewrite cookie path
          // Don't rewrite - backend expects /api/fmp prefix
        },

        // Other /api routes - proxy to backend
        '/api': {
          target: apiBaseUrl,
          changeOrigin: false,  // Don't change origin - preserve cookies
          cookieDomainRewrite: false,  // Don't rewrite cookie domain
          cookiePathRewrite: false,  // Don't rewrite cookie path
        },
      },
    },
    
    // Optimize dependencies pre-bundling
    optimizeDeps: {
      // Force Vite to pre-bundle these modules (faster dev server)
      include: [
        'vue',
        'pinia',
        'echarts/core',
        'echarts/charts/LineChart',
        'echarts/charts/BarChart',
        'echarts/renderers/CanvasRenderer',
        'echarts/components/GridComponent',
        'echarts/components/TooltipComponent',
        'echarts/components/TitleComponent',
        'echarts/components/LegendComponent',
        'vue-echarts'
      ],
      exclude: [],
      // Enable esbuild optimization
      esbuildOptions: {
        target: 'es2020'
      }
    },

    // Production build optimization
    build: {
      // Target modern browsers for smaller output
      target: 'es2015',
      
      // Minify using terser for better control
      minify: 'terser',
      terserOptions: {
        compress: {
          // Remove all console.* calls in production
          drop_console: true,
          // Remove debugger statements
          drop_debugger: true,
          // Remove pure function calls (functions with no side effects)
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
          // Reduce dead code
          dead_code: true,
          // Optimize expressions
          passes: 2
        },
        format: {
          // Remove comments in production
          comments: false
        },
        mangle: {
          // Mangle variable names for smaller output
          safari10: true
        }
      },
      
      // No source maps in production for smaller builds
      sourcemap: false,
      
      // Chunk size warnings (raised for chart-heavy app)
      chunkSizeWarningLimit: 1000,
      
      // CSS code splitting for faster loads
      cssCodeSplit: true,
      
      // Optimize chunks for better caching and lazy loading
      rollupOptions: {
        output: {
          // Manual chunk splitting strategy
          manualChunks(id) {
            // Core Vue framework
            if (id.includes('node_modules/vue') || id.includes('node_modules/@vue') || id.includes('node_modules/pinia')) {
              return 'vue-vendor'
            }
            
            // ECharts library (large, separate chunk)
            if (id.includes('node_modules/echarts') || id.includes('node_modules/vue-echarts')) {
              return 'echarts-vendor'
            }
            
            // Chart.js (if still used)
            if (id.includes('node_modules/chart.js')) {
              return 'chartjs-vendor'
            }
            
            // All other node_modules
            if (id.includes('node_modules')) {
              return 'vendor'
            }
            
            // Lazy-loaded chart components stay as separate chunks (auto-split by Vite)
            // This enables optimal lazy loading per tab
          },
          
          // Asset file naming for better caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      
      // Enable CSS minification
      cssMinify: true,
      
      // Compress output with brotli if server supports it
      reportCompressedSize: true
    }
  }
})
