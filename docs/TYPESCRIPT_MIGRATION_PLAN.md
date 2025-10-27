# TypeScript Migration Plan for Factorly

**Status**: Phase 0 Complete ✅  
**Start Date**: October 27, 2025  
**Estimated Duration**: 6-8 weeks (gradual, non-breaking)  
**Risk Level**: Low (incremental approach)

---

## 📋 Migration Strategy Overview

### Core Principles
1. ✅ **Incremental Migration** - Convert files gradually, not all at once
2. ✅ **Non-Breaking** - JS and TS coexist during migration
3. ✅ **Bottom-Up Approach** - Start with utilities, end with components
4. ✅ **Test-Driven** - Ensure tests pass after each phase
5. ✅ **Type-Safe Boundaries** - Start with shared types, then expand

### Project Stats
- **Total Files**: 118 (77 JS/MJS + 41 Vue)
- **Frontend**: ~70 files (src/)
- **Backend**: ~25 files (server/)
- **Code Size**: 410 KB

---

## 🎯 Phase 0: Setup & Configuration (Week 1)

**Goal**: Enable TypeScript without breaking existing code

### Tasks

#### 0.1 Install TypeScript Dependencies (1 hour)
```bash
npm install -D typescript @types/node
npm install -D @vue/tsconfig
npm install -D @types/express @types/node-fetch @types/cors @types/compression @types/cookie-parser
npm install -D vue-tsc  # Vue TypeScript checker
```

#### 0.2 Create TypeScript Configurations (2 hours)

**Root `tsconfig.json`** (extends to client and server):
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.server.json" }
  ]
}
```

**`tsconfig.app.json`** (Frontend - Vue):
```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "include": [
    "src/**/*",
    "src/**/*.vue"
  ],
  "exclude": [
    "src/**/__tests__/*",
    "node_modules"
  ],
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**`tsconfig.node.json`** (Build tools - Vite):
```json
{
  "extends": "@tsconfig/node18/tsconfig.json",
  "include": [
    "vite.config.*",
    "vitest.config.*",
    "scripts/**/*"
  ],
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  }
}
```

**`tsconfig.server.json`** (Backend - Express):
```json
{
  "extends": "@tsconfig/node18/tsconfig.json",
  "include": ["server/**/*"],
  "exclude": ["node_modules"],
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@server/*": ["./server/*"]
    }
  }
}
```

#### 0.3 Update Build Configuration (1 hour)

**Update `vite.config.js` → `vite.config.ts`**:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // ... rest of config
})
```

**Update `package.json` scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "type-check": "vue-tsc --noEmit",
    "type-check:server": "tsc --project tsconfig.server.json --noEmit",
    "lint": "eslint . --ext .ts,.js,.vue,.mjs",
    "validate": "npm run type-check && npm run lint:check && npm test && npm run build"
  }
}
```

#### 0.4 Update ESLint Configuration (1 hour)

**Update `eslint.config.js`** to support TypeScript:
```javascript
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

export default [
  // ... existing configs
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.app.json', './tsconfig.server.json']
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  }
]
```

**Install ESLint TypeScript dependencies**:
```bash
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

#### 0.5 Verify Setup (1 hour)
```bash
# Check TypeScript setup
npx tsc --version

# Dry-run type checking (should pass with allowJs: true)
npm run type-check
npm run type-check:server

# Ensure build still works
npm run build
```

**✅ Phase 0 Complete Checklist:**
- [x] TypeScript installed
- [x] All tsconfig files created
- [x] Build scripts updated
- [x] ESLint configured for TS
- [x] Existing build still works

---

## 🧩 Phase 1: Shared Types & Interfaces (Week 2)

**Goal**: Create central type definitions for FMP API, batch data, and shared models

### Tasks

#### 1.1 Create Type Definition Files (4-6 hours)

**`src/types/fmp.types.ts`** - FMP API response types:
```typescript
// Company Profile
export interface FMPProfile {
  symbol: string
  companyName: string
  currency: string
  industry: string
  sector?: string
  ceo?: string
  website?: string
  description?: string
  ipoDate?: string
  // ... all FMP fields
}

// Quote Data
export interface FMPQuote {
  symbol: string
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearLow: number
  yearHigh: number
  marketCap: number
  volume: number
  avgVolume: number
  // ... all quote fields
}

