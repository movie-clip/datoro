// Deep Finder Configuration
// Settings for MA200 distance analysis

export const DEEP_FINDER_CONFIG = {
  // Moving average period (days)
  maPeriod: 200,
  
  // Minimum number of data points required
  minDataPoints: 200,
  
  // Cache duration in minutes
  cacheDuration: 5,
  
  // Color scheme for chart
  colors: {
    oversold: '#ef4444',      // Red for stocks below MA200
    overbought: '#00C087',    // Green for stocks above MA200
    neutral: '#9CA3AF'        // Gray for stocks near MA200
  },
  
  // Threshold for "neutral" range (within ±2%)
  neutralThreshold: 2
} as const
