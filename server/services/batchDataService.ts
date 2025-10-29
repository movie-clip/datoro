// server/services/batchDataService.ts
// Batch data fetcher - fetches all ticker data in one optimized request

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
    incomeQuarter: `/api/v3/income-statement/${t}?period=quarter&limit=20&apikey=${fmpApiKey}`,
    balanceAnnual: `/api/v3/balance-sheet-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    balanceQuarter: `/api/v3/balance-sheet-statement/${t}?period=quarter&limit=20&apikey=${fmpApiKey}`,
    cashflowAnnual: `/api/v3/cash-flow-statement/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    cashflowQuarter: `/api/v3/cash-flow-statement/${t}?period=quarter&limit=20&apikey=${fmpApiKey}`,
    
    // TTM data for DCF (Priority 1 - More accurate current metrics)
    ratiosTTM: `/api/v3/ratios-ttm/${t}?apikey=${fmpApiKey}`,
    keyMetricsTTM: `/api/v3/key-metrics-ttm/${t}?apikey=${fmpApiKey}`,
    
    // Ratios and metrics (Priority 1)
    ratiosAnnual: `/api/v3/ratios/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    keyMetrics: `/api/v4/key-metrics/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    
    // Price data (Priority 1)
    priceHistory: `/api/v3/historical-price-full/${t}?apikey=${fmpApiKey}`,
    
    // Valuation (Priority 1 - DCF from FMP)
    fmpDcf: `/api/v3/discounted-cash-flow/${t}?apikey=${fmpApiKey}`,
    
    // Advanced DCF (Priority 1 - Full 10-year projection model)
    advancedDcf: `/api/v4/advanced_discounted_cash_flow?symbol=${t}&apikey=${fmpApiKey}`,
    
    // Additional data (Priority 2)
    revenueSegments: `/api/v4/revenue-product-segmentation?symbol=${t}&structure=flat&apikey=${fmpApiKey}`,
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
  
  try {
    const responses = await Promise.allSettled(
      Object.entries(endpoints).map(async ([key, endpoint]): Promise<[string, any]> => {
        try {
          // Fetch with 8 second timeout (reduced from 10 for faster failures)
          const res = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }, 8000);
          
          if (!res.ok) {
            console.warn(`[BatchData] ${key} failed: ${res.status}`);
            if (key === 'advancedDcf') {
              console.error(`[BatchData] advancedDcf endpoint failed: ${baseUrl}${endpoint}`);
              console.error(`[BatchData] advancedDcf status: ${res.status}, statusText: ${res.statusText}`);
            }
            return [key, null];
          }
          
          const data = await res.json();
          if (key === 'advancedDcf') {
            console.log(`[BatchData] advancedDcf data received:`, Array.isArray(data) ? `Array length: ${data.length}` : typeof data);
          }
          return [key, data];
        } catch (_error: any) {
          console.warn(`[BatchData] ${key} error:`, _error.message);
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
        console.error(`[BatchData] ${key} error:`, __response.reason);
        result.data[key] = null;
        result.failures!.push(key);
      }
    });

    return result;
  } catch (_error) {
    console.error('[BatchData] Fatal error:', _error);
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
        console.warn(`[BatchData Priority] ${key} error:`, _error.message);
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