// Income Statement
export interface FMPIncomeStatement {
  date: string
  symbol: string
  revenue: number
  costOfRevenue: number
  grossProfit: number
  operatingExpenses: number
  operatingIncome: number
  netIncome: number
  eps: number
  epsdiluted: number
  // ... all income statement fields
}

// Balance Sheet
export interface FMPBalanceSheet {
  date: string
  symbol: string
  totalAssets: number
  totalLiabilities: number
  totalStockholdersEquity: number
  cashAndCashEquivalents: number
  totalDebt: number
  // ... all balance sheet fields
}

// Cash Flow Statement
export interface FMPCashFlow {
  date: string
  symbol: string
  operatingCashFlow: number
  capitalExpenditure: number
  freeCashFlow: number
  dividendsPaid: number
  // ... all cash flow fields
}

// And 14 more endpoint types...
```

**`src/types/batch.types.ts`** - Batch data structure:
```typescript
import type {
  FMPProfile,
  FMPQuote,
  FMPIncomeStatement,
  FMPBalanceSheet,
  FMPCashFlow,
  // ... other FMP types
} from './fmp.types'

export interface BatchData {
  ticker: string
  timestamp: string
  fetchDuration: number
  data: {
    profile: FMPProfile[]
    quote: FMPQuote[]
    incomeAnnual: FMPIncomeStatement[]
    incomeQuarter: FMPIncomeStatement[]
    balanceAnnual: FMPBalanceSheet[]
    balanceQuarter: FMPBalanceSheet[]
    cashflowAnnual: FMPCashFlow[]
    cashflowQuarter: FMPCashFlow[]
    // ... 11 more endpoints
  }
  failures: string[]
}

export interface BatchDataResponse {
  data: BatchData | null
  source: 'memory' | 'redis' | 'api'
}
```

**`src/types/server.types.ts`** - Server-side types:
```typescript
import type { Request, Response } from 'express'

export interface APIError {
  message: string
  code: string
  timestamp: string
  details?: any
}

export interface CacheEntry<T> {
  data: T
  source: 'memory' | 'redis'
  timestamp: number
}

export interface RouteConfig {
  apiVersion: string
  fmpApiKey: string
  isDatabaseAvailable: boolean
}
```

**`src/types/composable.types.ts`** - Composable return types:
```typescript
import type { Ref, ComputedRef } from 'vue'
import type { BatchData } from './batch.types'

export interface UseTickerDataReturn {
  batchData: Ref<BatchData | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  ticker: ComputedRef<string>
  fetchData: (ticker: string) => Promise<void>
}

export interface SeriesDataPoint {
  timestamp: number
  value: number
}

export interface UseSeriesReturn {
  series: ComputedRef<SeriesDataPoint[]>
  loading: Ref<boolean>
  error: Ref<string | null>
}
```

#### 1.2 Create Index Files for Easy Imports (1 hour)

**`src/types/index.ts`**:
```typescript
export * from './fmp.types'
export * from './batch.types'
export * from './composable.types'
export * from './server.types'
```

**✅ Phase 1 Complete Checklist:**
- [ ] All FMP endpoint types defined
- [ ] Batch data types created
- [ ] Server types created
- [ ] Composable types created
- [ ] Index file for exports
- [ ] Type checking passes

---

## 🛠️ Phase 2: Utilities & Helpers (Week 3)

**Goal**: Convert utility functions (easiest wins, no dependencies)

### Files to Convert (Priority Order)

#### 2.1 Models (1-2 hours)
- [ ] `src/models/timeframe.js` → `timeframe.ts`

#### 2.2 Utils (2-3 hours)
- [ ] `src/utils/logger.js` → `logger.ts`
- [ ] `src/utils/growthCalculator.js` → `growthCalculator.ts`

#### 2.3 Server Utils (1-2 hours)
- [ ] `server/utils/asyncHandler.js` → `asyncHandler.ts`

**Example Migration** (`src/utils/logger.js` → `logger.ts`):
```typescript
// Before (logger.js)
export function log(message, level = 'info') {
  console.log(`[${level}] ${message}`)
}

