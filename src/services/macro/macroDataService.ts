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

export interface MacroData {
  treasuryRates: TreasuryRate[]
  federalFunds: EconomicIndicator[]
  consumerSentiment: EconomicIndicator[]
  retailSales: EconomicIndicator[]
  inflation: EconomicIndicator[]
  unemploymentRate: EconomicIndicator[]
  spx: MarketIndexPoint[]
  timestamp: string
}

/**
 * Fetch Treasury Rates (yield curve)
 */
export async function fetchTreasuryRates(from?: string, to?: string): Promise<TreasuryRate[]> {
  const fromDate = from || getDateMonthsAgo(12)
  const toDate = to || getTodayDate()
  
  const response = await fetch(`${API_BASE_URL}/api/macro/treasury?from=${fromDate}&to=${toDate}`)
  if (!response.ok) {
    const text = await response.text()
    console.error('[Macro] Treasury response:', text.substring(0, 200))
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
 * Fetch all macro data in one call
 */
export async function fetchAllMacroData(): Promise<MacroData> {
  const from = getDateMonthsAgo(24) // 2 years of data
  const to = getTodayDate()
  
  const [treasuryRates, federalFunds, consumerSentiment, retailSales, inflation, unemploymentRate, spx] = await Promise.all([
    fetchTreasuryRates(from, to),
    fetchEconomicIndicator('federalFunds'),
    fetchEconomicIndicator('consumerSentiment'),
    fetchEconomicIndicator('retailSales'),
    fetchEconomicIndicator('inflation'),
    fetchEconomicIndicator('unemploymentRate'),
    fetchSPXData(from, to)
  ])
  
  return {
    treasuryRates,
    federalFunds: federalFunds.slice(0, 50), // Last 50 data points
    consumerSentiment: consumerSentiment.slice(0, 50),
    retailSales: retailSales.slice(0, 50),
    inflation: inflation.slice(0, 50),
    unemploymentRate: unemploymentRate.slice(0, 50),
    spx,
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
