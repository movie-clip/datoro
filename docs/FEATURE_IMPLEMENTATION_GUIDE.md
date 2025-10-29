# Feature Implementation Guide - Datoro Project

**Purpose:** Generic template for implementing new features efficiently  
**Last Updated:** October 29, 2025

---

## Table of Contents
1. [Feature Planning](#1-feature-planning)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Implementation](#3-frontend-implementation)
4. [Integration](#4-integration)
5. [Testing](#5-testing)
6. [Production Deployment](#6-production-deployment)

---

## 1. Feature Planning

### 1.1 Define Requirements
- [ ] **Feature name:** _____________
- [ ] **Purpose:** What problem does it solve?
- [ ] **Data sources:** Which APIs/databases will you use?
- [ ] **UI location:** Modal, panel, tab, or page?
- [ ] **User interaction:** Click, hover, keyboard, or automated?

### 1.2 Sketch Data Flow
```
User Action → Frontend Component → API Service → Backend Route → External API/DB
                                                        ↓
                                      Cache (Redis/Memory)
                                                        ↓
                                      Transform Data ← Return Response
```

### 1.3 Estimate Scope
- **Small:** 1-2 files, < 500 lines total
- **Medium:** 3-5 files, 500-1500 lines total
- **Large:** 6+ files, 1500+ lines total

### 1.4 Check Dependencies
- [ ] Do you need new npm packages?
- [ ] Do you need new API keys?
- [ ] Do you need database schema changes?
- [ ] Do you need new environment variables?

---

## 2. Backend Implementation

### 2.1 Create Route File

**Location:** `server/routes/{featureName}.ts`

**Template:**
```typescript
/**
 * {Feature Name} Routes
 * {Brief description of what this feature does}
 * 
 * Features:
 * - Multi-layer caching (if applicable)
 * - Rate limiting (if using external APIs)
 * - Request deduplication (if expensive operations)
 * - Secure API key handling (if using third-party APIs)
 */

import express from 'express'
import type { Request, Response } from 'express'
import { getCacheService } from '../services/cacheService.js'
import { REDIS_TTL } from '../config/constants.js'
import { asyncHandler } from '../utils/asyncHandler.js'
// Import rate limiting if using external APIs:
// import { fmpLimiter, globalFmpLimiter, decrementGlobalFmpCounter } from '../middleware/rateLimiter.js'

const router = express.Router()
const cache = getCacheService()

// If using external API keys, use dependency injection:
let EXTERNAL_API_KEY = ''

/**
 * Initialize route with dependencies (OPTIONAL - use if you need API keys)
 * Matches tickerRoutes/macroRoutes pattern for consistency
 */
function initFeatureRoutes(deps: { 
  apiVersion?: string
  fmpApiKey?: string
  externalApiKey?: string // Add your API key parameter
  isDatabaseAvailable?: boolean 
}) {
  EXTERNAL_API_KEY = deps.externalApiKey || ''
  
  // OPTIONAL: Request deduplication (prevents duplicate expensive operations)
  const inFlightRequests = new Map<string, Promise<unknown>>()
  
  async function fetchWithDeduplication<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (inFlightRequests.has(key)) {
      console.log(`[Feature] Dedup: Waiting for in-flight request: ${key}`)
      return await inFlightRequests.get(key) as T
    }
    const promise = fetchFn()
    inFlightRequests.set(key, promise as Promise<unknown>)
    try {
      return await promise
    } finally {
      inFlightRequests.delete(key)
    }
  }

  // Define routes inside init function if you need access to injected dependencies
  
  /**
   * GET /api/feature/endpoint
   * {Description of what this endpoint does}
   * Cache: {TTL duration}
   */
  router.get('/endpoint', 
    // Add middleware (if needed):
    // fmpLimiter,           // For FMP API calls
    // globalFmpLimiter,     // For FMP API calls
    asyncHandler(async (req: Request, res: Response) => {
      // 1. Validate query parameters
      const { param1, param2 } = req.query
      if (!param1) {
        return res.status(400).json({ error: 'Missing required parameter: param1' })
      }
      
      // 2. Generate cache key (if using cache)
      const cacheKey = cache.generateKey('feature', 'endpoint', param1 as string)
      
      // 3. Check cache first (if applicable)
      const cached = await cache.get(cacheKey)
      if (cached.data) {
        // If using FMP rate limiter, decrement counter on cache hits:
        // if ((req as any).fmpCallTracked) {
        //   decrementGlobalFmpCounter()
        // }
        console.log(`[Feature] Endpoint → CACHE HIT (${cached.source})`)
        res.setHeader('X-Cache', cached.source || 'hit')
        return res.json(cached.data)
      }
      
      // 4. Fetch/process data
      console.log(`[Feature] Endpoint → Fetching fresh data`)
      const data = await fetchWithDeduplication(cacheKey, async () => {
        // Your data fetching logic here
        // If calling external API:
        // const response = await fetch(`https://api.example.com?key=${EXTERNAL_API_KEY}`)
        // if (!response.ok) throw new Error(`API error: ${response.statusText}`)
        // return response.json()
        
        // If querying database:
        // return await prisma.model.findMany({ where: { ... } })
        
        // If processing data:
        return { result: 'your data here' }
      })
      
      // 5. Store in cache (if applicable)
      await cache.set(cacheKey, data, REDIS_TTL.SHORT) // Choose appropriate TTL
      
      // 6. Return response
      res.setHeader('X-Cache', 'miss')
      res.json(data)
    })
  )
}

