/**
 * Macro Economic Data Routes
 * Endpoints for fetching macro economic indicators
 */

import express from 'express'
import type { Request, Response } from 'express'

const router = express.Router()
const FMP_BASE_URL = 'https://financialmodelingprep.com'
const fmpApiKey = process.env.FMP_API_KEY

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<globalThis.Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

/**
 * GET /api/macro/treasury
 * Fetch Treasury Rates (yield curve)
 */
router.get('/treasury', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: from, to' })
    }
    
    const url = `${FMP_BASE_URL}/api/v4/treasury?from=${from}&to=${to}&apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 8000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    res.json(data)
  } catch (error: any) {
    console.error('[Macro] Treasury rates error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch treasury rates' })
  }
})

/**
 * GET /api/macro/economic
 * Fetch Economic Indicator by name
 */
router.get('/economic', async (req: Request, res: Response) => {
  try {
    const { name } = req.query
    
    if (!name) {
      return res.status(400).json({ error: 'Missing required parameter: name' })
    }
    
    const url = `${FMP_BASE_URL}/api/v4/economic?name=${name}&apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 8000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    res.json(data)
  } catch (error: any) {
    console.error(`[Macro] Economic indicator error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch economic indicator' })
  }
})

/**
 * GET /api/macro/spx
 * Fetch S&P 500 historical data
 */
router.get('/spx', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: from, to' })
    }
    
    const url = `${FMP_BASE_URL}/api/v3/historical-price-full/%5EGSPC?from=${from}&to=${to}&apikey=${fmpApiKey}`
    const response = await fetchWithTimeout(url, {}, 8000)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    res.json((data as any).historical || [])
  } catch (error: any) {
    console.error('[Macro] SPX data error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch SPX data' })
  }
})

export default router
