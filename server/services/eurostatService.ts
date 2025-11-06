/**
 * Eurostat API Service
 * Fetches macro economic indicators for EU from Eurostat REST API
 * 
 * API Documentation: https://ec.europa.eu/eurostat/web/json-and-unicode-web-services/getting-started/rest-request
 * Data Format: JSON-stat 2.0
 * 
 * Features:
 * - No API key required (free public API)
 * - CORS enabled
 * - Updated twice daily (11:00, 23:00 CET)
 */

import logger from './logger.js'

const EUROSTAT_BASE_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

export interface EurostatDataPoint {
  date: string
  value: number
}

export interface EurostatResponse {
  version: string
  class: string
  label: string
  updated: string
  value: Record<string, number>
  dimension: Record<string, {
    category?: {
      index: Record<string, number>
      label: Record<string, string>
    }
  }>
}

/**
 * Parse Eurostat JSON-stat 2.0 format into simple array
 */
function parseEurostatData(data: EurostatResponse): EurostatDataPoint[] {
  try {
    const timeLabels = data.dimension?.time?.category?.label
    const values = data.value
    
    if (!timeLabels || !values) {
      logger.warn('[Eurostat] Missing time labels or values in response')
      return []
    }
    
    // Get all dimension names and their sizes
    const dimensions = data.dimension
    const dimNames = Object.keys(dimensions)
    const dimSizes = dimNames.map(name => {
      const dim = dimensions[name as keyof typeof dimensions]
      return dim?.category?.index ? Object.keys(dim.category.index).length : 0
    })
    
    // Find time dimension index
    const timeIndex = dimNames.indexOf('time')
    if (timeIndex === -1) {
      logger.warn('[Eurostat] No time dimension found')
      return []
    }
    
    // Calculate time dimension stride (how many values to skip to get to next time period)
    let stride = 1
    for (let i = dimNames.length - 1; i > timeIndex; i--) {
      stride *= dimSizes[i]
    }
    
    // Extract data for the first series only (simplest approach for multi-dimensional data)
    const result: EurostatDataPoint[] = []
    const timeDim = data.dimension['time' as keyof typeof dimensions]
    if (!timeDim?.category?.index) {
      logger.warn('[Eurostat] Time dimension has no category index')
      return []
    }
    
    const timeKeys = Object.keys(timeDim.category.index)
    
    for (let i = 0; i < timeKeys.length; i++) {
      const valueIndex = i * stride
      const value = values[valueIndex.toString()]
      
      // Skip null/undefined values
      if (value !== null && value !== undefined && !isNaN(value)) {
        result.push({
          date: timeKeys[i],
          value: value
        })
      }
    }
    
    // Sort by date (oldest first)
    return result.sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    logger.error('[Eurostat] Failed to parse data:', error)
    return []
  }
}

/**
 * Generic fetch function for Eurostat API
 */
async function fetchEurostatDataset(
  dataset: string,
  params: Record<string, string>
): Promise<EurostatDataPoint[]> {
  const queryString = new URLSearchParams(params).toString()
  const url = `${EUROSTAT_BASE_URL}/${dataset}?${queryString}`
  
  logger.info(`[Eurostat] Fetching: ${dataset}`)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Eurostat API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json() as EurostatResponse
    return parseEurostatData(data)
  } catch (error) {
    logger.error(`[Eurostat] Failed to fetch ${dataset}:`, error)
    throw error
  }
}

/**
 * 1. EU Inflation (HICP - Harmonized Index of Consumer Prices)
 * Dataset: prc_hicp_manr
 * Coverage: ~28 years (1997-2025)
 */
