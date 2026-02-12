import { describe, it, expect } from 'vitest'
import { fetchTickerDataWithSplit } from '../../../src/stores/tickerStore'

type MockResponse = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<any>
}

function res(payload: any, ok = true, status = 200, statusText = 'OK'): MockResponse {
  return {
    ok,
    status,
    statusText,
    json: async () => payload
  }
}

describe('fetchTickerDataWithSplit', () => {
  it('merges dynamic quote into static payload when both endpoints succeed', async () => {
    const staticPayload = {
      ticker: 'AAPL',
      timestamp: '2026-02-12T00:00:00.000Z',
      fetchDuration: 120,
      data: {
        profile: [{ symbol: 'AAPL' }],
        quote: [{ symbol: 'AAPL', price: 100 }]
      }
    }

    const dynamicPayload = {
      ticker: 'AAPL',
      timestamp: '2026-02-12T00:05:00.000Z',
      quote: [{ symbol: 'AAPL', price: 200 }]
    }

    const calls: string[] = []
    const fetchMock = async (input: string | URL): Promise<any> => {
      const url = String(input)
      calls.push(url)

      if (url.includes('/static?mode=full')) return res(staticPayload)
      if (url.endsWith('/dynamic')) return res(dynamicPayload)
      throw new Error('unexpected url')
    }

    const result = await fetchTickerDataWithSplit('aapl', 'full', 'http://localhost:7071', fetchMock as typeof fetch)

    expect(calls.length).toBe(2)
    expect(calls[0]).toBeDefined()
    expect(calls[1]).toBeDefined()
    expect(calls[0]!).toContain('/api/ticker-data/AAPL/static?mode=full')
    expect(calls[1]!).toContain('/api/ticker-data/AAPL/dynamic')
    expect(result.data.quote.length).toBeGreaterThan(0)
    expect(result.data.quote[0]!.price).toBe(200)
    expect(result.timestamp).toBe('2026-02-12T00:05:00.000Z')
  })

  it('keeps static payload when dynamic endpoint fails', async () => {
    const staticPayload = {
      ticker: 'AAPL',
      timestamp: '2026-02-12T00:00:00.000Z',
      fetchDuration: 120,
      data: {
        profile: [{ symbol: 'AAPL' }],
        quote: [{ symbol: 'AAPL', price: 100 }]
      }
    }

    const fetchMock = async (input: string | URL): Promise<any> => {
      const url = String(input)
      if (url.includes('/static?mode=priority')) return res(staticPayload)
      if (url.endsWith('/dynamic')) throw new Error('network error')
      throw new Error('unexpected url')
    }

    const result = await fetchTickerDataWithSplit('aapl', 'lite', 'http://localhost:7071', fetchMock as typeof fetch)

    expect(result.data.quote.length).toBeGreaterThan(0)
    expect(result.data.quote[0]!.price).toBe(100)
    expect(result.timestamp).toBe('2026-02-12T00:00:00.000Z')
  })

  it('throws when split static request fails', async () => {
    const calls: string[] = []
    const fetchMock = async (input: string | URL): Promise<any> => {
      const url = String(input)
      calls.push(url)

      if (url.includes('/static?mode=full')) return res({ error: true }, false, 500, 'Internal Server Error')
      throw new Error('unexpected url')
    }

    await expect(
      fetchTickerDataWithSplit('AAPL', 'full', 'http://localhost:7071', fetchMock as typeof fetch)
    ).rejects.toThrow('HTTP 500: Internal Server Error')

    expect(calls.length).toBe(1)
    expect(calls[0]).toBeDefined()
    expect(calls[0]!).toContain('/api/ticker-data/AAPL/static?mode=full')
  })
})