// After (logger.ts)
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export function log(message: string, level: LogLevel = 'info'): void {
  console.log(`[${level}] ${message}`)
}
```

**✅ Phase 2 Complete Checklist:**
- [ ] All utils converted
- [ ] All models converted
- [ ] Type checking passes
- [ ] Tests pass
- [ ] Build succeeds

---

## 📦 Phase 3: Services Layer (Week 4-5)

**Goal**: Convert service modules (complex but high-value)

### 3.1 Shared Services (3-4 hours)
- [ ] `src/services/shared.js` → `shared.ts`

### 3.2 Financial Services (8-12 hours)
- [ ] `src/services/financials/batchDataSchemas.js` → `batchDataSchemas.ts`
- [ ] `src/services/financials/batchChartService.js` → `batchChartService.ts`
- [ ] `src/services/financials/batchTableService.js` → `batchTableService.ts`

### 3.3 Market Data Services (4-6 hours)
- [ ] `src/services/marketData/priceService.js` → `priceService.ts`
- [ ] `src/services/marketData/searchService.js` → `searchService.ts`
- [ ] `src/services/marketData/deepFinderService.js` → `deepFinderService.ts`

### 3.4 Company Services (4-6 hours)
- [ ] `src/services/company/profileService.js` → `profileService.ts`
- [ ] `src/services/company/cashflowService.js` → `cashflowService.ts`
- [ ] `src/services/company/valuationService.js` → `valuationService.ts`

### 3.5 DCF Calculator (4-6 hours)
- [ ] `src/services/dcf/dcfCalculator.js` → `dcfCalculator.ts`
- [ ] `src/services/dcf/advancedDcfCalculator.js` → `advancedDcfCalculator.ts`

**Example Migration** (`batchChartService.js` → `batchChartService.ts`):
```typescript
// Before
export function getRevenueSeriesFromBatch(batchData) {
  if (!batchData?.data?.incomeAnnual) return []
  return batchData.data.incomeAnnual.map(item => [
    new Date(item.date).getTime(),
    item.revenue
  ])
}

// After
import type { BatchData, SeriesDataPoint } from '@/types'

export function getRevenueSeriesFromBatch(
  batchData: BatchData | null
): SeriesDataPoint[] {
  if (!batchData?.data?.incomeAnnual) return []
  
  return batchData.data.incomeAnnual.map(item => ({
    timestamp: new Date(item.date).getTime(),
    value: item.revenue
  }))
}
```

**✅ Phase 3 Complete Checklist:**
- [ ] All service files converted
- [ ] Type exports added
- [ ] Type checking passes
- [ ] All tests pass
- [ ] Build succeeds

---

## 🎨 Phase 4: Composables (Week 5-6)

**Goal**: Convert Vue composables (high-value, moderate complexity)

### Files to Convert

#### 4.1 Data Composables (10-15 hours)
- [ ] `src/composables/useTickerData.js` → `useTickerData.ts`
- [ ] `src/composables/usePriceSeries.js` → `usePriceSeries.ts`
- [ ] `src/composables/useRevenueSeries.js` → `useRevenueSeries.ts`
- [ ] `src/composables/useFcfSeries.js` → `useFcfSeries.ts`
- [ ] `src/composables/useEpsSeries.js` → `useEpsSeries.ts`
- [ ] `src/composables/useEbitdaSeries.js` → `useEbitdaSeries.ts`
- [ ] `src/composables/useNetIncomeSeries.js` → `useNetIncomeSeries.ts`
- [ ] `src/composables/useSharesSeries.js` → `useSharesSeries.ts`
- [ ] `src/composables/useExpensesSeries.js` → `useExpensesSeries.ts`
- [ ] `src/composables/useCashDebtSeries.js` → `useCashDebtSeries.ts`
- [ ] `src/composables/useCapitalReturnedSeries.js` → `useCapitalReturnedSeries.ts`
- [ ] `src/composables/useDividendYieldSeries.js` → `useDividendYieldSeries.ts`
- [ ] `src/composables/useInsiderTradingSeries.js` → `useInsiderTradingSeries.ts`

#### 4.2 Calculator Composables (4-6 hours)
- [ ] `src/composables/useDcfCalculator.js` → `useDcfCalculator.ts`

**Example Migration** (`useTickerData.js` → `useTickerData.ts`):
```typescript
// Before
export function useTickerData(tickerRef) {
  const tickerStore = useTickerStore()
  const batchData = computed(() => tickerStore.batchData)
  const loading = computed(() => tickerStore.loading)
  const error = computed(() => tickerStore.error)
  
  return { batchData, loading, error }
}

