// server/services/batchDataService.ts
// Batch data fetcher - fetches all ticker data in one optimized request

import { z } from 'zod'
import logger from './logger.js'

interface FetchOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

interface BatchResult {
  ticker: string
  timestamp: string
  fetchDuration: number
  data: Record<string, unknown>
  failures?: string[]
}

interface BatchFetchOptions {
  includeQuote?: boolean
}

// Basic validation schemas for FMP responses
const FMPProfileSchema = z.array(z.object({
  symbol: z.string(),
  companyName: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
}))

const FMPQuoteSchema = z.array(z.object({
  symbol: z.string(),
  price: z.number().optional(),
  changesPercentage: z.number().optional(),
  change: z.number().optional(),
}))

const FMPIncomeStatementSchema = z.array(z.object({
  date: z.string(),
  symbol: z.string(),
  revenue: z.number().nullable().optional(),
  netIncome: z.number().nullable().optional(),
}))

const FMPBalanceSheetSchema = z.array(z.object({
  date: z.string(),
  symbol: z.string(),
  totalAssets: z.number().nullable().optional(),
  totalLiabilities: z.number().nullable().optional(),
}))

const FMPCashFlowSchema = z.array(z.object({
  date: z.string(),
  symbol: z.string(),
  operatingCashFlow: z.number().nullable().optional(),
  freeCashFlow: z.number().nullable().optional(),
}))

// Validation map for each endpoint
const validationSchemas: Record<string, z.ZodSchema | null> = {
  profile: FMPProfileSchema,
  quote: FMPQuoteSchema,
  incomeAnnual: FMPIncomeStatementSchema,
  incomeQuarter: FMPIncomeStatementSchema,
  balanceAnnual: FMPBalanceSheetSchema,
  balanceQuarter: FMPBalanceSheetSchema,
  cashflowAnnual: FMPCashFlowSchema,
  cashflowQuarter: FMPCashFlowSchema,
  // Add null for endpoints without validation yet
  ratiosTTM: null,
  keyMetricsTTM: null,
  ratiosAnnual: null,
  ratiosQuarter: null, // Quarterly ratios for P/E, P/S trends
  keyMetrics: null,
  keyMetricsQuarter: null, // Quarterly key metrics for FCF per share
  priceHistory: null,
  fmpDcf: null,
  advancedDcf: null,
  revenueSegments: null,
  revenueGeographicSegments: null, // Geographic revenue segmentation
  dividendHistory: null,
  stockSplit: null,
  earningsCalendar: null,
  financialScores: null,
  priceTargetSummary: null,
  priceTargetConsensus: null,
  insiderTrading: null,
  incomeAsReportedAnnual: null, // As-reported income statements (includes operational metrics)
  incomeAsReportedQuarter: null,
}

/**
 * Validate FMP API response with schema
 */
