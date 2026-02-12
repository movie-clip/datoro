import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCache = {
  isMemoryOnly: vi.fn(),
  generateKey: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  setFast: vi.fn(),
}

const mockGetPopularTickers = vi.fn()
const mockFetchTickerBatch = vi.fn()
const mockFetchTickerPriority = vi.fn()

vi.mock('../../../server/services/cacheService.js', () => ({
  getCacheService: () => mockCache,
  CacheTTL: {
    COMPANY_PROFILE: 7 * 24 * 60 * 60,
    QUOTE: 300,
  },
}))

vi.mock('../../../server/services/databaseService.js', () => ({
  getPopularTickers: (...args: unknown[]) => mockGetPopularTickers(...args),
}))

vi.mock('../../../server/services/batchDataService.js', () => ({
  fetchTickerBatch: (...args: unknown[]) => mockFetchTickerBatch(...args),
  fetchTickerPriority: (...args: unknown[]) => mockFetchTickerPriority(...args),
}))

import CacheWarmService from '../../../server/services/cacheWarmService.js'

describe('cacheWarmService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCache.isMemoryOnly.mockReturnValue(false)
    mockCache.generateKey.mockImplementation((prefix: string, ...parts: string[]) => `${prefix}:${parts.join(':')}`)
    mockCache.get.mockResolvedValue({ data: null, source: null })
    mockCache.set.mockResolvedValue(undefined)
    mockCache.setFast.mockImplementation(() => undefined)

    mockGetPopularTickers.mockResolvedValue([
      { ticker: 'AAPL', searchCount: 100 },
      { ticker: 'MSFT', searchCount: 90 },
      { ticker: 'GOOGL', searchCount: 80 },
      { ticker: 'AMZN', searchCount: 70 },
    ])

    mockFetchTickerBatch.mockResolvedValue({
      ticker: 'AAPL',
      data: {
        profile: [{ symbol: 'AAPL' }],
        quote: [{ symbol: 'AAPL', price: 200 }],
      },
      fetchDuration: 100,
      timestamp: new Date().toISOString(),
    })

    mockFetchTickerPriority.mockResolvedValue({
      ticker: 'AAPL',
      data: {
        profile: [{ symbol: 'AAPL' }],
        quote: [{ symbol: 'AAPL', price: 200 }],
      },
      fetchDuration: 50,
      timestamp: new Date().toISOString(),
    })
  })

  it('skips cycle when cache is memory-only', async () => {
    mockCache.isMemoryOnly.mockReturnValue(true)

    const service = new CacheWarmService({
      enabled: true,
      fmpApiKey: 'test-key',
      apiVersion: 'v2.12',
    })

    await service.runCycleNow()

    const status = service.getStatus()
    expect(status.lastCycle?.memoryOnlySkip).toBe(true)
    expect(mockGetPopularTickers).not.toHaveBeenCalled()
    expect(mockFetchTickerBatch).not.toHaveBeenCalled()
  })

  it('respects max fetch budget per cycle', async () => {
    const service = new CacheWarmService({
      enabled: true,
      fmpApiKey: 'test-key',
      apiVersion: 'v2.12',
      maxSymbols: 5,
      maxFetchesPerCycle: 2,
      concurrency: 2,
      dryRun: false,
      mode: 'full',
    })

    await service.runCycleNow()

    expect(mockFetchTickerBatch).toHaveBeenCalledTimes(2)
    const status = service.getStatus()
    expect(status.lastCycle?.processed).toBe(2)
    expect(status.lastCycle?.fetched).toBe(2)
    expect(status.lastCycle?.errors).toBe(0)
  })

  it('does not fetch when static cache key already exists', async () => {
    mockCache.get.mockResolvedValue({ data: { warm: true }, source: 'redis' })

    const service = new CacheWarmService({
      enabled: true,
      fmpApiKey: 'test-key',
      apiVersion: 'v2.12',
      maxSymbols: 3,
      maxFetchesPerCycle: 3,
      dryRun: false,
      mode: 'priority',
    })

    await service.runCycleNow()

    expect(mockFetchTickerPriority).not.toHaveBeenCalled()
    const status = service.getStatus()
    expect(status.lastCycle?.skippedHits).toBeGreaterThan(0)
  })
})
