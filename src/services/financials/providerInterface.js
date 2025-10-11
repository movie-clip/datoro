// src/services/financials/providerInterface.js
// Defines the contract for all financial data providers (Yahoo, FMP, Finnhub, etc.)

/**
 * @typedef {Object} FinancialProvider
 * @property {(ticker: string, period?: string) => Promise<{data: any, error: string|null}>} getValuation
 * @property {(ticker: string, period?: string) => Promise<{data: any, error: string|null}>} getCashFlowFacts
 * @property {(ticker: string, period?: string) => Promise<{data: any, error: string|null}>} getMarginsGrowth
 * @property {(ticker: string, period?: string) => Promise<{data: any, error: string|null}>} getRevenueSeries
 * @property {(ticker: string, period?: string) => Promise<{data: any, error: string|null}>} getFcfSeries
 */

// Example interface (all providers must implement these methods)
export default {
  getValuation: async (ticker, period) => { throw new Error('Not implemented') },
  getCashFlowFacts: async (ticker, period) => { throw new Error('Not implemented') },
  getMarginsGrowth: async (ticker, period) => { throw new Error('Not implemented') },
  getRevenueSeries: async (ticker, period) => { throw new Error('Not implemented') },
  getFcfSeries: async (ticker, period) => { throw new Error('Not implemented') },
}
