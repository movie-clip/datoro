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
  data: Record<string, any>
  failures?: string[]
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
}

/**
 * Validate FMP API response with schema
 */
function validateResponse(dataKey: string, data: any): { valid: boolean; error?: string } {
  const schema = validationSchemas[dataKey]
  
  // Skip validation if no schema defined
  if (!schema) {
    return { valid: true }
  }
  
  try {
    schema.parse(data)
    return { valid: true }
  } catch (error: any) {
    const errorMsg = error.errors?.[0]?.message || error.message
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
  } catch (_error: any) {
    clearTimeout(timeoutId);
    if (_error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw _error;
  }
}

/**
 * Fetch all data for a ticker in one batch
 * Returns everything needed for the dashboard in a single response
 * Now fetches 24 endpoints (added Advanced DCF for detailed valuation)
 */
export async function fetchTickerBatch(ticker: string, fmpApiKey: string): Promise<BatchResult> {
  const t = ticker.toUpperCase().trim();
  const baseUrl = 'https://financialmodelingprep.com';
  
  // All endpoints we need to fetch (24 total - added Advanced DCF)
  const endpoints: Record<string, string> = {
    // Core company data (Priority 1 - Always needed)
    profile: `/api/v3/profile/${t}?apikey=${fmpApiKey}`,
    quote: `/api/v3/quote/${t}?apikey=${fmpApiKey}`,
    
    // Financial statements (Priority 1 - Most charts need these)
    incomeAnnual: `/api/v3/income-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    incomeQuarter: `/api/v3/income-statement/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    balanceAnnual: `/api/v3/balance-sheet-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    balanceQuarter: `/api/v3/balance-sheet-statement/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    cashflowAnnual: `/api/v3/cash-flow-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    cashflowQuarter: `/api/v3/cash-flow-statement/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    
    // TTM data for DCF (Priority 1 - More accurate current metrics)
    ratiosTTM: `/api/v3/ratios-ttm/${t}?apikey=${fmpApiKey}`,
    keyMetricsTTM: `/api/v3/key-metrics-ttm/${t}?apikey=${fmpApiKey}`,
    
    // Ratios and metrics (Priority 1)
    ratiosAnnual: `/api/v3/ratios/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    ratiosQuarter: `/api/v3/ratios/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    keyMetrics: `/api/v3/key-metrics/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    keyMetricsQuarter: `/api/v3/key-metrics/${t}?period=quarter&limit=40&apikey=${fmpApiKey}`,
    
    // Price data (Priority 1) - Fetch all available history from 30 years ago
    // Note: FMP historical-price-full endpoint may only return last 5 years by default,
    // so we explicitly use 'from' parameter to get full history (30 years should cover all stocks)
    priceHistory: `/api/v3/historical-price-full/${t}?from=${getDateMonthsAgo(360)}&apikey=${fmpApiKey}`,
    
    // Valuation (Priority 1 - DCF from FMP)
    fmpDcf: `/api/v3/discounted-cash-flow/${t}?apikey=${fmpApiKey}`,
    
    // Advanced DCF (Priority 1 - Full 10-year projection model)
    advancedDcf: `/api/v4/advanced_discounted_cash_flow?symbol=${t}&apikey=${fmpApiKey}`,
    
    // Additional data (Priority 2)
    revenueSegments: `/api/v4/revenue-product-segmentation?symbol=${t}&structure=flat&apikey=${fmpApiKey}`,
    revenueGeographicSegments: `/api/v4/revenue-geographic-segmentation?symbol=${t}&structure=flat&apikey=${fmpApiKey}`,
    dividendHistory: `/api/v3/historical-price-full/stock_dividend/${t}?apikey=${fmpApiKey}`,
    stockSplit: `/api/v3/historical-price-full/stock_split/${t}?apikey=${fmpApiKey}`,
    earningsCalendar: `/api/v3/historical/earning_calendar/${t}?apikey=${fmpApiKey}`,
    financialScores: `/api/v4/score?symbol=${t}&apikey=${fmpApiKey}`,
    
    // Analyst data (Priority 2)
    priceTargetSummary: `/api/v4/price-target-summary?symbol=${t}&apikey=${fmpApiKey}`,
    priceTargetConsensus: `/api/v4/price-target-consensus?symbol=${t}&apikey=${fmpApiKey}`,
    
    // Insider trading (Priority 2 - More historical data with search endpoint)
    insiderTrading: `/stable/insider-trading/search?symbol=${t}&page=0&limit=500&apikey=${fmpApiKey}`,
  };

  // Fetch all in parallel
  const startTime = Date.now();
  const endpointTimings: Record<string, number> = {};
  
  try {
    const responses = await Promise.allSettled(
      Object.entries(endpoints).map(async ([key, endpoint]): Promise<[string, any]> => {
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
            if (key === 'advancedDcf') {
              logger.error(`[BatchData] advancedDcf endpoint failed: ${baseUrl}${endpoint}`);
              logger.error(`[BatchData] advancedDcf status: ${res.status}, statusText: ${res.statusText}`);
            }
            return [key, null];
          }
          
          const data = await res.json();
          if (key === 'advancedDcf') {
            logger.info(`[BatchData] advancedDcf data received:`, Array.isArray(data) ? `Array length: ${data.length}` : typeof data);
          }
          return [key, data];
        } catch (_error: any) {
          const duration = Date.now() - endpointStart;
          endpointTimings[key] = duration;
          logger.warn(`[BatchData] ${key} error: ${_error.message} (${duration}ms)`);
          return [key, null];
        }
      })
    );

    // Build result object - ALWAYS return data, even if some endpoints failed
    const result: BatchResult = {
      ticker: t,
      timestamp: new Date().toISOString(),
      fetchDuration: Date.now() - startTime,
      data: {},
      failures: [] // Track which endpoints failed
    };

    responses.forEach((__response, _index) => {
      const key = Object.keys(endpoints)[_index];
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
        
        // Special handling: /api/v4/score returns object, but we need array for consistency
        if (dataKey === 'financialScores' && data && !Array.isArray(data)) {
          result.data[dataKey] = [data]; // Wrap in array
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
      logger.info(`[Batch] ${t} - Slow endpoints (>500ms):`, 
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
export async function fetchTickerPriority(ticker: string, fmpApiKey: string): Promise<BatchResult> {
  const t = ticker.toUpperCase().trim();
  const baseUrl = 'https://financialmodelingprep.com';
  
  // Only fetch critical data for instant display
  const endpoints: Record<string, string> = {
    profile: `/api/v3/profile/${t}?apikey=${fmpApiKey}`,
    quote: `/api/v3/quote/${t}?apikey=${fmpApiKey}`,
    incomeQuarter: `/api/v3/income-statement/${t}?period=quarter&limit=4&apikey=${fmpApiKey}`,
    priceHistory: `/api/v3/historical-price-full/${t}?from=${getDateMonthsAgo(12)}&apikey=${fmpApiKey}`,
  };

  const startTime = Date.now();
  
  const responses = await Promise.allSettled(
    Object.entries(endpoints).map(async ([key, endpoint]): Promise<[string, any]> => {
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
      } catch (_error: any) {
        logger.warn(`[BatchData Priority] ${key} error:`, _error.message);
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

  responses.forEach((__response, _index) => {
    const key = Object.keys(endpoints)[_index];
    if (__response.status === 'fulfilled') {
      const [dataKey, data] = __response.value;
      result.data[dataKey] = data;
    } else {
      result.data[key] = null;
    }
  });

  return result;
}

// Helper: Get date X months ago in YYYY-MM-DD format
function getDateMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