// After
import type { Ref, ComputedRef } from 'vue'
import type { BatchData } from '@/types'

export interface UseTickerDataReturn {
  batchData: ComputedRef<BatchData | null>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  ticker: ComputedRef<string>
  fetchData: (ticker: string) => Promise<void>
}

export function useTickerData(
  tickerRef: Ref<string>
): UseTickerDataReturn {
  const tickerStore = useTickerStore()
  
  const batchData = computed(() => tickerStore.batchData)
  const loading = computed(() => tickerStore.loading)
  const error = computed(() => tickerStore.error)
  const ticker = computed(() => tickerRef.value)
  
  const fetchData = async (ticker: string): Promise<void> => {
    await tickerStore.fetchBatchData(ticker)
  }
  
  return { batchData, loading, error, ticker, fetchData }
}
```

**✅ Phase 4 Complete Checklist:**
- [ ] All composables converted
- [ ] Return types defined
- [ ] Type checking passes
- [ ] All tests pass
- [ ] Build succeeds

---

## 🏪 Phase 5: Stores (Week 6)

**Goal**: Convert Pinia stores (critical, well-tested)

### Files to Convert (4-6 hours)

- [ ] `src/stores/tickerStore.js` → `tickerStore.ts`

**Example Migration**:
```typescript
// Before (tickerStore.js)
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTickerStore = defineStore('ticker', () => {
  const batchData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  async function fetchBatchData(ticker) {
    // ...
  }
  
  return { batchData, loading, error, fetchBatchData }
})

// After (tickerStore.ts)
import { defineStore } from 'pinia'
import { ref, Ref } from 'vue'
import type { BatchData } from '@/types'

interface TickerStoreState {
  batchData: Ref<BatchData | null>
  loading: Ref<boolean>
  error: Ref<string | null>
}

export const useTickerStore = defineStore('ticker', () => {
  const batchData = ref<BatchData | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  async function fetchBatchData(ticker: string): Promise<void> {
    // ...
  }
  
  return { batchData, loading, error, fetchBatchData }
})
```

**✅ Phase 5 Complete Checklist:**
- [ ] Store converted
- [ ] State types defined
- [ ] Action types defined
- [ ] Type checking passes
- [ ] All tests pass

---

## 🎭 Phase 6: Vue Components (Week 7-8)

**Goal**: Convert Vue SFCs to `<script setup lang="ts">`

### Migration Strategy

Convert components **bottom-up** (leaf components first, then containers):

#### 6.1 Base Components (4-6 hours)
- [ ] `src/components/common/LoadingSpinner.vue`
- [ ] `src/components/common/ErrorMessage.vue`
- [ ] `src/components/common/BaseChart.vue`

#### 6.2 Chart Components (10-15 hours)
- [ ] `src/components/charts/RevenueChart.vue`
- [ ] `src/components/charts/PriceChart.vue`
- [ ] `src/components/charts/FcfChart.vue`
- [ ] `src/components/charts/EpsChart.vue`
- [ ] `src/components/charts/MarginChart.vue`
- [ ] `src/components/charts/DeepFinderChart.vue`
- [ ] ... (all chart components)

#### 6.3 Table Components (6-8 hours)
- [ ] `src/components/tables/ValuationTable.vue`
- [ ] `src/components/tables/FinancialRatiosTable.vue`
- [ ] ... (all table components)

#### 6.4 Layout Components (4-6 hours)
- [ ] `src/components/layout/Header.vue`
- [ ] `src/components/layout/Sidebar.vue`
- [ ] ... (all layout components)

#### 6.5 Main App (2-3 hours)
- [ ] `src/App.vue`
- [ ] `src/main.js` → `main.ts`

**Example Migration** (Vue SFC):
```vue
<!-- Before -->
<script setup>
import { computed } from 'vue'
import { useTickerData } from '@/composables/useTickerData'

const props = defineProps({
  ticker: String
})

const { batchData, loading, error } = useTickerData(computed(() => props.ticker))
</script>

<!-- After -->
<script setup lang="ts">
import { computed } from 'vue'
import { useTickerData } from '@/composables/useTickerData'

interface Props {
  ticker: string
}

const props = defineProps<Props>()

