// src/services/market/marketPerformanceService.ts
// Service for fetching and processing market sector performance data

import type { FMPSectorPerformance, FMPStockScreener } from '../../types/fmp.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071'

export interface SectorData {
  sector: string
  performance: number // Percentage as number (e.g., 1.23 for 1.23%)
  topStocks: StockData[]
  totalMarketCap: number
}

export interface StockData {
  symbol: string
  name: string
  marketCap: number
  price: number
  performance?: number
}

export interface SP500Performance {
  symbol: string
  name: string
  changesPercentage: string
  price?: number
  change?: number
}

/**
 * Fetch S&P 500 sector performance from server
 * @param period Time period: '1D', '1W', '1M', 'YTD', '3Y', '5Y', '10Y'
 */
export async function fetchSectorPerformance(period: string = '1D'): Promise<FMPSectorPerformance[]> {
  try {
    const url = `${API_BASE_URL}/api/market/sectors?period=${encodeURIComponent(period)}`
    console.info(`[Service] Fetching S&P 500 sectors from: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch S&P 500 sector performance: ${response.statusText}`)
    }

    const data = await response.json()
    console.info(`[Service] Received ${data.length} S&P 500 sectors for period ${period}:`, data.slice(0, 2))

    return data
  } catch (error) {
    console.error('Error fetching S&P 500 sector performance:', error)
    throw error
  }
}

/**
 * Fetch S&P 500 performance from server
 * @param period Time period: '1D', '1W', '1M', 'YTD', '3Y', '5Y', '10Y'
 */
export async function fetchSP500Performance(period: string = '1D'): Promise<SP500Performance> {
  try {
    const url = `${API_BASE_URL}/api/market/sp500?period=${encodeURIComponent(period)}`
    console.info(`[Service] Fetching S&P 500 from: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch S&P 500 performance: ${response.statusText}`)
    }

    const data = await response.json()
    console.info(`[Service] Received S&P 500 data for period ${period}:`, data)

    return data
  } catch (error) {
    console.error('Error fetching S&P 500 performance:', error)
    throw error
  }
}

/**
 * Fetch top stocks for a specific sector
 */
export async function fetchTopStocksForSector(
  sector: string,
  limit: number = 10
): Promise<FMPStockScreener[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/market/sectors/${encodeURIComponent(sector)}/stocks?limit=${limit}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch stocks for ${sector}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching stocks for ${sector}:`, error)
    throw error
  }
}

/**
 * Parse percentage string to number
 * "1.23%" -> 1.23
 */
function parsePercentage(percentageStr: string): number {
  return parseFloat(percentageStr.replace('%', ''))
}

/**
 * Get comprehensive sector data with top stocks
 */
export async function getSectorDataWithStocks(
  sector: string,
  period: string = '1D'
): Promise<SectorData> {
  const [performance, stocks] = await Promise.all([
    fetchSectorPerformance(period),
    fetchTopStocksForSector(sector, 10)
  ])

  const sectorPerf = performance.find(p => p.sector === sector)
  const performanceValue = sectorPerf ? parsePercentage(sectorPerf.changesPercentage) : 0

  const totalMarketCap = stocks.reduce((sum, stock) => sum + stock.marketCap, 0)

  const topStocks: StockData[] = stocks.map(stock => ({
    symbol: stock.symbol,
    name: stock.companyName,
    marketCap: stock.marketCap,
    price: stock.price,
    performance: performanceValue // Use sector performance as approximation
  }))

  return {
    sector,
    performance: performanceValue,
    topStocks,
    totalMarketCap
  }
}

/**
 * Get all sectors with their data for heatmap visualization
 * Simplified: Just sector-level data, no individual stocks
 * @param period Time period: '1D', '1W', '1M', 'YTD', '3Y', '5Y', '10Y'
 */
export async function getAllSectorsData(period: string = '1D'): Promise<SectorData[]> {
  const performance = await fetchSectorPerformance(period)

  // S&P 500 sector market caps (approximate, for visualization sizing)
  const sectorMarketCaps: Record<string, number> = {
    'Information Technology': 15000000000000, // $15T
    'Health Care': 10000000000000, // $10T
    'Financials': 12000000000000, // $12T
    'Consumer Discretionary': 8000000000000, // $8T
    'Communication Services': 7000000000000, // $7T
    'Industrials': 6000000000000, // $6T
    'Consumer Staples': 5000000000000, // $5T
    'Energy': 4000000000000, // $4T
    'Materials': 3000000000000, // $3T
    'Real Estate': 2000000000000, // $2T
    'Utilities': 2000000000000 // $2T
  }

  return performance.map(sectorPerf => ({
    sector: sectorPerf.sector,
    performance: parsePercentage(sectorPerf.changesPercentage),
    topStocks: [], // Not used in simplified version
    totalMarketCap: sectorMarketCaps[sectorPerf.sector] || 1000000000000 // Default 1T
  }))
}
