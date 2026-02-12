import { describe, it, expect } from 'vitest'
import { toStaticBatchPayload } from '../../../server/routes/tickerRoutes.js'

describe('tickerRoutes static/dynamic split helpers', () => {
  it('removes quote from static payload and marks splitMode', () => {
    const input = {
      ticker: 'AAPL',
      timestamp: '2026-02-12T10:00:00.000Z',
      fetchDuration: 123,
      data: {
        quote: [{ symbol: 'AAPL', price: 200 }],
        profile: [{ symbol: 'AAPL', companyName: 'Apple Inc.' }],
        incomeAnnual: [{ date: '2025-12-31', revenue: 100 }]
      }
    }

    const result = toStaticBatchPayload(input)

    expect(result.splitMode).toBe('static')
    expect(result.data.quote).toBeUndefined()
    expect(result.data.profile).toEqual(input.data.profile)
    expect(result.data.incomeAnnual).toEqual(input.data.incomeAnnual)
  })

  it('returns non-object payload unchanged', () => {
    expect(toStaticBatchPayload(null)).toBeNull()
    expect(toStaticBatchPayload('raw')).toBe('raw')
  })
})
