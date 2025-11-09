/**
 * Zod schemas for Market Performance data validation
 * Validates S&P 500 historical data, sector data, and related structures
 */

import { z } from 'zod'

/**
 * Single historical price point from FMP API
 */
export const FMPHistoricalPriceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  open: z.number().positive('Open price must be positive'),
  high: z.number().positive('High price must be positive'),
  low: z.number().positive('Low price must be positive'),
  close: z.number().positive('Close price must be positive'),
  adjClose: z.number().positive('Adjusted close price must be positive').optional(),
  volume: z.number().min(0, 'Volume must be non-negative').optional(),
  unadjustedVolume: z.number().min(0).optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  vwap: z.number().positive().optional(),
  label: z.string().optional(),
  changeOverTime: z.number().optional()
})

/**
 * FMP API response for historical data
 */
export const FMPHistoricalResponseSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  historical: z.array(FMPHistoricalPriceSchema).min(1, 'At least one historical data point required')
})

/**
 * Sector performance data
 */
export const SectorDataSchema = z.object({
  sector: z.string().min(1, 'Sector name is required'),
  changesPercentage: z.string().regex(/^-?\d+\.?\d*%?$/, 'Invalid percentage format'),
  totalMarketCap: z.number().positive('Market cap must be positive').optional()
})

/**
 * S&P 500 performance data
 */
export const SP500PerformanceSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  changesPercentage: z.string(),
  price: z.number().positive('Price must be positive'),
  change: z.number().optional()
})

/**
 * Validation function with detailed error reporting
 */
export function validateHistoricalData(data: unknown): {
  success: boolean
  data?: z.infer<typeof FMPHistoricalResponseSchema>
  errors?: string[]
} {
  const result = FMPHistoricalResponseSchema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error.issues.map((err: z.ZodIssue) => 
      `${err.path.join('.')}: ${err.message}`
    )
    return { success: false, errors }
  }
  
  // Additional validation: Check chronological order
  const historical = result.data.historical
  for (let i = 1; i < historical.length; i++) {
    const prevDate = new Date(historical[i - 1]!.date)
    const currDate = new Date(historical[i]!.date)
    
    if (currDate < prevDate) {
      return {
        success: false,
        errors: [`Data is not in chronological order at index ${i}: ${historical[i - 1]!.date} -> ${historical[i]!.date}`]
      }
    }
  }
  
  // Additional validation: Check for duplicate dates
  const dates = new Set<string>()
  for (let i = 0; i < historical.length; i++) {
    const date = historical[i]!.date
    if (dates.has(date)) {
      return {
        success: false,
        errors: [`Duplicate date found: ${date}`]
      }
    }
    dates.add(date)
  }
  
  return { success: true, data: result.data }
}

/**
 * Validate sector data array
 */
export function validateSectorData(data: unknown): {
  success: boolean
  data?: z.infer<typeof SectorDataSchema>[]
  errors?: string[]
} {
  const schema = z.array(SectorDataSchema).min(1, 'At least one sector required')
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error.issues.map((err: z.ZodIssue) => 
      `${err.path.join('.')}: ${err.message}`
    )
    return { success: false, errors }
  }
  
  return { success: true, data: result.data }
}

/**
 * Type exports for TypeScript
 */
export type FMPHistoricalPrice = z.infer<typeof FMPHistoricalPriceSchema>
export type FMPHistoricalResponse = z.infer<typeof FMPHistoricalResponseSchema>
export type SectorData = z.infer<typeof SectorDataSchema>
export type SP500Performance = z.infer<typeof SP500PerformanceSchema>