// Export both the initialization function and the router
export { initFeatureRoutes }
export default router
```

### 2.2 Register Route in `server/server.ts`

**Add these lines in the appropriate sections:**

```typescript
// 1. Import (near line 20-30, with other route imports)
import featureRoutes, { initFeatureRoutes } from './routes/featureName.js'

// 2. Initialize (near line 210-220, with other route initializations)
// ONLY if using initFeatureRoutes pattern:
initFeatureRoutes(routeDeps) // or initFeatureRoutes({ externalApiKey: EXTERNAL_API_KEY })

// 3. Register (near line 220-230, with other app.use calls)
app.use('/api/feature', featureRoutes)
```

### 2.3 Choose Cache Strategy

**Cache TTLs (from `server/config/constants.ts`):**
```typescript
REDIS_TTL.SHORT        // 5 minutes  - Real-time data (stock quotes, indices)
REDIS_TTL.MEDIUM       // 1 hour     - Semi-static data (economic indicators)
REDIS_TTL.LONG         // 8 hours    - Historical data (price history)
REDIS_TTL.MACRO_LONG   // 7 days     - Rarely changing data (risk premiums)
REDIS_TTL.BATCH_SHORT  // 5 minutes  - Batch endpoints
```

**When to cache:**
- ✅ External API calls (always cache to save quota)
- ✅ Expensive database queries (cache for 1-5 minutes)
- ✅ Complex calculations (cache results)
- ❌ User-specific data (unless using user-keyed cache)
- ❌ Real-time critical data (< 1 second freshness)

### 2.4 Add Rate Limiting (if using external APIs)

```typescript
// Apply to routes that call FMP API:
router.get('/endpoint', fmpLimiter, globalFmpLimiter, asyncHandler(...))

// FMP rate limits:
// - fmpLimiter: 300 requests per 5 minutes per IP
// - globalFmpLimiter: 250 requests per 5 minutes globally

