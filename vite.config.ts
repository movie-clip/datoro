// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { Plugin, ProxyOptions } from 'vite'

/**
 * Custom plugin to add aggressive caching headers for static assets in dev
 * This fixes slow 304 responses (240-260ms) for images
 */
function staticAssetCachingPlugin(): Plugin {
  return {
    name: 'static-asset-caching',
    configureServer(server) {
      // Add middleware to set caching headers for static assets
      server.middlewares.use((req, res, next) => {
        // Match static assets (images, fonts, etc.)
        const isStaticAsset = req.url?.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i)
        
        if (isStaticAsset) {
          // Intercept writeHead to add cache headers
          const originalWriteHead = res.writeHead
          // @ts-ignore - Complex type overload for writeHead
          res.writeHead = function(this: any, ...args: unknown[]): any {
            // Set aggressive caching for static assets
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            // @ts-ignore
            return originalWriteHead.apply(this, args)
          }
        }
        
        next()
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:7071'

  return {
    plugins: [
      staticAssetCachingPlugin(), // Add caching headers for static assets
      vue({
        // Disable expensive template compilation optimizations in dev
        template: {
          compilerOptions: {
            hoistStatic: false, // Faster compilation
            cacheHandlers: false // Less memory, faster in dev
          }
        }
      })
    ],

    server: {
      host: '0.0.0.0', // Allow access from local network (iPhone, etc.)
      port: 5173,
      
      // Enable HMR for instant hot-reload during development
      hmr: true,
      
      // Enable faster dev server
      fs: {
        strict: false, // Less strict for faster serving
        allow: ['..'], // Allow serving files from parent directory
        cachedChecks: true // Cache file system reads
      },
      
      // Pre-transform modules for faster initial load
      preTransformRequests: true,
      
      // Aggressive dev server optimizations
      warmup: {
        // Pre-transform critical modules on server start (Vite 5+)
        clientFiles: [
          './src/main.js',
          './src/App.vue',
          './src/stores/tickerStore.js',
          './src/composables/usePriceSeries.js',
          './src/composables/useNetIncomeSeries.js',
          './src/services/financials/batchChartService.js',
          './src/services/financials/batchTableService.js',
          './src/styles/globals.css'
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
      } as Record<string, string | ProxyOptions>,
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
        'echarts/charts/CandlestickChart',
        'echarts/renderers/CanvasRenderer',
        'echarts/components/GridComponent',
        'echarts/components/TooltipComponent',
        'echarts/components/TitleComponent',
        'echarts/components/LegendComponent',
        'echarts/components/DataZoomComponent',
        'echarts/components/MarkLineComponent',
        'vue-echarts'
      ],
      exclude: [],
      // Enable esbuild optimization
      esbuildOptions: {
        target: 'es2020',
        // Aggressive minification in deps
        minify: true,
        treeShaking: true
      },
      // Force dependency optimization on first run
      force: false,
      // Disable deep scanning for faster startup
      holdUntilCrawlEnd: false
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
          safari10: true,
          // CRITICAL: Keep function names for memoization cache keys
          keep_fnames: true
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