const { batchData, loading, error } = useTickerData(
  computed(() => props.ticker)
)
</script>
```

**✅ Phase 6 Complete Checklist:**
- [ ] All Vue components converted
- [ ] Props typed with `defineProps<T>()`
- [ ] Emits typed with `defineEmits<T>()`
- [ ] Type checking passes
- [ ] All tests pass
- [ ] Build succeeds

---

## 🚀 Phase 7: Server Migration (Week 8)

**Goal**: Convert Express server to TypeScript

### Files to Convert

#### 7.1 Server Routes (6-8 hours)
- [ ] `server/routes/tickerRoutes.js` → `tickerRoutes.ts`
- [ ] `server/routes/searchRoutes.js` → `searchRoutes.ts`
- [ ] `server/routes/analyticsRoutes.js` → `analyticsRoutes.ts`
- [ ] `server/routes/healthRoutes.js` → `healthRoutes.ts`
- [ ] `server/routes/adminRoutes.js` → `adminRoutes.ts`
- [ ] `server/routes/authRoutes.js` → `authRoutes.ts`
- [ ] `server/routes/watchlist.mjs` → `watchlist.ts`

#### 7.2 Server Services (4-6 hours)
- [ ] `server/services/batchDataService.js` → `batchDataService.ts`
- [ ] `server/services/cacheService.js` → `cacheService.ts`
- [ ] `server/services/databaseService.js` → `databaseService.ts`
- [ ] `server/services/logger.js` → `logger.ts`
- [ ] `server/services/monitoringService.js` → `monitoringService.ts`
- [ ] `server/services/sentryService.js` → `sentryService.ts`

#### 7.3 Server Middleware (3-4 hours)
- [ ] `server/middleware/validation.js` → `validation.ts`
- [ ] `server/middleware/rateLimiter.js` → `rateLimiter.ts`
- [ ] `server/middleware/errorHandler.js` → `errorHandler.ts`
- [ ] `server/middleware/security.js` → `security.ts`
- [ ] `server/middleware/requestId.js` → `requestId.ts`

#### 7.4 Main Server (2-3 hours)
- [ ] `server/server.mjs` → `server.ts`

#### 7.5 Update Server Execution (1 hour)

Update `package.json`:
```json
{
  "scripts": {
    "server": "tsx server/server.ts",
    "server:dev": "tsx watch server/server.ts",
    "server:build": "tsc --project tsconfig.server.json"
  }
}
```

Install `tsx` (TypeScript executor):
```bash
npm install -D tsx
```

**✅ Phase 7 Complete Checklist:**
- [ ] All server files converted
- [ ] Express types added
- [ ] Request/Response typed
- [ ] Type checking passes (server)
- [ ] Server starts successfully
- [ ] All endpoints work

---

## 🧪 Phase 8: Testing & Validation (Ongoing)

**Goal**: Ensure type safety throughout migration

### Tasks

#### 8.1 Update Tests (per phase)
- [ ] Update test imports
- [ ] Add type assertions
- [ ] Fix type-related test failures

#### 8.2 Add Type-Only Tests
```typescript
// types.test.ts
import { expectTypeOf } from 'vitest'
import type { BatchData, UseTickerDataReturn } from '@/types'

