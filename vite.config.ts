// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
// @ts-ignore - vite-plugin-compression types
import viteCompression from 'vite-plugin-compression'
import type { Plugin, ProxyOptions } from 'vite'
import path from 'path'

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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    
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
      }),
      // Gzip compression for production
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240, // Only compress files > 10KB
        algorithm: 'gzip',
        ext: '.gz',
        deleteOriginFile: false
      }),
      // Brotli compression for production (better compression)
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false
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
        'echarts',
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
      target: 'es2020', // Changed from es2015 for better tree-shaking
      
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
          passes: 3, // Increased from 2 for better compression
          // Additional compression options
          arrows: true,
          collapse_vars: true,
          comparisons: true,
          computed_props: true,
          hoist_funs: true,
          hoist_props: true,
          hoist_vars: false,
          if_return: true,
          inline: true,
          join_vars: true,
          keep_infinity: true,
          loops: true,
          negate_iife: true,
          properties: true,
          reduce_funcs: true,
          reduce_vars: true,
          sequences: true,
          side_effects: true,
          switches: true,
          top_retain: null,
          toplevel: false,
          typeofs: true,
          unused: true
        },
        format: {
          // Remove comments in production
          comments: false,
          // Reduce whitespace
          ascii_only: true
        },
        mangle: {
          // Mangle variable names for smaller output
          safari10: true,
          // CRITICAL: Keep function names for memoization cache keys
          keep_fnames: true,
          toplevel: false
        }
      },
      
      // No source maps in production for smaller builds
      sourcemap: false,
      
      // Chunk size warnings (chart-heavy app needs larger chunks)
      chunkSizeWarningLimit: 600, // Increased to 600 kB - ECharts vendor is ~526 kB (169 kB gzipped)
      
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
            
            // Split composables and services for better caching
            if (id.includes('/src/composables/')) {
              return 'composables'
            }
            
            if (id.includes('/src/services/')) {
              return 'services'
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
        },
        
        // Tree-shaking optimizations
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        }
      },
      
      // Enable CSS minification
      cssMinify: true,
      
      // Compress output with brotli if server supports it
      reportCompressedSize: true,
      
      // Reduce polyfills for modern browsers
      modulePreload: {
        polyfill: false
      }
    }
  }
})