function validateResponse(dataKey: string, data: unknown): { valid: boolean; error?: string } {
  const schema = validationSchemas[dataKey]
  
  // Skip validation if no schema defined
  if (!schema) {
    return { valid: true }
  }
  
  try {
    schema.parse(data)
    return { valid: true }
  } catch (error: unknown) {
    const zodError = error instanceof z.ZodError ? error : null
    const errorMsg = zodError?.issues[0]?.message || (error instanceof Error ? error.message : 'Validation failed')
    logger.warn(`[BatchData] Validation failed for ${dataKey}:`, errorMsg)
    return { valid: false, error: errorMsg }
  }
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: FetchOptions = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (_error: unknown) {
    clearTimeout(timeoutId);
    if (_error instanceof Error && _error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw _error;
  }
}

/**
 * Fetch ticker data with endpoint prioritization
 * Phase 1 (Critical): Essential data for initial render (~800ms)
 * Phase 2 (Secondary): Additional data fetched immediately after Phase 1 completes
 * 
 * @param ticker - Stock ticker symbol
 * @param fmpApiKey - FMP API key
 * @returns BatchResult with all data
 */
export async function fetchTickerBatch(
  ticker: string,
  fmpApiKey: string,
  options: BatchFetchOptions = {}
): Promise<BatchResult> {
  const t = ticker.toUpperCase().trim();
  const baseUrl = 'https://financialmodelingprep.com';
  const includeQuote = options.includeQuote ?? true
  
  // PHASE 1: Critical endpoints (needed for initial render)
  // ~10 endpoints, typically completes in 800-1200ms
  const criticalEndpoints: Record<string, string> = {
    // Core company data
    profile: `/api/v3/profile/${t}?apikey=${fmpApiKey}`,
    
    // Financial statements (annual only for speed)
    incomeAnnual: `/api/v3/income-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    balanceAnnual: `/api/v3/balance-sheet-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    cashflowAnnual: `/api/v3/cash-flow-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    
    // Essential metrics
    ratiosTTM: `/api/v3/ratios-ttm/${t}?apikey=${fmpApiKey}`,
    keyMetricsTTM: `/api/v3/key-metrics-ttm/${t}?apikey=${fmpApiKey}`,
    ratiosAnnual: `/api/v3/ratios/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    keyMetrics: `/api/v3/key-metrics/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    
    // Price data (essential for charts)
    priceHistory: `/api/v3/historical-price-full/${t}?from=${getDateMonthsAgo(360)}&apikey=${fmpApiKey}`,
  };

  if (includeQuote) {
    criticalEndpoints.quote = `/api/v3/quote/${t}?apikey=${fmpApiKey}`
  }
  
  // PHASE 2: Secondary endpoints (can be deferred)
  // ~16 endpoints, fetched immediately after Phase 1 completes
  const secondaryEndpoints: Record<string, string> = {
    // Quarterly data (for detailed analysis)
    incomeQuarter: `/api/v3/income-statement/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    balanceQuarter: `/api/v3/balance-sheet-statement/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    cashflowQuarter: `/api/v3/cash-flow-statement/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    ratiosQuarter: `/api/v3/ratios/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    keyMetricsQuarter: `/api/v3/key-metrics/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    
    // As-reported financial statements (includes operational metrics like subscriber counts)
    incomeAsReportedAnnual: `/api/v3/financial-statement-full-as-reported/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    incomeAsReportedQuarter: `/api/v3/financial-statement-full-as-reported/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    
    // Valuation models
    fmpDcf: `/api/v3/discounted-cash-flow/${t}?apikey=${fmpApiKey}`,
    advancedDcf: `/api/v4/advanced_discounted_cash_flow?symbol=${t}&apikey=${fmpApiKey}`,
    
    // Additional data
    revenueSegments: `/api/v4/revenue-product-segmentation?symbol=${t}&structure=flat&apikey=${fmpApiKey}`,
    revenueGeographicSegments: `/api/v4/revenue-geographic-segmentation?symbol=${t}&structure=flat&apikey=${fmpApiKey}`,
    dividendHistory: `/api/v3/historical-price-full/stock_dividend/${t}?apikey=${fmpApiKey}`,
    stockSplit: `/api/v3/historical-price-full/stock_split/${t}?apikey=${fmpApiKey}`,
    earningsCalendar: `/api/v3/historical/earning_calendar/${t}?apikey=${fmpApiKey}`,
    financialScores: `/api/v4/score?symbol=${t}&apikey=${fmpApiKey}`,
    priceTargetSummary: `/api/v4/price-target-summary?symbol=${t}&apikey=${fmpApiKey}`,
    priceTargetConsensus: `/api/v4/price-target-consensus?symbol=${t}&apikey=${fmpApiKey}`,
    insiderTrading: `/stable/insider-trading/search?symbol=${t}&page=0&limit=500&apikey=${fmpApiKey}`,
  };

  // Combine all endpoints for timing tracking
  const allEndpoints = { ...criticalEndpoints, ...secondaryEndpoints };
  const startTime = Date.now();
  const endpointTimings: Record<string, number> = {};
  
  try {
    // Helper function to fetch a single endpoint with timeout and error handling
    const fetchEndpoint = async (key: string, endpoint: string): Promise<[string, unknown]> => {
      const endpointStart = Date.now();
      try {
        // Fetch with 8 second timeout (reduced from 10 for faster failures)
        const res = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, 8000);
        
        const duration = Date.now() - endpointStart;
        endpointTimings[key] = duration;
        
        if (!res.ok) {
          logger.warn(`[BatchData] ${key} failed: ${res.status} (${duration}ms)`);
          if (key === 'quote') {
            logger.error(`[BatchData] quote endpoint failed for ${t}: ${baseUrl}${endpoint}`);
            logger.error(`[BatchData] quote status: ${res.status}, statusText: ${res.statusText}`);
          }
          if (key === 'advancedDcf') {
            logger.error(`[BatchData] advancedDcf endpoint failed: ${baseUrl}${endpoint}`);
            logger.error(`[BatchData] advancedDcf status: ${res.status}, statusText: ${res.statusText}`);
          }
          return [key, null];
        }
        
        const data = await res.json();
        if (key === 'quote') {
          logger.debug(`[BatchData] quote data received for ${t}:`, Array.isArray(data) ? `Array length: ${data.length}` : typeof data);
          if (Array.isArray(data) && data.length > 0) {
            logger.debug(`[BatchData] quote data sample:`, { sharesOutstanding: data[0].sharesOutstanding });
          }
        }
        if (key === 'advancedDcf') {
          logger.debug(`[BatchData] advancedDcf data received:`, Array.isArray(data) ? `Array length: ${data.length}` : typeof data);
        }
        return [key, data];
      } catch (_error: unknown) {
        const duration = Date.now() - endpointStart;
        endpointTimings[key] = duration;
        logger.warn(`[BatchData] ${key} error: ${_error instanceof Error ? _error.message : 'Unknown error'} (${duration}ms)`);
        return [key, null];
      }
    };

    // PHASE 1: Fetch critical endpoints immediately
    logger.debug(`[BatchData] ${t} - Starting Phase 1 (${Object.keys(criticalEndpoints).length} critical endpoints)`);
    const criticalResults = await Promise.allSettled(
      Object.entries(criticalEndpoints).map(([key, endpoint]) => fetchEndpoint(key, endpoint))
    );

    logger.debug(`[BatchData] ${t} - Phase 1 complete (${Date.now() - startTime}ms), starting Phase 2`);

    // PHASE 2: Fetch secondary endpoints
    logger.debug(`[BatchData] ${t} - Starting Phase 2 (${Object.keys(secondaryEndpoints).length} secondary endpoints)`);
    const secondaryResults = await Promise.allSettled(
      Object.entries(secondaryEndpoints).map(([key, endpoint]) => fetchEndpoint(key, endpoint))
    );

    // Combine results from both phases
    const responses = [...criticalResults, ...secondaryResults];

    // Build result object - ALWAYS return data, even if some endpoints failed
    const result: BatchResult = {
      ticker: t,
      timestamp: new Date().toISOString(),
      fetchDuration: Date.now() - startTime,
      data: {},
      failures: [] // Track which endpoints failed
    };

    const endpointKeys = Object.keys(allEndpoints)
    responses.forEach((__response, _index) => {
      const key = endpointKeys[_index] ?? 'unknown';
      if (__response.status === 'fulfilled') {
        const [dataKey, data] = __response.value;
        
        // Validate response data
        if (data) {
          const validation = validateResponse(dataKey, data)
          if (!validation.valid) {
            logger.warn(`[BatchData] ${dataKey} validation failed: ${validation.error}`)
            // Still include data but log warning
          }
        }
        
        // Special handling: Some FMP /api/v4 endpoints return object instead of array
        if (dataKey === 'financialScores' && data && !Array.isArray(data)) {
          result.data[dataKey] = [data]; // Wrap in array
        } else if ((dataKey === 'revenueGeographicSegments' || dataKey === 'revenueSegments') && data && !Array.isArray(data)) {
          // FMP revenue segmentation endpoints can return object instead of array
          logger.debug(`[BatchData] ${dataKey} returned object instead of array, wrapping in array`);
          result.data[dataKey] = [data]; // Wrap in array for consistent parsing
        } else {
          result.data[dataKey] = data;
        }
        
        if (!data) {
          result.failures!.push(key);
        }
      } else {
        logger.error(`[BatchData] ${key} error:`, __response.reason);
        result.data[key] = null;
        result.failures!.push(key);
      }
    });

    // Log timing breakdown for slowest endpoints (> 500ms)
    const slowEndpoints = Object.entries(endpointTimings)
      .filter(([_, duration]) => duration > 500)
      .sort((a, b) => b[1] - a[1]);
    
    if (slowEndpoints.length > 0) {
      logger.debug(`[Batch] ${t} - Slow endpoints (>500ms):`, 
        slowEndpoints.map(([key, duration]) => `${key}:${duration}ms`).join(', '));
    }

    return result;
  } catch (_error) {
    logger.error('[BatchData] Fatal error:', _error);
    throw _error;
  }
}

