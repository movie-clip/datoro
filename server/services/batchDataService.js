// server/services/batchDataService.js
// Batch data fetcher - fetches all ticker data in one optimized request

/**
 * Fetch all data for a ticker in one batch
 * Returns everything needed for the dashboard in a single response
 */
export async function fetchTickerBatch(ticker, fmpApiKey) {
  const t = ticker.toUpperCase().trim();
  const baseUrl = 'https://financialmodelingprep.com';
  
  // All endpoints we need to fetch
  const endpoints = {
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
    
    // Ratios and metrics (Priority 1)
    ratiosAnnual: `/api/v3/ratios/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    keyMetrics: `/api/v4/key-metrics/${t}?period=annual&limit=20&apikey=${fmpApiKey}`,
    
    // Price data (Priority 1)
    priceHistory: `/api/v3/historical-price-full/${t}?apikey=${fmpApiKey}`,
    
    // Additional data (Priority 2)
    revenueSegments: `/api/v4/revenue-product-segmentation?symbol=${t}&structure=flat&apikey=${fmpApiKey}`,
    dividendHistory: `/api/v3/historical-price-full/stock_dividend/${t}?apikey=${fmpApiKey}`,
    stockSplit: `/api/v3/historical-price-full/stock_split/${t}?apikey=${fmpApiKey}`,
    earningsCalendar: `/api/v3/historical/earning_calendar/${t}?apikey=${fmpApiKey}`,
    financialScores: `/stable/financial-scores?symbol=${t}&apikey=${fmpApiKey}`,
    
    // Insider trading (Priority 2 - Less critical)
    insiderTrading: `/api/v4/insider-trading?symbol=${t}&limit=100&apikey=${fmpApiKey}`,
  };

  // Fetch all in parallel
  const startTime = Date.now();
  
  try {
    const responses = await Promise.allSettled(
      Object.entries(endpoints).map(async ([key, endpoint]) => {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!res.ok) {
          console.warn(`[BatchData] ${key} failed: ${res.status}`);
          return [key, null];
        }
        
        const data = await res.json();
        return [key, data];
      })
    );

    // Build result object
    const result = {
      ticker: t,
      timestamp: new Date().toISOString(),
      fetchDuration: Date.now() - startTime,
      data: {}
    };

    responses.forEach((response, index) => {
      const key = Object.keys(endpoints)[index];
      if (response.status === 'fulfilled') {
        const [dataKey, data] = response.value;
        result.data[dataKey] = data;
      } else {
        console.error(`[BatchData] ${key} error:`, response.reason);
        result.data[key] = null;
      }
    });

    return result;
  } catch (error) {
    console.error('[BatchData] Fatal error:', error);
    throw error;
  }
}

/**
 * Fetch minimal data for quick initial load (Priority 1 only)
 */
export async function fetchTickerPriority(ticker, fmpApiKey) {
  const t = ticker.toUpperCase().trim();
  const baseUrl = 'https://financialmodelingprep.com';
  
  // Only fetch critical data for instant display
  const endpoints = {
    profile: `/api/v3/profile/${t}?apikey=${fmpApiKey}`,
    quote: `/api/v3/quote/${t}?apikey=${fmpApiKey}`,
    incomeQuarter: `/api/v3/income-statement/${t}?period=quarter&limit=4&apikey=${fmpApiKey}`,
    priceHistory: `/api/v3/historical-price-full/${t}?from=${getDateMonthsAgo(12)}&apikey=${fmpApiKey}`,
  };

  const startTime = Date.now();
  
  const responses = await Promise.allSettled(
    Object.entries(endpoints).map(async ([key, endpoint]) => {
      const res = await fetch(`${baseUrl}${endpoint}`);
      if (!res.ok) return [key, null];
      const data = await res.json();
      return [key, data];
    })
  );

  const result = {
    ticker: t,
    timestamp: new Date().toISOString(),
    fetchDuration: Date.now() - startTime,
    data: {}
  };

  responses.forEach((response, index) => {
    const key = Object.keys(endpoints)[index];
    if (response.status === 'fulfilled') {
      const [dataKey, data] = response.value;
      result.data[dataKey] = data;
    } else {
      result.data[key] = null;
    }
  });

  return result;
}

// Helper: Get date X months ago in YYYY-MM-DD format
function getDateMonthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}
