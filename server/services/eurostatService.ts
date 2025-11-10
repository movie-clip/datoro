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
    
    const valueKeys = values ? Object.keys(values) : []
    logger.info(`[Eurostat Parser] Response has dimensions: ${JSON.stringify(Object.keys(data.dimension || {}))}`)
    logger.info(`[Eurostat Parser] Value object exists: ${!!values}, keys count: ${valueKeys.length}`)
    
    if (!timeLabels) {
      logger.warn('[Eurostat] Missing time labels in response')
      return []
    }
    
    if (!values || valueKeys.length === 0) {
      logger.warn('[Eurostat] Missing or empty values in response')
      return []
    }
    
    // Get all dimension names and their sizes
    const dimensions = data.dimension
    const dimNames = Object.keys(dimensions)
    const dimSizes = dimNames.map(name => {
      const dim = dimensions[name as keyof typeof dimensions]
      return dim?.category?.index ? Object.keys(dim.category.index).length : 0
    })
    
    logger.info(`[Eurostat Parser] Dimensions: ${dimNames.join(', ')}`)
    logger.info(`[Eurostat Parser] Sizes: ${dimSizes.join(' × ')}`)
    
    // Find time dimension index
    const timeIndex = dimNames.indexOf('time')
    if (timeIndex === -1) {
      logger.warn('[Eurostat] No time dimension found')
      return []
    }
    
    // Get time dimension info
    const timeDim = data.dimension['time' as keyof typeof dimensions]
    if (!timeDim?.category?.index) {
      logger.warn('[Eurostat] Time dimension has no category index')
      return []
    }
    
    const timeIndexMap = timeDim.category.index
    const timeKeys = Object.keys(timeIndexMap).sort((a, b) => timeIndexMap[a] - timeIndexMap[b])
    const timeSize = dimSizes[timeIndex]
    
    // Find the first available value key to determine which series to extract
    const availableKeys = Object.keys(values).map(Number).sort((a, b) => a - b)
    if (availableKeys.length === 0) {
      logger.warn('[Eurostat] No values available in response')
      return []
    }
    
    const firstKey = availableKeys[0]
    
    // Determine if time is the last (rightmost) dimension
    const isTimeLastDimension = timeIndex === dimNames.length - 1
    
    logger.info(`[Eurostat Parser] First value key: ${firstKey}, time is ${isTimeLastDimension ? 'last' : 'not last'} dimension`)
    
    // Extract values for the first available series across all time periods
    const result: EurostatDataPoint[] = []
    
    if (isTimeLastDimension) {
      // Time is last dimension: find the series with the most recent/complete data
      let bestSeriesBase = firstKey
      let bestLastIndex = -1
      
      // Calculate how many series exist
      const numSeries = Math.ceil(Math.max(...availableKeys) / timeSize) + 1
      
      // Check each series to find the one with most recent data
      for (let seriesIdx = 0; seriesIdx < numSeries; seriesIdx++) {
        const seriesBase = seriesIdx * timeSize
        
        // Find the last non-null value in this series
        for (let timeIdx = timeKeys.length - 1; timeIdx >= 0; timeIdx--) {
          const timeKey = timeKeys[timeIdx]
          const timeMappedIdx = timeIndexMap[timeKey]
          const valueIdx = seriesBase + timeMappedIdx
          const value = values[valueIdx.toString()]
          
          if (value !== null && value !== undefined && !isNaN(value)) {
            // Found the last non-null value in this series
            if (timeMappedIdx > bestLastIndex) {
              bestLastIndex = timeMappedIdx
              bestSeriesBase = seriesBase
            }
            break
          }
        }
      }
      
      logger.info(`[Eurostat Parser] Using series at base ${bestSeriesBase} (last index: ${bestLastIndex})`)
      
      // Extract values from the best series
      for (const timeKey of timeKeys) {
        const timeIdx = timeIndexMap[timeKey]
        const valueLinearIndex = bestSeriesBase + timeIdx
        const value = values[valueLinearIndex.toString()]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          result.push({
            date: timeKey,
            value: value
          })
        }
      }
    } else {
      // Time is NOT the last dimension: need to calculate stride
      // Calculate stride: product of all dimensions AFTER time
      let stride = 1
      for (let i = timeIndex + 1; i < dimNames.length; i++) {
        stride *= dimSizes[i]
      }
      
      // Extract series by jumping by stride for each time period
      for (let timeIdx = 0; timeIdx < timeKeys.length; timeIdx++) {
        const timeKey = timeKeys[timeIdx]
        const valueLinearIndex = (Math.floor(firstKey / timeSize) * timeSize) + (timeIdx * stride)
        const value = values[valueLinearIndex.toString()]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          result.push({
            date: timeKey,
            value: value
          })
        }
      }
    }
    
    logger.info(`[Eurostat Parser] Extracted ${result.length} data points`)
    
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
 * 3. Euro Area Interest Rate (3-month Euribor)
 * Dataset: irt_st_m (Short-term interest rates - monthly data)
 * Using 3-month interbank rate (Euribor) as proxy for ECB policy impact
 * Note: ECB official rates not available in Eurostat, would need ECB SDW API
 */
export async function fetchEUInterestRate(): Promise<EurostatDataPoint[]> {
  try {
    logger.info('[Eurostat] Fetching EU Interest Rate (3-month Euribor)')
    const result = await fetchEurostatDataset('irt_st_m', {
      geo: 'EA',           // Euro area (changing composition)
      int_rt: 'IRT_M3',    // 3-month interbank rate (Euribor)
      format: 'JSON',
      lang: 'EN'
    })
    logger.info(`[Eurostat] Interest Rate fetch complete: ${result.length} points`)
    return result
  } catch (error) {
    logger.error('[Eurostat] Interest Rate fetch failed:', error)
    return []
  }
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
 * Indicator: BPRM_DW (Building permits - number of dwellings)
 * Note: Not filtering by cpa2_1 to get aggregate building data
 * Coverage: EU27 aggregate data available since ~1995
 * Unit: Index 2015=100
 */
export async function fetchEUBuildingPermits(): Promise<EurostatDataPoint[]> {
  try {
    logger.info('[Eurostat] Fetching EU Building Permits with BPRM_DW indicator')
    const result = await fetchEurostatDataset('sts_cobp_m', {
      geo: 'EU27_2020',
      indic_bt: 'BPRM_DW',    // Building permits - number of dwellings
      // cpa2_1 NOT specified - returns all building types (parser extracts first series)
      unit: 'I15',            // Index 2015=100
      s_adj: 'NSA',           // Not seasonally adjusted
      format: 'JSON',
      lang: 'EN'
    })
    logger.info(`[Eurostat] Building Permits result: ${result.length} data points`)
    return result
  } catch (error) {
    logger.error('[Eurostat] Building permits fetch error:', error)
    return []
  }
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
    indic_bt: 'VOL_SLS', // Volume of sales
    nace_r2: 'G47',      // Retail trade
    unit: 'I21',         // Index 2021=100
    s_adj: 'CA',         // Calendar adjusted (CA has data, NSA/SA don't)
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
