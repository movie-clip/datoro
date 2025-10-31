// server/schemas/newsSchemas.ts
// Zod schemas for validating FMP news API responses

import { z } from 'zod'

/**
 * Schema for a single news item from FMP API
 */
export const newsItemSchema = z.object({
  symbol: z.union([
    z.string(), // Single ticker symbol
    z.array(z.string()) // Array of ticker symbols
  ]),
  publishedDate: z.string(),
  title: z.string(),
  image: z.string().optional(),
  site: z.string(),
  text: z.string(),
  url: z.string()
})

/**
 * Schema for FMP news API response (array of news items)
 */
export const newsArraySchema = z.array(newsItemSchema)

/**
 * Validated news item type
 */
export type ValidatedNewsItem = z.infer<typeof newsItemSchema>

/**
 * Validate news API response
 * @param data - Raw data from FMP API
 * @returns Validated array of news items or null if invalid
 */
export function validateNewsResponse(data: unknown): ValidatedNewsItem[] | null {
  try {
    return newsArraySchema.parse(data)
  } catch (error) {
    console.error('[newsSchemas] Validation error:', error)
    return null
  }
}

/**
 * Safely parse news response (returns empty array on error)
 * @param data - Raw data from FMP API
 * @returns Validated array or empty array if invalid
 */
export function safeParseNewsResponse(data: unknown): ValidatedNewsItem[] {
  const result = newsArraySchema.safeParse(data)
  return result.success ? result.data : []
}