// Remember to decrement on cache hits:
if ((req as any).fmpCallTracked) {
  decrementGlobalFmpCounter()
}
```

### 2.5 Batch Endpoint Pattern (for multiple data sources)

**When to use:**
- You need data from 3+ separate API calls
- Data is logically related (shown together in UI)
- Want to reduce client network requests

**Example:**
```typescript
router.get('/batch', fmpLimiter, globalFmpLimiter, asyncHandler(async (req, res) => {
  const cacheKey = cache.generateKey('feature', 'batch', param1, param2)
  
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    if ((req as any).fmpCallTracked) decrementGlobalFmpCounter()
    res.setHeader('X-Cache', cached.source || 'hit')
    return res.json(cached.data)
  }
  
  // Fetch all data in parallel
  const [result1, result2, result3] = await Promise.allSettled([
    fetch('https://api.example.com/endpoint1'),
    fetch('https://api.example.com/endpoint2'),
    fetch('https://api.example.com/endpoint3')
  ])
  
  // Process results
  const batchData = {
    data1: result1.status === 'fulfilled' ? await result1.value.json() : [],
    data2: result2.status === 'fulfilled' ? await result2.value.json() : [],
    data3: result3.status === 'fulfilled' ? await result3.value.json() : [],
    timestamp: new Date().toISOString()
  }
  
  await cache.set(cacheKey, batchData, REDIS_TTL.BATCH_SHORT)
  res.setHeader('X-Cache', 'miss')
  res.json(batchData)
}))
```

---

## 3. Frontend Implementation

### 3.1 Create Data Service

**Location:** `src/services/{featureName}/{featureName}DataService.ts`

**Template:**
```typescript
/**
 * {Feature Name} Data Service
 * Handles all API communication for {feature name}
 */

import { API_BASE_URL } from '../../utils/apiConfig'

// Define TypeScript interfaces for your data
export interface FeatureDataItem {
  id: string
  name: string
  value: number
  date: string
  // Add your fields
}

export interface FeatureData {
  items: FeatureDataItem[]
  metadata?: {
    total: number
    timestamp: string
  }
}

/**
 * Fetch feature data from backend
 */
export async function fetchFeatureData(param1?: string, param2?: string): Promise<FeatureData> {
  const params = new URLSearchParams()
  if (param1) params.append('param1', param1)
  if (param2) params.append('param2', param2)
  
  const url = `${API_BASE_URL}/api/feature/endpoint?${params.toString()}`
  const response = await fetch(url)
  
  if (!response.ok) {
    const text = await response.text()
    console.error('[Feature] API error:', text.substring(0, 200))
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }
  
  return response.json()
}

// Add more fetch functions as needed
export async function fetchFeatureDetails(id: string): Promise<FeatureDataItem> {
  const response = await fetch(`${API_BASE_URL}/api/feature/${id}`)
  if (!response.ok) throw new Error(`Failed to fetch details: ${response.statusText}`)
  return response.json()
}

// Helper functions (if needed)
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return formatDate(date)
}
```

### 3.2 Create Vue Component

**Location:** `src/components/{FeatureName}.vue` or `src/components/{category}/{FeatureName}.vue`

**Template:**
```vue
<template>
  <div class="feature-container">
    <!-- Header (if needed) -->
    <div class="feature-header">
      <h2>Feature Title</h2>
      <!-- Add controls, filters, buttons here -->
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- Main Content -->
    <div v-else class="feature-content">
      <!-- Your content here (charts, tables, cards, etc.) -->
      
      <!-- Example: Display list of items -->
      <div v-for="item in data?.items" :key="item.id" class="item-card">
        <h3>{{ item.name }}</h3>
        <p>{{ item.value }}</p>
      </div>
      
      <!-- Example: Chart -->
      <!-- <v-chart :option="chartOption" autoresize /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { fetchFeatureData, type FeatureData } from '../services/featureName/featureNameDataService'
import { COLORS } from '../config/colors' // Use centralized colors

// State
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<FeatureData | null>(null)

// Load data
const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    data.value = await fetchFeatureData()
  } catch (err: any) {
    console.error('[Feature] Failed to load data:', err)
    error.value = err.message || 'Failed to load data'
  } finally {
    loading.value = false
  }
}

const retry = () => loadData()

// Computed properties (if needed)
const processedData = computed(() => {
  if (!data.value) return []
  return data.value.items.map(item => ({
    ...item,
    formattedValue: item.value.toFixed(2)
  }))
})