describe('Type Tests', () => {
  it('should have correct BatchData structure', () => {
    expectTypeOf<BatchData>().toHaveProperty('ticker')
    expectTypeOf<BatchData>().toHaveProperty('data')
  })
  
  it('should have correct composable return type', () => {
    expectTypeOf<UseTickerDataReturn>().toHaveProperty('batchData')
    expectTypeOf<UseTickerDataReturn>().toHaveProperty('loading')
  })
})
```

#### 8.3 Continuous Validation
```bash
# Run after each phase
npm run type-check
npm run type-check:server
npm test
npm run build
```

**✅ Phase 8 Complete Checklist:**
- [ ] All tests updated
- [ ] Type-only tests added
- [ ] No type errors
- [ ] All tests pass
- [ ] Build succeeds

---

## 🎓 Phase 9: Strict Mode & Cleanup (Week 9)

**Goal**: Enable strict TypeScript checking

### Tasks

#### 9.1 Enable Strict Checks (2-4 hours)

Update all `tsconfig.*.json` files:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

#### 9.2 Fix Strict Mode Errors (4-8 hours)
- [ ] Add explicit return types
- [ ] Fix null/undefined handling
- [ ] Add type guards where needed
- [ ] Replace `any` with proper types

#### 9.3 Remove Deprecated JS Files (1-2 hours)
- [ ] Delete all `.js` files (after verifying `.ts` works)
- [ ] Update imports to remove `.js` extensions
- [ ] Clean up build artifacts

#### 9.4 Update Documentation (2-3 hours)
- [ ] Update README with TypeScript info
- [ ] Add type documentation
- [ ] Update contribution guide

**✅ Phase 9 Complete Checklist:**
- [ ] Strict mode enabled
- [ ] No type errors
- [ ] All `.js` files removed
- [ ] Documentation updated
- [ ] Full type coverage

---

## 📊 Progress Tracking

### Migration Dashboard

| Phase | Status | Files | Est. Hours | Actual Hours | Progress |
|-------|--------|-------|------------|--------------|----------|
| 0. Setup | ✅ Complete | 4 config files | 6 | 1.5 | 100% |
| 1. Shared Types | ⏳ Not Started | 5 type files | 6 | - | 0% |
| 2. Utilities | ⏳ Not Started | 4 files | 6 | - | 0% |
| 3. Services | ⏳ Not Started | 15 files | 24 | - | 0% |
| 4. Composables | ⏳ Not Started | 14 files | 15 | - | 0% |
| 5. Stores | ⏳ Not Started | 1 file | 5 | - | 0% |
| 6. Components | ⏳ Not Started | 41 files | 30 | - | 0% |
| 7. Server | ⏳ Not Started | 25 files | 20 | - | 0% |
| 8. Testing | ⏳ Ongoing | Ongoing | - | - | 0% |
| 9. Strict & Cleanup | ⏳ Not Started | All files | 10 | - | 0% |
| **TOTAL** | | **118 files** | **122 hrs** | **1.5 hrs** | **1%** |

### Weekly Goals

- **Week 1**: Setup complete, type-checking enabled
- **Week 2**: Shared types + utilities converted
- **Week 3**: Services layer 50% complete
- **Week 4**: Services layer 100% complete
- **Week 5**: Composables converted
- **Week 6**: Stores + Components 30% complete
- **Week 7**: Components 80% complete
- **Week 8**: Server migration complete
- **Week 9**: Strict mode + final cleanup

---

## 🚨 Risk Mitigation

### Common Issues & Solutions

#### Issue: Build Breaking After Conversion
**Solution**: Always keep `.js` version until `.ts` is verified working

#### Issue: Type Errors in Third-Party Libraries
**Solution**: Use `skipLibCheck: true` temporarily, add `@types/*` packages

#### Issue: Complex Type Inference Failing
**Solution**: Add explicit type annotations, avoid deep generics

#### Issue: Vue Template Type Checking Too Strict
**Solution**: Use `as any` sparingly for complex template expressions

### Rollback Plan

Each phase is independent:
```bash
# If Phase N fails, revert only that phase
git checkout main -- <files-from-phase-N>

# Continue from last successful phase
```

---

## 📝 Migration Checklist Template

Use this for each file conversion:

```markdown
## Converting: [filename.js] → [filename.ts]

- [ ] Create new `.ts` file
- [ ] Add type imports (`import type { ... }`)
- [ ] Add parameter types
- [ ] Add return types
- [ ] Add interface/type definitions
- [ ] Replace `any` with proper types
- [ ] Update imports in other files
- [ ] Run `npm run type-check`
- [ ] Run tests
- [ ] Verify build
- [ ] Delete `.js` file
- [ ] Commit changes
```

---

## 🎯 Success Criteria

**Migration is complete when:**

✅ All 118 files converted to TypeScript  
✅ `npm run type-check` passes with 0 errors  
✅ `npm run type-check:server` passes with 0 errors  
✅ All tests pass  
✅ Build succeeds without warnings  
✅ Strict mode enabled  
✅ No `.js` files in `src/` or `server/`  
✅ Documentation updated  
✅ Team trained on TypeScript patterns  

---

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vue 3 + TypeScript Guide](https://vuejs.org/guide/typescript/overview.html)
- [Express + TypeScript](https://github.com/microsoft/TypeScript-Node-Starter)
- [Pinia + TypeScript](https://pinia.vuejs.org/cookbook/composing-stores.html)

---

**Ready to start?** Begin with Phase 0!
