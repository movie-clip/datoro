/**
 * Google Analytics 4 Service
 * 
 * Wrapper for GA4 event tracking with TypeScript safety.
 * Tracks user behavior for ad campaign optimization and ROI measurement.
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

/**
 * Check if GA4 is initialized and ready
 */
export const isGA4Ready = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

/**
 * Generic event tracking function
 * @param eventName - GA4 event name (e.g., 'search_ticker', 'sign_up')
 * @param params - Event parameters (custom dimensions/metrics)
 */
export const trackEvent = (eventName: string, params?: Record<string, any>): void => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
    
    // Development logging
    if (import.meta.env.DEV) {
      console.log('[GA4 Event]', eventName, params);
    }
  } else if (import.meta.env.DEV) {
    // Log warning in development if gtag is not available
    console.warn('[GA4] gtag not available, event not tracked:', eventName, params);
  }
};

/**
 * Track ticker search
 * @param ticker - Stock symbol searched (e.g., 'AAPL')
 * @param method - How user initiated search ('autocomplete' or 'direct')
 */
export const trackSearch = (ticker: string, method: 'autocomplete' | 'direct' = 'direct'): void => {
  trackEvent('search_ticker', {
    ticker_symbol: ticker.toUpperCase(),
    search_method: method,
  });
};

/**
 * Track successful ticker data load
 * @param ticker - Stock symbol loaded
 * @param loadTimeMs - Time taken to fetch data in milliseconds
 */
export const trackTickerView = (ticker: string, loadTimeMs?: number): void => {
  trackEvent('view_ticker_data', {
    ticker_symbol: ticker.toUpperCase(),
    data_load_time_ms: loadTimeMs,
  });
};

/**
 * Track watchlist addition
 * @param ticker - Stock symbol added to watchlist
 * @param isAuthenticated - Whether user is logged in
 */
export const trackWatchlistAdd = (ticker: string, isAuthenticated: boolean): void => {
  trackEvent('add_to_watchlist', {
    ticker_symbol: ticker.toUpperCase(),
    is_authenticated: isAuthenticated,
  });
};

/**
 * Track watchlist removal
 * @param ticker - Stock symbol removed from watchlist
 */
export const trackWatchlistRemove = (ticker: string): void => {
  trackEvent('remove_from_watchlist', {
    ticker_symbol: ticker.toUpperCase(),
  });
};

/**
 * Track user signup/registration
 * @param method - Signup method ('email' or 'google')
 */
export const trackSignup = (method: 'email' | 'google'): void => {
  trackEvent('sign_up', {
    method,
  });
};

/**
 * Track user login
 * @param method - Login method ('email' or 'google')
 */
export const trackLogin = (method: 'email' | 'google'): void => {
  trackEvent('login', {
    method,
  });
};

/**
 * Track email verification completion
 * @param hoursToVerify - Time between registration and verification (optional)
 */
export const trackEmailVerification = (hoursToVerify?: number): void => {
  trackEvent('verify_email', {
    time_to_verify_hours: hoursToVerify,
  });
};

/**
 * Track data export (premium feature)
 * @param exportType - Type of data exported ('watchlist' or 'ticker_data')
 * @param ticker - Stock symbol (for ticker_data exports)
 */
export const trackExport = (exportType: 'watchlist' | 'ticker_data', ticker?: string): void => {
  trackEvent('export_data', {
    export_type: exportType,
    ticker_symbol: ticker?.toUpperCase(),
  });
};

/**
 * Track chart interaction
 * @param chartType - Type of chart viewed (e.g., 'revenue', 'price', 'margins')
 * @param ticker - Stock symbol
 */
export const trackChartView = (chartType: string, ticker: string): void => {
  trackEvent('view_chart', {
    chart_type: chartType,
    ticker_symbol: ticker.toUpperCase(),
  });
};

/**
 * Track AI insights view
 * @param ticker - Stock symbol
 * @param insightType - Type of insight (e.g., 'health_indicators', 'growth_analysis')
 */
export const trackAIInsight = (ticker: string, insightType: string): void => {
  trackEvent('view_ai_insight', {
    ticker_symbol: ticker.toUpperCase(),
    insight_type: insightType,
  });
};

/**
 * Track Deep Finder tool usage
 * @param ticker - Current ticker (if any) when Deep Finder opened
 */
export const trackDeepFinderOpen = (ticker?: string): void => {
  trackEvent('open_deep_finder', {
    ticker_symbol: ticker?.toUpperCase(),
  });
};

/**
 * Track DCF Calculator tool usage
 * @param ticker - Current ticker (if any) when DCF Calculator opened
 */
export const trackDcfCalculatorOpen = (ticker?: string): void => {
  trackEvent('open_dcf_calculator', {
    ticker_symbol: ticker?.toUpperCase(),
  });
};

/**
 * Track Macro Dashboard tool usage
 */
export const trackMacroOpen = (): void => {
  trackEvent('open_macro_dashboard');
};

/**
 * Track errors for debugging
 * @param errorType - Type of error (e.g., 'api_error', 'chart_render_error')
 * @param errorMessage - Error message or code
 */
export const trackError = (errorType: string, errorMessage: string): void => {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
  });
};

/**
 * Update consent for analytics tracking
 * @param granted - Whether user granted analytics consent
 */
export const updateAnalyticsConsent = (granted: boolean): void => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
    });
    
    if (import.meta.env.DEV) {
      console.log('[GA4 Consent]', granted ? 'GRANTED' : 'DENIED');
    }
  }
};

/**
 * Set user ID for cross-device tracking (when logged in)
 * @param userId - User's unique identifier
 */
export const setUserId = (userId: string | null): void => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('config', window.GA_MEASUREMENT_ID || 'G-XXXXXXXXXX', {
      user_id: userId,
    });
  }
};