// Chart option (if using ECharts)
// const chartOption = computed(() => {
//   if (!data.value?.items) return {}
//   return {
//     backgroundColor: 'transparent',
//     tooltip: { trigger: 'axis' },
//     xAxis: { type: 'category', data: data.value.items.map(i => i.name) },
//     yAxis: { type: 'value' },
//     series: [{
//       type: 'line',
//       data: data.value.items.map(i => i.value),
//       itemStyle: { color: COLORS.chart.blue }
//     }]
//   }
// })

// Lifecycle
onMounted(() => loadData())
</script>

<style scoped>
.feature-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.feature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 24px;
}

.feature-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.feature-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.item-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.item-card:hover {
  border-color: rgba(0, 168, 142, 0.5);
  transform: translateY(-2px);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #999;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #00A88E;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #ef4444;
}

.retry-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: #00A88E;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #00755F;
  transform: translateY(-1px);
}
</style>
```

### 3.3 Use Centralized Colors

**Always import from:** `src/config/colors.ts`

```typescript
import { COLORS } from '@/config/colors'

// Chart colors
COLORS.chart.blue      // #3B82F6 - Primary
COLORS.chart.blueLight // #60A5FA - Light variant
COLORS.chart.blueDark  // #2563EB - Dark variant
COLORS.chart.green     // #00B59A - Brand green (positive)
COLORS.chart.purple    // #6C5CE7 - Accent
COLORS.chart.orange    // #F59E0B - Warning
COLORS.chart.red       // #EF4444 - Danger (negative)

// Brand colors
COLORS.brand.primary      // #00A88E
COLORS.brand.primaryDark  // #00594C
COLORS.brand.primaryLight // #00755F

// Status colors
COLORS.status.success // #00A88E
COLORS.status.warning // #F59E0B
COLORS.status.danger  // #EF4444
```

### 3.4 ECharts Integration (if using charts)

```typescript
// 1. Import ECharts
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts' // Import chart types you need
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 2. Register components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

// 3. Create chart option (computed)
const chartOption = computed(() => {
  if (!data.value) return {}
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 34, 0.95)',
      borderColor: 'rgba(0, 181, 154, 0.5)',
      textStyle: { color: '#E5E5E5' }
    },
    grid: {
      left: '20px',
      right: '40px',
      top: '40px',
      bottom: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.value.items.map(i => i.name),
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: [{
      type: 'line', // or 'bar'
      data: data.value.items.map(i => i.value),
      itemStyle: { color: COLORS.chart.blue },
      lineStyle: { width: 2 },
      smooth: true
    }]
  }
})
```

---

## 4. Integration

### 4.1 Choose Integration Method

**Option A: Modal (Overlay)**
```typescript
// src/App.vue

// 1. Lazy load component
const FeatureModal = defineAsyncComponent(() =>
  import('./components/FeatureModal.vue')
)

// 2. Add state
const showFeature = ref(false)

// 3. Add toggle function
const toggleFeature = () => {
  showFeature.value = !showFeature.value
}

// 4. Add to template
<Teleport to="body">
  <div v-if="showFeature" class="modal-overlay" @click.self="showFeature = false">
    <div class="modal-container feature-modal">
      <button class="modal-close" @click="showFeature = false">
        <svg><!-- X icon --></svg>
      </button>
      <FeatureModal />
    </div>
  </div>
</Teleport>
```

**Option B: Tab Panel**
```typescript
// Add to existing tabs in App.vue

// 1. Import component
import FeaturePanel from './components/FeaturePanel.vue'

// 2. Add to tabs array
const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'feature', label: 'Feature Name', icon: '🎯' }, // Add here
  // ...
]

// 3. Add to TabPanel
<TabPanel v-if="activeTab === 'feature'">
  <FeaturePanel />
</TabPanel>
```

**Option C: Standalone Page/Section**
```typescript
// Add directly in template
<template>
  <div class="app-container">
    <!-- Existing content -->
    
    <FeatureSection />
  </div>