/**
 * Fetch minimal data for quick initial load (Priority 1 only)
 */
export async function fetchTickerPriority(
  ticker: string,
  fmpApiKey: string,
  options: BatchFetchOptions = {}
): Promise<BatchResult> {
  const t = ticker.toUpperCase().trim();
  const baseUrl = 'https://financialmodelingprep.com';
  const includeQuote = options.includeQuote ?? true
  
  // Only fetch critical data for instant display
  const endpoints: Record<string, string> = {
    profile: `/api/v3/profile/${t}?apikey=${fmpApiKey}`,
    incomeQuarter: `/api/v3/income-statement/${t}?period=quarter&limit=4&apikey=${fmpApiKey}`,
    priceHistory: `/api/v3/historical-price-full/${t}?from=${getDateMonthsAgo(12)}&apikey=${fmpApiKey}`,
  };

  if (includeQuote) {
    endpoints.quote = `/api/v3/quote/${t}?apikey=${fmpApiKey}`
  }

  const startTime = Date.now();
  
  const responses = await Promise.allSettled(
    Object.entries(endpoints).map(async ([key, endpoint]): Promise<[string, unknown]> => {
      try {
        // Fetch with 10 second timeout
        const res = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, 10000);
        
        if (!res.ok) return [key, null];
        const data = await res.json();
        return [key, data];
      } catch (_error: unknown) {
        logger.warn(`[BatchData Priority] ${key} error:`, _error instanceof Error ? _error.message : 'Unknown error');
        return [key, null];
      }
    })
  );

  const result: BatchResult = {
    ticker: t,
    timestamp: new Date().toISOString(),
    fetchDuration: Date.now() - startTime,
    data: {}
  };

  const endpointKeys = Object.keys(endpoints)
  responses.forEach((__response, _index) => {
    const key = endpointKeys[_index] ?? 'unknown';
    if (__response.status === 'fulfilled') {
      const [dataKey, data] = __response.value;
      result.data[dataKey] = data;
    } else {
      result.data[key] = null;
    }
  });

  return result;
}

/**
 * Fetch latest quote only (lightweight refresh path)
 * Used to keep dynamic price data fresh without refetching full batch payload.
 */
export async function fetchTickerQuote(ticker: string, fmpApiKey: string): Promise<unknown[] | null> {
  const t = ticker.toUpperCase().trim()
  const baseUrl = 'https://financialmodelingprep.com'

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/v3/quote/${t}?apikey=${fmpApiKey}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, 8000)

    if (!res.ok) {
      logger.warn(`[BatchData Quote] ${t} failed: ${res.status}`)
      return null
    }

    const data = await res.json()
    return Array.isArray(data) ? data : null
  } catch (_error: unknown) {
    logger.warn(`[BatchData Quote] ${t} error: ${_error instanceof Error ? _error.message : 'Unknown error'}`)
    return null
  }
}

// Helper: Get date X months ago in YYYY-MM-DD format
function getDateMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0] || '';
}
