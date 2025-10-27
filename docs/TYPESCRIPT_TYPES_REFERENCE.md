# TypeScript Types Reference

Quick reference for using TypeScript types in Factorly.

## Import Types

```typescript
// Import all types from central index
import type { 
  BatchData, 
  FMPProfile, 
  UseTickerDataReturn,
  APIResponse 
} from '@/types'

// Or import from specific modules
import type { FMPQuote } from '@/types/fmp.types'
import type { SeriesDataPoint } from '@/types/batch.types'
```

## Common Usage Examples

### Frontend (Components & Composables)

```typescript
// Using BatchData in components
import type { BatchData } from '@/types'

const batchData = ref<BatchData | null>(null)
```

```typescript
// Typing composable returns
import type { UseTickerDataReturn } from '@/types'

export function useTickerData(ticker: Ref<string>): UseTickerDataReturn {
  // implementation
}
```

```typescript
// Chart series data
import type { ChartSeriesData, SeriesDataPoint } from '@/types'

const series = computed<ChartSeriesData>(() => {
  return data.value.map(item => [item.timestamp, item.value])
})
```

### Backend (Server, Routes, Services)

```typescript
// Express route handlers
import type { CustomRequest } from '@/types'
import type { Response } from 'express'

app.get('/api/ticker/:symbol', (req: CustomRequest, res: Response) => {
  // implementation
})
```

```typescript
// API responses
import type { APIResponse, BatchData } from '@/types'

const response: APIResponse<BatchData> = {
  data: batchData,
  meta: { source: 'cache' }
}
```

```typescript
// Service methods
import type { BatchFetchOptions, BatchFetchResult } from '@/types'

async function fetchBatchData(
  options: BatchFetchOptions
): Promise<BatchFetchResult> {
  // implementation
}
```

## Available Type Categories

### 1. FMP API Types (`fmp.types.ts`)
- `FMPProfile` - Company profile
- `FMPQuote` - Real-time quote
- `FMPIncomeStatement` - Income statement
- `FMPBalanceSheet` - Balance sheet  
- `FMPCashFlow` - Cash flow statement
- `FMPKeyMetrics` - Key metrics
- `FMPRatiosTTM` - TTM ratios
- `FMPEnterpriseValue` - Enterprise value
- `FMPFinancialGrowth` - Growth metrics
- `FMPInsiderTrading` - Insider trades
- `FMPStockSplit` - Stock splits
- `FMPDividend` - Dividend history
- `FMPHistoricalPrice` - Historical prices
- `FMPPriceTarget` - Price targets
- `FMPDCF` - DCF valuation

### 2. Batch Data Types (`batch.types.ts`)
- `BatchData` - Complete batch structure
- `BatchDataResponse` - API response wrapper
- `CacheEntry<T>` - Cache structure
- `SeriesDataPoint` - Time series point
- `ChartSeriesData` - ECharts data format
- `ValuationMetrics` - Valuation data
- `FinancialSummary` - Summary metrics
- `Timeframe` - Period selection
- `DataStatus` - Loading/error state

### 3. Server Types (`server.types.ts`)
- `APIError` - Error response
- `APIResponse<T>` - Success response
- `RouteConfig` - Route dependencies
- `CacheService` - Cache interface
- `DatabaseService` - Database interface
- `LoggerService` - Logger interface
- `MonitoringMetrics` - Metrics data
- `HealthCheckResponse` - Health check
- `SearchResult` - Search results
- `DeepFinderResult` - Deep finder data
- `PopularTicker` - Analytics data
- `CustomRequest` - Extended Request
- `AsyncRequestHandler` - Async handler
- `BatchFetchOptions` - Fetch options
- `BatchFetchResult` - Fetch result
- `RateLimitInfo` - Rate limit data
- `ValidationError` - Validation errors

### 4. Composable Types (`composable.types.ts`)
- `UseTickerDataReturn` - Main data composable
- `UseSeriesReturn` - Series composables
- `UseChartSeriesReturn` - Chart series
- `UsePriceSeriesReturn` - Price data
- `UseDcfCalculatorReturn` - DCF calculator
- `DcfInputs` - DCF inputs
- `UseValuationReturn` - Valuation metrics
- `UseFinancialMetricsReturn` - Financial data
- `UseSearchReturn` - Search functionality
- `UseDeepFinderReturn` - Deep finder
- `UseTimeframeReturn` - Timeframe selector
- `UseGrowthCalculatorReturn` - Growth calc

## Path Alias

Use `@/types` for imports:

```typescript
import type { BatchData } from '@/types'
```

This resolves to `src/types/` (configured in `tsconfig.app.json`).

## Next Steps

- ✅ Phase 0: Setup complete
- ✅ Phase 1: Types complete
- ⏳ Phase 2: Convert utilities
- ⏳ Phase 3: Convert services
- ⏳ Phase 4: Convert composables
