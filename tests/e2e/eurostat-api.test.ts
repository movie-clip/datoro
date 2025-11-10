import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:7071'

describe('Eurostat API Integration Tests', () => {
  // Skip tests if server is not running
  const skipIfServerDown = process.env.SKIP_E2E === 'true'

  beforeAll(async () => {
    if (!skipIfServerDown) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`)
        if (!response.ok) {
          throw new Error('Server health check failed')
        }
      } catch (error) {
        console.warn('Server is not running, skipping E2E tests')
        process.env.SKIP_E2E = 'true'
      }
    }
  })

  describe('EU Macro Batch Endpoint', () => {
    it('should return all EU macro indicators with recent dates', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      expect(response.ok).toBe(true)

      const data = await response.json()

      // Verify structure
      expect(data).toHaveProperty('inflation')
      expect(data).toHaveProperty('unemploymentRate')
      expect(data).toHaveProperty('interestRate')
      expect(data).toHaveProperty('buildingPermits')
      expect(data).toHaveProperty('retailSales')
      expect(data).toHaveProperty('gdp')
      expect(data).toHaveProperty('consumerConfidence')
      expect(data).toHaveProperty('indexStats')
      expect(data).toHaveProperty('timestamp')

      // Verify data is not empty
      expect(Array.isArray(data.inflation)).toBe(true)
      expect(data.inflation.length).toBeGreaterThan(0)
      expect(Array.isArray(data.unemploymentRate)).toBe(true)
      expect(data.unemploymentRate.length).toBeGreaterThan(0)

      // Verify recent dates (should be 2024 or later)
      const lastInflation = data.inflation[data.inflation.length - 1]
      expect(lastInflation).toHaveProperty('date')
      expect(lastInflation).toHaveProperty('value')
      expect(lastInflation.date).toMatch(/^202[45]-/)

      const lastUnemployment = data.unemploymentRate[data.unemploymentRate.length - 1]
      expect(lastUnemployment.date).toMatch(/^202[45]-/)
    }, 30000) // 30 second timeout for API call

    it('should return inflation data ending in 2025', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const lastDate = data.inflation[data.inflation.length - 1].date
      expect(lastDate).toMatch(/^2025-/)
      
      // Should have at least 200 data points
      expect(data.inflation.length).toBeGreaterThan(200)
    })

    it('should return unemployment data ending in 2025', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const lastDate = data.unemploymentRate[data.unemploymentRate.length - 1].date
      expect(lastDate).toMatch(/^2025-/)
      
      // Should have at least 300 data points (since 1983)
      expect(data.unemploymentRate.length).toBeGreaterThan(300)
    })

    it('should return interest rate data ending in 2025', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const lastDate = data.interestRate[data.interestRate.length - 1].date
      expect(lastDate).toMatch(/^2025-/)
      
      // Should have at least 400 data points (since 1970)
      expect(data.interestRate.length).toBeGreaterThan(400)
    })

    it('should return building permits data with most recent available', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      expect(data.buildingPermits.length).toBeGreaterThan(300)
      
      const lastDate = data.buildingPermits[data.buildingPermits.length - 1].date
      // Building permits may lag (Eurostat hasn't published recent data)
      // Should be at least 2023
      expect(lastDate).toMatch(/^202[345]-/)
    })

    it('should return retail sales data ending in 2025', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const lastDate = data.retailSales[data.retailSales.length - 1].date
      expect(lastDate).toMatch(/^2025-/)
      
      // Should have at least 300 data points
      expect(data.retailSales.length).toBeGreaterThan(300)
    })

    it('should return GDP data with quarterly dates', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      expect(data.gdp.length).toBeGreaterThan(100)
      
      // GDP should use quarterly format (e.g., "2025-Q3")
      const lastDate = data.gdp[data.gdp.length - 1].date
      expect(lastDate).toMatch(/^202[45]-Q[1234]$/)
    })

    it('should return consumer confidence data', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      expect(Array.isArray(data.consumerConfidence)).toBe(true)
      expect(data.consumerConfidence.length).toBeGreaterThan(0)
      
      const lastDate = data.consumerConfidence[data.consumerConfidence.length - 1].date
      expect(lastDate).toMatch(/^202[45]-/)
    })

    it('should include global market index stats', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      expect(Array.isArray(data.indexStats)).toBe(true)
      expect(data.indexStats.length).toBeGreaterThan(0)
      
      // Should include S&P 500, Dow Jones, etc.
      const symbols = data.indexStats.map((stat: any) => stat.symbol)
      expect(symbols).toContain('^GSPC') // S&P 500
    })

    it('should use cache on subsequent requests', async () => {
      if (skipIfServerDown) return

      // First request
      const start1 = Date.now()
      const response1 = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const duration1 = Date.now() - start1
      expect(response1.ok).toBe(true)

      // Second request (should be cached)
      const start2 = Date.now()
      const response2 = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const duration2 = Date.now() - start2
      expect(response2.ok).toBe(true)

      // Check cache header
      const cacheHeader = response2.headers.get('X-Cache')
      expect(cacheHeader).toBeTruthy()
      
      // Cached response should be faster
      expect(duration2).toBeLessThan(duration1)
    }, 60000) // 60 second timeout
  })

  describe('Data Quality Checks', () => {
    it('should have all data points with valid date and value properties', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const indicators = [
        'inflation',
        'unemploymentRate',
        'interestRate',
        'buildingPermits',
        'retailSales',
        'consumerConfidence'
      ]

      for (const indicator of indicators) {
        expect(Array.isArray(data[indicator])).toBe(true)
        
        for (const point of data[indicator]) {
          expect(point).toHaveProperty('date')
          expect(point).toHaveProperty('value')
          expect(typeof point.date).toBe('string')
          expect(typeof point.value).toBe('number')
          expect(point.date).toMatch(/^\d{4}-\d{2}$|^\d{4}-Q[1-4]$/)
          expect(isNaN(point.value)).toBe(false)
        }
      }
    })

    it('should have chronologically sorted data', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const indicators = ['inflation', 'unemploymentRate', 'interestRate']

      for (const indicator of indicators) {
        const dates = data[indicator].map((p: any) => p.date)
        const sortedDates = [...dates].sort()
        expect(dates).toEqual(sortedDates)
      }
    })

    it('should not have duplicate dates', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      const indicators = ['inflation', 'unemploymentRate', 'interestRate']

      for (const indicator of indicators) {
        const dates = data[indicator].map((p: any) => p.date)
        const uniqueDates = [...new Set(dates)]
        expect(dates.length).toBe(uniqueDates.length)
      }
    })

    it('should have reasonable value ranges', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch`)
      const data = await response.json()

      // Inflation should be between -5% and 25%
      for (const point of data.inflation) {
        expect(point.value).toBeGreaterThanOrEqual(-5)
        expect(point.value).toBeLessThanOrEqual(25)
      }

      // Unemployment should be between 0% and 30%
      for (const point of data.unemploymentRate) {
        expect(point.value).toBeGreaterThanOrEqual(0)
        expect(point.value).toBeLessThanOrEqual(30)
      }

      // Interest rate should be between -5% and 20%
      for (const point of data.interestRate) {
        expect(point.value).toBeGreaterThanOrEqual(-5)
        expect(point.value).toBeLessThanOrEqual(20)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      if (skipIfServerDown) return

      const response = await fetch(`${API_BASE_URL}/api/macro/eu-batch?invalid=param`)
      expect(response.ok).toBe(true) // Should still work, just ignore invalid params
    })
  })
})
