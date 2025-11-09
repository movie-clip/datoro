// server/routes/marketPerformance.ts
// Market sector performance endpoints

import express, { type Request, type Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getCacheService } from '../services/cacheService.js'
import logger from '../services/logger.js'

const router = express.Router()
const cache = getCacheService()

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE_URL = 'https://financialmodelingprep.com'
const CACHE_TTL = 5 * 60 // 5 minutes in seconds

/**
 * GET /api/market/sectors
 * Get S&P 500 sector index performance (not general market sectors)
 * Query params:
 *   - period: 1D (default), 1W, 1M, YTD, 3Y, 5Y, 10Y
 */
router.get('/sectors', asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || '1D'
  const cacheKey = `market:sp500-sectors:v2:${period}` // v2 to avoid old cache
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving S&P 500 sector performance (${period}) from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // S&P 500 sector symbols mapping
  const sp500SectorSymbols: Record<string, string> = {
    '^SP500-45': 'Information Technology',
    '^SP500-35': 'Health Care',
    '^SP500-40': 'Financials',
    '^SP500-25': 'Consumer Discretionary',
    '^SP500-50': 'Communication Services',
    '^SP500-20': 'Industrials',
    '^SP500-30': 'Consumer Staples',
    '^GSPE': 'Energy',
    '^SP500-15': 'Materials',
    '^SP500-60': 'Real Estate',
    '^SP500-55': 'Utilities'
  }
  
  // For 1D (current day), use real-time S&P 500 sector quotes
  if (period === '1D') {
    try {
      const sectorPromises = Object.entries(sp500SectorSymbols).map(async ([symbol, name]) => {
        const url = `${FMP_BASE_URL}/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${FMP_API_KEY}`
        const response = await fetch(url)
        
        if (!response.ok) {
          logger.warn(`Failed to fetch ${symbol}: ${response.statusText}`)
          return null
        }
        
        const data: any = await response.json()
        
        if (!data || data.length === 0) {
          return null
        }
        
        return {
          sector: name,
          changesPercentage: `${data[0].changesPercentage.toFixed(2)}%`
        }
      })
      
      const results = await Promise.all(sectorPromises)
      const validResults = results.filter(r => r !== null)
      
      // Cache the result
      await cache.set(cacheKey, validResults, CACHE_TTL)
      
      res.setHeader('X-Cache', 'MISS')
      res.json(validResults)
    } catch (error) {
      logger.error('Error fetching S&P 500 sector performance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      res.status(500).json({
        error: 'Failed to fetch S&P 500 sector performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    return
  }
  
  // For historical periods, fetch historical data for each S&P 500 sector
  try {
    const sectorPromises = Object.entries(sp500SectorSymbols).map(async ([symbol, name]) => {
      const url = `${FMP_BASE_URL}/api/v3/historical-price-full/${encodeURIComponent(symbol)}?apikey=${FMP_API_KEY}`
      const response = await fetch(url)
      
      if (!response.ok) {
        logger.warn(`Failed to fetch historical data for ${symbol}: ${response.statusText}`)
        return null
      }
      
      const data: any = await response.json()
      
      if (!data || !data.historical || data.historical.length === 0) {
        return null
      }
      
      // Calculate cumulative performance for the period
      const performance = calculateSP500PeriodPerformance(data.historical, period)
      
      return {
        sector: name,
        changesPercentage: performance.changesPercentage
      }
    })
    
    const results = await Promise.all(sectorPromises)
    const validResults = results.filter(r => r !== null)
    
    // Cache the result
    await cache.set(cacheKey, validResults, CACHE_TTL * 2) // 10 minutes for historical
    
    res.setHeader('X-Cache', 'MISS')
    res.json(validResults)
  } catch (error) {
    logger.error(`Error fetching S&P 500 sector historical performance for ${period}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: 'Failed to fetch S&P 500 sector historical performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * GET /api/market/sectors/custom-range
 * Get S&P 500 sector performance for a custom date range
 * Query params:
 *   - startDate: YYYY-MM-DD
 *   - endDate: YYYY-MM-DD
 */
router.get('/sectors/custom-range', asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string
  const endDate = req.query.endDate as string
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'startDate and endDate are required'
    })
  }
  
  const cacheKey = `market:sp500-sectors:custom:${startDate}:${endDate}`
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving S&P 500 sector custom range (${startDate} to ${endDate}) from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // S&P 500 sector index symbols
  const sp500SectorSymbols: Record<string, string> = {
    '^SP500-45': 'Information Technology',
    '^SP500-35': 'Health Care',
    '^SP500-40': 'Financials',
    '^SP500-25': 'Consumer Discretionary',
    '^SP500-50': 'Communication Services',
    '^SP500-20': 'Industrials',
    '^SP500-30': 'Consumer Staples',
    '^GSPE': 'Energy',
    '^SP500-15': 'Materials',
    '^SP500-60': 'Real Estate',
    '^SP500-55': 'Utilities'
  }
  
  try {
    // Fetch historical data for each sector
    const sectorPromises = Object.entries(sp500SectorSymbols).map(async ([symbol, name]) => {
      const url = `${FMP_BASE_URL}/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${startDate}&to=${endDate}&apikey=${FMP_API_KEY}`
      
      try {
        const response = await fetch(url)
        
        if (!response.ok) {
          logger.warn(`Failed to fetch historical data for ${symbol}: ${response.statusText}`)
          return null
        }
        
        const data: any = await response.json()
        
        if (!data || !data.historical || data.historical.length === 0) {
          return null
        }
        
        // Calculate performance: (end price - start price) / start price * 100
        const historicalData = data.historical.sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        
        const startPrice = historicalData[0].close
        const endPrice = historicalData[historicalData.length - 1].close
        const performance = ((endPrice - startPrice) / startPrice) * 100
        
        return {
          sector: name,
          changesPercentage: `${performance.toFixed(2)}%`
        }
      } catch (error) {
        logger.warn(`Error fetching ${symbol}:`, error)
        return null
      }
    })
    
    const results = await Promise.all(sectorPromises)
    const validResults = results.filter(r => r !== null)
    
    // Cache the result (30 minutes for custom range)
    await cache.set(cacheKey, validResults, CACHE_TTL * 6)
    
    res.setHeader('X-Cache', 'MISS')
    res.json(validResults)
  } catch (error) {
    logger.error(`Error fetching S&P 500 sector custom range (${startDate} to ${endDate})`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: 'Failed to fetch S&P 500 sector custom range',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * Calculate sector performance for a given period from historical data
 * Historical data format: { date: '2025-11-07', basicMaterialsChangesPercentage: 0.90489, ... }
 */
function calculatePeriodPerformance(historicalData: any[], period: string): any[] {
  if (!historicalData || historicalData.length === 0) {
    return []
  }

  const now = new Date()
  let startDate: Date
  
  // Determine start date based on period
  switch (period) {
    case '1W':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '1M':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case '3Y':
      startDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)
      break
    case '5Y':
      startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
      break
    case '10Y':
      startDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = now // Default to current
  }
  
  // Filter data within the period
  const periodData = historicalData.filter((item: any) => {
    const itemDate = new Date(item.date)
    return itemDate >= startDate && itemDate <= now
  })
  
  if (periodData.length === 0) {
    return []
  }
  
  // Map FMP column names to sector names
  const sectorMapping: Record<string, string> = {
    'basicMaterialsChangesPercentage': 'Materials',
    'communicationServicesChangesPercentage': 'Communication Services',
    'consumerCyclicalChangesPercentage': 'Consumer Cyclical',
    'consumerDefensiveChangesPercentage': 'Consumer Defensive',
    'energyChangesPercentage': 'Energy',
    'financialServicesChangesPercentage': 'Financials',
    'healthcareChangesPercentage': 'Health Care',
    'industrialsChangesPercentage': 'Industrials',
    'realEstateChangesPercentage': 'Real Estate',
    'technologyChangesPercentage': 'Information Technology',
    'utilitiesChangesPercentage': 'Utilities'
  }
  
  // Calculate average performance for each sector over the period
  const sectorPerformances: Record<string, number[]> = {}
  
  periodData.forEach((day: any) => {
    Object.entries(sectorMapping).forEach(([key, sectorName]) => {
      if (day[key] !== undefined && day[key] !== null) {
        if (!sectorPerformances[sectorName]) {
          sectorPerformances[sectorName] = []
        }
        sectorPerformances[sectorName].push(Number(day[key]))
      }
    })
  })
  
  // Calculate cumulative performance for each sector
  const result: any[] = []
  
  Object.entries(sectorPerformances).forEach(([sector, performances]) => {
    if (performances.length === 0) return
    
    // Sum all daily changes to get total performance over period
    const totalPerformance = performances.reduce((sum, val) => sum + val, 0)
    
    result.push({
      sector,
      changesPercentage: `${totalPerformance.toFixed(2)}%`
    })
  })
  
  return result
}

/**
 * GET /api/market/sp500
 * Get S&P 500 performance for a specific period
 * Query params:
 *   - period: 1D (default), 1W, 1M, YTD, 3Y, 5Y, 10Y
 */
router.get('/sp500', asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || '1D'
  const cacheKey = `market:sp500:v2:${period}` // v2 - fixed YTD calculation
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving S&P 500 performance (${period}) from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // For 1D (current day), use real-time quote
  if (period === '1D') {
    const url = `${FMP_BASE_URL}/api/v3/quote/%5EGSPC?apikey=${FMP_API_KEY}`
    
    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`)
      }
      
      const data: any = await response.json()
      
      if (!data || data.length === 0) {
        throw new Error('No S&P 500 data received')
      }
      
      const sp500Data = {
        symbol: data[0].symbol,
        name: data[0].name,
        price: data[0].price,
        change: data[0].change,
        changesPercentage: `${data[0].changesPercentage.toFixed(2)}%`
      }
      
      // Cache the result
      await cache.set(cacheKey, sp500Data, CACHE_TTL)
      
      res.setHeader('X-Cache', 'MISS')
      res.json(sp500Data)
    } catch (error) {
      logger.error('Error fetching S&P 500 performance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      res.status(500).json({
        error: 'Failed to fetch S&P 500 performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    return
  }
  
  // For historical periods, use historical price data
  const url = `${FMP_BASE_URL}/api/v3/historical-price-full/%5EGSPC?apikey=${FMP_API_KEY}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data: any = await response.json()
    
    if (!data || !data.historical || data.historical.length === 0) {
      throw new Error('No S&P 500 historical data received')
    }
    
    const historicalData = data.historical
    
    // Calculate performance based on period
    const processedData = calculateSP500PeriodPerformance(historicalData, period)
    
    // Cache the result
    await cache.set(cacheKey, processedData, CACHE_TTL * 2) // 10 minutes for historical
    
    res.setHeader('X-Cache', 'MISS')
    res.json(processedData)
  } catch (error) {
    logger.error(`Error fetching S&P 500 historical performance for ${period}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: 'Failed to fetch S&P 500 historical performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * GET /api/market/sp500/historical
 * Get S&P 500 historical price data for charting
 * Query params:
 *   - period: 1D, 1W, 1M, YTD, 3Y, 5Y, 10Y, 20Y (default: YTD)
 */
router.get('/sp500/historical', asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'YTD'
  const cacheKey = `market:sp500:historical:${period}`
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving S&P 500 historical data (${period}) from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // Fetch full historical data from FMP
  // Add 'from' parameter to get maximum historical data (20 years)
  const date20YearsAgo = new Date()
  date20YearsAgo.setFullYear(date20YearsAgo.getFullYear() - 20)
  const fromDate = date20YearsAgo.toISOString().split('T')[0] // YYYY-MM-DD format
  
  const url = `${FMP_BASE_URL}/api/v3/historical-price-full/%5EGSPC?from=${fromDate}&apikey=${FMP_API_KEY}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data: any = await response.json()
    
    if (!data || !data.historical || data.historical.length === 0) {
      throw new Error('No S&P 500 historical data received')
    }
    
    // Filter data based on period
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case '1D':
        // For 1D, just show the last trading day (most recent data point)
        const result1D = {
          symbol: '^GSPC',
          historical: data.historical.slice(0, 1) // Just the most recent day
        }
        await cache.set(cacheKey, result1D, CACHE_TTL * 2)
        res.setHeader('X-Cache', 'MISS')
        return res.json(result1D)
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case '3Y':
        startDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)
        break
      case '5Y':
        startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
        break
      case '10Y':
        startDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)
        break
      case '20Y':
        startDate = new Date(now.getTime() - 20 * 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1) // Default to YTD
    }
    
    const filteredData = data.historical
      .filter((item: any) => new Date(item.date) >= startDate)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const result = {
      symbol: '^GSPC',
      historical: filteredData
    }
    
    // Cache the result (10 minutes for historical data)
    await cache.set(cacheKey, result, CACHE_TTL * 2)
    
    res.setHeader('X-Cache', 'MISS')
    res.json(result)
  } catch (error) {
    logger.error(`Error fetching S&P 500 historical data for ${period}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: 'Failed to fetch S&P 500 historical data',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * GET /api/market/index/historical
 * Get historical price data for any market index (S&P 500, NASDAQ, Russell 2000)
 * Fetches up to 20 years of historical data from FMP API
 * Query params:
 *   - symbol: SPX (^GSPC), NASDAQ (^IXIC), RUSSELL (^RUT) - default: SPX
 *   - period: 1D, 1W, 1M, YTD, 3Y, 5Y, 10Y, 20Y (default: YTD)
 */
router.get('/index/historical', asyncHandler(async (req: Request, res: Response) => {
  const indexSymbol = (req.query.symbol as string) || 'SPX'
  const period = (req.query.period as string) || 'YTD'
  
  // Map friendly names to FMP symbols
  const symbolMap: Record<string, { fmpSymbol: string; name: string }> = {
    'SPX': { fmpSymbol: '^GSPC', name: 'S&P 500' },
    'NASDAQ': { fmpSymbol: '^IXIC', name: 'NASDAQ Composite' },
    'RUSSELL': { fmpSymbol: '^RUT', name: 'Russell 2000' }
  }
  
  const indexInfo = symbolMap[indexSymbol]
  if (!indexInfo) {
    return res.status(400).json({
      error: 'Invalid index symbol',
      message: `Symbol must be one of: ${Object.keys(symbolMap).join(', ')}`
    })
  }
  
  const cacheKey = `market:index:${indexSymbol}:historical:${period}`
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving ${indexInfo.name} historical data (${period}) from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // Fetch full historical data from FMP
  // Add 'from' parameter to get maximum historical data (20 years)
  const date20YearsAgo = new Date()
  date20YearsAgo.setFullYear(date20YearsAgo.getFullYear() - 20)
  const fromDate = date20YearsAgo.toISOString().split('T')[0] // YYYY-MM-DD format
  
  const url = `${FMP_BASE_URL}/api/v3/historical-price-full/${encodeURIComponent(indexInfo.fmpSymbol)}?from=${fromDate}&apikey=${FMP_API_KEY}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data: any = await response.json()
    
    if (!data || !data.historical || data.historical.length === 0) {
      throw new Error(`No ${indexInfo.name} historical data received`)
    }
    
    // Filter data based on period
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case '1D':
        // For 1D, just show the last trading day (most recent data point)
        const result1D = {
          symbol: indexInfo.fmpSymbol,
          name: indexInfo.name,
          historical: data.historical.slice(0, 1) // Just the most recent day
        }
        await cache.set(cacheKey, result1D, CACHE_TTL * 2)
        res.setHeader('X-Cache', 'MISS')
        return res.json(result1D)
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case '3Y':
        startDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)
        break
      case '5Y':
        startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
        break
      case '10Y':
        startDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)
        break
      case '20Y':
        startDate = new Date(now.getTime() - 20 * 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1) // Default to YTD
    }
    
    const filteredData = data.historical
      .filter((item: any) => new Date(item.date) >= startDate)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const result = {
      symbol: indexInfo.fmpSymbol,
      name: indexInfo.name,
      historical: filteredData
    }
    
    // Cache the result (10 minutes for historical data)
    await cache.set(cacheKey, result, CACHE_TTL * 2)
    
    logger.info(`Fetched ${indexInfo.name} historical data: ${filteredData.length} points for ${period}`)
    res.setHeader('X-Cache', 'MISS')
    res.json(result)
  } catch (error) {
    logger.error(`Error fetching ${indexInfo.name} historical data for ${period}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: `Failed to fetch ${indexInfo.name} historical data`,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * Calculate S&P 500 performance for a given period from historical data
 * Historical data format: { date: '2025-11-07', close: 6728.81, changePercent: 0.48729, ... }
 */
function calculateSP500PeriodPerformance(historicalData: any[], period: string): any {
  if (!historicalData || historicalData.length === 0) {
    return { symbol: '^GSPC', name: 'S&P 500', changesPercentage: '0.00%' }
  }

  const now = new Date()
  let startDate: Date
  
  // Determine start date based on period
  switch (period) {
    case '1W':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '1M':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case '3Y':
      startDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)
      break
    case '5Y':
      startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
      break
    case '10Y':
      startDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = now
  }
  
  // Filter data within the period and sort by date ascending
  const periodData = historicalData
    .filter((item: any) => {
      const itemDate = new Date(item.date)
      return itemDate >= startDate && itemDate <= now
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (periodData.length === 0) {
    return { symbol: '^GSPC', name: 'S&P 500', changesPercentage: '0.00%' }
  }
  
  // Calculate performance: (current price - start price) / start price * 100
  const startPrice = periodData[0].close
  const endPrice = periodData[periodData.length - 1].close
  const totalPerformance = ((endPrice - startPrice) / startPrice) * 100
  
  return {
    symbol: '^GSPC',
    name: 'S&P 500',
    changesPercentage: `${totalPerformance.toFixed(2)}%`,
    price: endPrice
  }
}

/**
 * GET /api/market/sectors/:sector/stocks
 * Get top stocks for a specific sector
 */
router.get('/sectors/:sector/stocks', asyncHandler(async (req: Request, res: Response) => {
  const { sector } = req.params
  const limit = parseInt(req.query.limit as string) || 10
  
  const cacheKey = `market:sector:${sector}:stocks:${limit}`
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving ${sector} stocks from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // Fetch from FMP stock screener
  const url = `${FMP_BASE_URL}/api/v3/stock-screener?sector=${encodeURIComponent(sector)}&marketCapMoreThan=1000000000&limit=${limit}&apikey=${FMP_API_KEY}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache the result (longer TTL for stocks list as it changes less frequently)
    await cache.set(cacheKey, data, CACHE_TTL * 2) // 10 minutes
    
    res.setHeader('X-Cache', 'MISS')
    res.json(data)
  } catch (error) {
    logger.error(`Error fetching stocks for ${sector}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: `Failed to fetch stocks for ${sector}`,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * GET /api/market/sectors/:sector/history
 * Get historical performance for a sector
 */
router.get('/sectors/:sector/history', asyncHandler(async (req: Request, res: Response) => {
  const { sector } = req.params
  
  const cacheKey = `market:sector:${sector}:history`
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached.data) {
    logger.debug(`Serving ${sector} history from cache`)
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached.data)
  }
  
  // Fetch from FMP historical sector performance
  const url = `${FMP_BASE_URL}/stable/historical-sector-performance?sector=${encodeURIComponent(sector)}&apikey=${FMP_API_KEY}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache the result (longer TTL for historical data)
    await cache.set(cacheKey, data, 60 * 60) // 1 hour
    
    res.setHeader('X-Cache', 'MISS')
    res.json(data)
  } catch (error) {
    logger.error(`Error fetching history for ${sector}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: `Failed to fetch history for ${sector}`,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

export default router
