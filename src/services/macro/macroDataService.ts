/**
 * Macro Economic Data Service
 * Fetches macro economic indicators from FMP API
 */

import { API_BASE_URL } from '../../utils/apiConfig'

export interface TreasuryRate {
  date: string
  month1: number
  month3: number
  month6: number
  year1: number
  year2: number
  year5: number
  year10: number
  year30: number
}

export interface EconomicIndicator {
  date: string
  value: number
}

export interface MarketIndexPoint {
  date: string
  close: number
  open: number
  high: number
  low: number
  volume: number
  changePercent: number
}

export interface IndexStats {
  symbol: string
  '1D': number
  '5D': number
  '1M': number
  '3M': number
  '6M': number
  ytd: number
  '1Y': number
  '3Y': number
  '5Y': number
  '10Y': number
  max: number
}

export interface SectorPerformance {
  sector: string
  changesPercentage: string
}

export interface RiskPremium {
  country: string
  continent: string
  countryRiskPremium: number
  totalEquityRiskPremium: number
}

export interface MacroData {
  treasuryRates: TreasuryRate[]
  federalFunds: EconomicIndicator[]
  consumerSentiment: EconomicIndicator[]
  retailSales: EconomicIndicator[]
  inflation: EconomicIndicator[]
  unemploymentRate: EconomicIndicator[]
  indexStats: IndexStats[]
  housingStarts: EconomicIndicator[]
  timestamp: string
}

export interface EUMacroData {
  inflation: EconomicIndicator[]
  unemploymentRate: EconomicIndicator[]
  interestRate: EconomicIndicator[]  // ECB rate instead of Fed Funds
  gdp: EconomicIndicator[]
  buildingPermits: EconomicIndicator[]  // Housing equivalent
  consumerConfidence: EconomicIndicator[]  // Consumer sentiment equivalent
  retailSales: EconomicIndicator[]
  indexStats: IndexStats[]  // European market indices (STOXX 50, DAX, CAC 40, FTSE 100)
  timestamp: string
}

export type Region = 'US' | 'EU'

/**
 * Fetch Treasury Rates (yield curve)
 */
export async function fetchTreasuryRates(from?: string, to?: string): Promise<TreasuryRate[]> {
  const fromDate = from || getDateMonthsAgo(12)
  const toDate = to || getTodayDate()
  
  const response = await fetch(`${API_BASE_URL}/api/macro/treasury?from=${fromDate}&to=${toDate}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch treasury rates: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch Economic Indicator by name
 */
export async function fetchEconomicIndicator(name: string): Promise<EconomicIndicator[]> {
  const response = await fetch(`${API_BASE_URL}/api/macro/economic?name=${name}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${name}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch S&P 500 historical data
 */
export async function fetchSPXData(from?: string, to?: string): Promise<MarketIndexPoint[]> {
  const fromDate = from || getDateMonthsAgo(12)
  const toDate = to || getTodayDate()
  
  const response = await fetch(`${API_BASE_URL}/api/macro/spx?from=${fromDate}&to=${toDate}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch SPX data: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch market index statistics (S&P 500, Dow Jones, Russell 2000)
 */
export async function fetchIndexStats(): Promise<IndexStats[]> {
  const response = await fetch(`${API_BASE_URL}/api/macro/index-stats`)
  if (!response.ok) {
    throw new Error(`Failed to fetch index stats: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch sector performance data
 */
export async function fetchSectorPerformance(): Promise<SectorPerformance[]> {
  const response = await fetch(`${API_BASE_URL}/api/macro/sectors`)
  if (!response.ok) {
    throw new Error(`Failed to fetch sector performance: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch market risk premium data
 */
export async function fetchRiskPremium(): Promise<RiskPremium[]> {
  const response = await fetch(`${API_BASE_URL}/api/macro/risk-premium`)
  if (!response.ok) {
    throw new Error(`Failed to fetch risk premium: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch all macro data in one batch request (OPTIMIZED - 1 request instead of 10+)
 */
export async function fetchAllMacroData(region: Region = 'US'): Promise<MacroData | EUMacroData> {
  if (region === 'EU') {
    return fetchAllEUMacroData()
  }
  
  const from = getDateMonthsAgo(24) // 2 years of data
  const to = getTodayDate()
  
  const startTime = performance.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/macro/batch?from=${from}&to=${to}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch macro data: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return data
  } catch (error) {
    return fetchAllMacroDataLegacy()
  }
}

/**
 * Fetch all EU macro data from Eurostat
 */
export async function fetchAllEUMacroData(): Promise<EUMacroData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch EU macro data: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return data
  } catch (error) {
    // Return empty data structure on failure
    return {
      inflation: [],
      unemploymentRate: [],
      interestRate: [],
      gdp: [],
      buildingPermits: [],
      consumerConfidence: [],
      retailSales: [],
      indexStats: [],  // Include indexStats in fallback
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * LEGACY: Fetch all macro data individually (10+ requests)
 * Only used as fallback if batch endpoint fails
 */
async function fetchAllMacroDataLegacy(): Promise<MacroData> {
  const from = getDateMonthsAgo(24)
  const to = getTodayDate()
  
  // Use Promise.allSettled to handle partial failures gracefully
  const results = await Promise.allSettled([
    fetchTreasuryRates(from, to),
    fetchEconomicIndicator('federalFunds'),
    fetchEconomicIndicator('consumerSentiment'),
    fetchEconomicIndicator('retailSales'),
    fetchEconomicIndicator('inflation'),
    fetchEconomicIndicator('unemploymentRate'),
    fetchSPXData(from, to),
    fetchIndexStats(),
    fetchSectorPerformance(),
    fetchRiskPremium()
  ])
  
  // Extract data or use empty arrays for failed requests
  const [
    treasuryRatesResult,
    federalFundsResult,
    consumerSentimentResult,
    retailSalesResult,
    inflationResult,
    unemploymentRateResult,
    spxResult,
    indexStatsResult,
    sectorsResult,
    riskPremiumResult
  ] = results
  
  return {
    treasuryRates: treasuryRatesResult.status === 'fulfilled' ? treasuryRatesResult.value : [],
    federalFunds: (federalFundsResult.status === 'fulfilled' ? federalFundsResult.value : []).slice(0, 50),
    consumerSentiment: (consumerSentimentResult.status === 'fulfilled' ? consumerSentimentResult.value : []).slice(0, 50),
    retailSales: (retailSalesResult.status === 'fulfilled' ? retailSalesResult.value : []).slice(0, 50),
    inflation: (inflationResult.status === 'fulfilled' ? inflationResult.value : []).slice(0, 250), // 250 points for SMA200
    unemploymentRate: (unemploymentRateResult.status === 'fulfilled' ? unemploymentRateResult.value : []).slice(0, 50),
    indexStats: indexStatsResult.status === 'fulfilled' ? indexStatsResult.value : [],
    housingStarts: [], // Not available in legacy fallback
    timestamp: new Date().toISOString()
  }
}

/**
 * Helper: Get date N months ago in YYYY-MM-DD format
 */
function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0] || ''
}

/**
 * Helper: Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] || ''
}