</template>
```

### 4.2 Add Menu/Trigger Button

```typescript
// In MainMenu.vue or appropriate location

<button @click="openFeature" class="menu-item">
  <span class="icon">🎯</span>
  <span class="label">Feature Name</span>
</button>

// Emit event or call function
const openFeature = () => {
  emit('open-feature') // or call toggleFeature() from parent
}
```

---

## 5. Testing

### 5.1 Type Check

```bash
# Frontend
npm run type-check

# Backend
npm run type-check:server

# Both should return 0 errors
```

### 5.2 Lint Check

```bash
npm run lint:check

# Fix automatically if possible
npm run lint:fix
```

### 5.3 Manual Testing Checklist

- [ ] **Backend Endpoints**
  ```bash
  # Start server
  npm run server:dev
  
  # Test endpoint (use curl or browser)
  curl "http://localhost:7071/api/feature/endpoint?param1=value"
  
  # Check response:
  # - Valid JSON?
  # - Correct data structure?
  # - X-Cache header present?
  ```

- [ ] **Frontend Component**
  - [ ] Component renders without errors
  - [ ] Loading state shows during fetch
  - [ ] Data displays correctly after load
  - [ ] Error state shows on network failure
  - [ ] Retry button works
  - [ ] Responsive on desktop/tablet/mobile

- [ ] **Integration**
  - [ ] Modal/tab/panel opens correctly
  - [ ] Close button works
  - [ ] No layout conflicts with existing UI
  - [ ] No console errors

### 5.4 Performance Testing

```bash
# Check initial load time
# Open DevTools → Network tab
# Measure time to first render

# Check cache behavior
# 1st load: Should see API call
# 2nd load (within TTL): Should see cached response (X-Cache: hit)

# Check bundle size
npm run build
# Check dist/ folder size
```

### 5.5 Write Tests (Optional but Recommended)

```typescript
// tests/unit/FeatureName.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FeatureName from '@/components/FeatureName.vue'

describe('FeatureName', () => {
  it('renders correctly', () => {
    const wrapper = mount(FeatureName)
    expect(wrapper.find('h2').text()).toBe('Feature Title')
  })
  
  it('shows loading state initially', () => {
    const wrapper = mount(FeatureName)
    expect(wrapper.find('.loading-state').exists()).toBe(true)
  })
  
  it('fetches data on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] })
    })
    global.fetch = mockFetch
    
    mount(FeatureName)
    expect(mockFetch).toHaveBeenCalled()
  })
})
```

---

## 6. Production Deployment

### 6.1 Pre-Deployment Checklist

```bash
# Run all checks
node scripts/pre-deploy-check.mjs
npm run security:audit
npm run lint:check
npm run type-check
npm run type-check:server

# Build test
npm run build

# All should pass with 0 errors
```

### 6.2 Environment Variables

**Add to `.env.example` (if new variables):**
```bash
# Feature Name Configuration
FEATURE_API_KEY=your_api_key_here
FEATURE_ENABLED=true
```

**Set in production (Render.com):**
1. Go to Dashboard → Your Service → Environment
2. Add environment variables
3. Save changes (triggers redeploy)

### 6.3 Database Migrations (if needed)

```bash
# Create migration
npx prisma migrate dev --name add_feature_table

# Verify migration
node scripts/verify-migration.mjs

# Deploy to production
git push origin main
# Render automatically runs migrations
```

### 6.4 Deploy

```bash
# 1. Commit changes
git add .
git commit -m "feat: Add [Feature Name]"

# 2. Push to main
git push origin main

# 3. Monitor deployment (Render dashboard)
# - Check build logs
# - Check deploy logs
# - Verify service is running
```

### 6.5 Post-Deployment Verification

- [ ] **Check production site**
  - Open feature in production
  - Test functionality
  - Check browser console for errors

- [ ] **Monitor Sentry** (if integrated)
  - Look for new errors
  - Check error rate

- [ ] **Check Redis cache**
  - Verify cache is working
  - Monitor cache hit rate

- [ ] **Check API quotas** (if using external APIs)
  - Monitor usage
  - Ensure under limits

---

## Common Patterns & Best Practices

### Pattern 1: Secure API Key Handling
```typescript
// ❌ BAD - Never do this
const API_KEY = process.env.FMP_API_KEY

