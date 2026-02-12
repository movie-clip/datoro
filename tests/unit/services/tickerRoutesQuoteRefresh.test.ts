import { describe, it, expect } from 'vitest'
import { shouldRefreshQuote } from '../../../server/routes/tickerRoutes.js'

describe('tickerRoutes quote refresh decision', () => {
  it('returns true when quote exists and freshness timestamp is older than quote ttl', () => {
    const now = Date.UTC(2026, 1, 12, 12, 0, 0)
    const oldTs = now - (6 * 60 * 1000) // 6 minutes old

    const result = shouldRefreshQuote(oldTs, oldTs, true, 300, now)
    expect(result).toBe(true)
  })

  it('returns false when quote data is missing', () => {
    const now = Date.UTC(2026, 1, 12, 12, 0, 0)
    const oldTs = now - (10 * 60 * 1000)

    const result = shouldRefreshQuote(oldTs, oldTs, false, 300, now)
    expect(result).toBe(false)
  })

  it('falls back to cachedAt when batch timestamp is invalid', () => {
    const now = Date.UTC(2026, 1, 12, 12, 0, 0)
    const oldCachedAt = now - (6 * 60 * 1000)

    const result = shouldRefreshQuote(Number.NaN, oldCachedAt, true, 300, now)
    expect(result).toBe(true)
  })

  it('returns false when all timestamps are invalid', () => {
    const now = Date.UTC(2026, 1, 12, 12, 0, 0)

    const result = shouldRefreshQuote(Number.NaN, Number.NaN, true, 300, now)
    expect(result).toBe(false)
  })
})