export async function fetchEUInflation(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('prc_hicp_manr', {
    geo: 'EU27_2020',
    coicop: 'CP00',  // All-items HICP
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * 2. EU Unemployment Rate
 * Dataset: une_rt_m
 * Coverage: ~42 years (1983-2025)
 */
export async function fetchEUUnemployment(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('une_rt_m', {
    geo: 'EU27_2020',
    s_adj: 'SA',      // Seasonally adjusted
    age: 'TOTAL',     // All ages
    unit: 'PC_ACT',   // Percentage of active population
    sex: 'T',         // Total (both sexes)
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * 3. ECB Interest Rate (Deposit Facility Rate)
 * Dataset: irt_st_m (Short-term interest rates)
 * Using deposit facility rate which is always available
 */
export async function fetchEUInterestRate(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('irt_st_m', {
    geo: 'EA19',
    int_rt: 'RT_DFR',    // Deposit facility rate
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * 4. EU GDP Growth (Quarterly)
 * Dataset: namq_10_gdp
 */
export async function fetchEUGDP(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('namq_10_gdp', {
    geo: 'EU27_2020',
    na_item: 'B1GQ',  // Gross domestic product at market prices
    s_adj: 'SCA',     // Seasonally and calendar adjusted
    unit: 'CLV_PCH_PRE', // Chain linked volumes, percentage change on previous period
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * 5. EU Building Permits
 * Dataset: sts_cobp_m (Construction - building permits)
 * Simplified to get any available data
 */
export async function fetchEUBuildingPermits(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('sts_cobp_m', {
    geo: 'EU27_2020',
    indic_bt: 'BPRM',    // Building permits
    unit: 'I15',         // Index 2015=100
    nace_r2: 'F',        // Construction
    s_adj: 'NSA',        // Not seasonally adjusted
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * 6. EU Consumer Confidence
 * Dataset: ei_bsco_m
 * Coverage: ~45 years (1980-2025)
 * Scale: -100 to +100 (balance score)
 */
export async function fetchEUConsumerConfidence(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('ei_bsco_m', {
    geo: 'EU27_2020',
    indic: 'BS-CSMCI', // Consumer confidence indicator
    s_adj: 'SA',       // Seasonally adjusted
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * 7. EU Retail Sales (Volume Index)
 * Dataset: sts_trtu_m (Turnover and volume of sales)
 */
export async function fetchEURetailSales(): Promise<EurostatDataPoint[]> {
  return fetchEurostatDataset('sts_trtu_m', {
    geo: 'EU27_2020',
    indic_bt: 'TOVV',    // Volume of sales (value)
    nace_r2: 'G47',      // Retail trade
    unit: 'I21',         // Index 2021=100
    s_adj: 'NSA',        // Not seasonally adjusted
    format: 'JSON',
    lang: 'EN'
  })
}

/**
 * Fetch all EU macro indicators in parallel
 */
export async function fetchAllEUMacroData() {
  logger.info('[Eurostat] Fetching all EU macro indicators...')
  
  const results = await Promise.allSettled([
    fetchEUInflation(),
    fetchEUUnemployment(),
    fetchEUInterestRate(),
    fetchEUGDP(),
    fetchEUBuildingPermits(),
    fetchEUConsumerConfidence(),
    fetchEURetailSales()
  ])
  
  // Log individual failures without throwing
  results.forEach((result, index) => {
    const indicators = ['Inflation', 'Unemployment', 'Interest Rate', 'GDP', 'Building Permits', 'Consumer Confidence', 'Retail Sales']
    if (result.status === 'rejected') {
      logger.error(`[Eurostat] Failed to fetch ${indicators[index]}:`, result.reason)
    }
  })
  
  return {
    inflation: results[0].status === 'fulfilled' ? results[0].value : [],
    unemploymentRate: results[1].status === 'fulfilled' ? results[1].value : [],
    interestRate: results[2].status === 'fulfilled' ? results[2].value : [],
    gdp: results[3].status === 'fulfilled' ? results[3].value : [],
    buildingPermits: results[4].status === 'fulfilled' ? results[4].value : [],
    consumerConfidence: results[5].status === 'fulfilled' ? results[5].value : [],
    retailSales: results[6].status === 'fulfilled' ? results[6].value : []
  }
}