// ✅ GOOD - Use dependency injection
function initRoutes(deps: { apiKey: string }) {
  let API_KEY = deps.apiKey
  // Use API_KEY in routes
}
```

### Pattern 2: Error Handling
```typescript
// ❌ BAD
const data = await fetch(url)
return data.json()

// ✅ GOOD
try {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  return await response.json()
} catch (err: any) {
  console.error('[Feature] Error:', err)
  throw new Error('Failed to fetch data')
}
```

### Pattern 3: Caching
```typescript
// ✅ GOOD - Multi-layer caching pattern
const cacheKey = cache.generateKey('feature', 'data', param1)

// Check cache
const cached = await cache.get(cacheKey)
if (cached.data) {
  res.setHeader('X-Cache', cached.source || 'hit')
  return res.json(cached.data)
}

// Fetch data
const data = await fetchData()

// Store in cache
await cache.set(cacheKey, data, REDIS_TTL.SHORT)

// Return
res.setHeader('X-Cache', 'miss')
res.json(data)
```

### Pattern 4: TypeScript Interfaces
```typescript
// ✅ GOOD - Define interfaces for all data
export interface FeatureData {
  id: string
  name: string
  value: number
  metadata?: {
    total: number
    timestamp: string
  }
}

// Use in function signatures
async function fetchData(): Promise<FeatureData> {
  // ...
}
```

### Pattern 5: Computed Chart Options
```typescript
// ✅ GOOD - Use computed for reactivity
const chartOption = computed(() => {
  if (!data.value) return {}
  
  return {
    // ECharts config
  }
})

// ❌ BAD - Don't create in onMounted
onMounted(() => {
  chartOption = { /* ... */ } // Won't be reactive
})
```

---

## Quick Reference Checklist

### Backend
- [ ] Create route file in `server/routes/`
- [ ] Import and register in `server/server.ts`
- [ ] Add rate limiting (if external API)
- [ ] Add caching with appropriate TTL
- [ ] Wrap with `asyncHandler`
- [ ] Validate input parameters
- [ ] Add error handling

### Frontend
- [ ] Create data service in `src/services/`
- [ ] Define TypeScript interfaces
- [ ] Create Vue component in `src/components/`
- [ ] Add loading/error states
- [ ] Use centralized colors (`COLORS`)
- [ ] Add to App.vue (lazy load)
- [ ] Add trigger button/menu item

### Testing
- [ ] Run `npm run type-check`
- [ ] Run `npm run type-check:server`
- [ ] Run `npm run lint:check`
- [ ] Test endpoints manually
- [ ] Test UI in browser
- [ ] Check performance (load time, cache)

### Deployment
- [ ] Run pre-deploy checks
- [ ] Update `.env.example` (if new vars)
- [ ] Commit and push
- [ ] Verify production deployment
- [ ] Monitor for errors

---

## File Structure Reference

```
New Feature Files:
├── Backend
│   └── server/routes/{featureName}.ts
│
├── Frontend
│   ├── src/components/{FeatureName}.vue
│   └── src/services/{featureName}/
│       └── {featureName}DataService.ts
│
└── Modified Files
    ├── server/server.ts (register route)
    └── src/App.vue (integrate component)
```

---

## Time Estimates

| Feature Size | Backend | Frontend | Testing | Total |
|-------------|---------|----------|---------|-------|
| Small | 1-2 hours | 2-3 hours | 1 hour | 4-6 hours |
| Medium | 3-4 hours | 4-6 hours | 2 hours | 9-12 hours |
| Large | 6-8 hours | 8-12 hours | 3-4 hours | 17-24 hours |

---

**End of Guide** - Copy this template for each new feature!
