import { describe, it, expect } from 'vitest'
import { shouldSkipFmpRateLimit } from '../../../server/middleware/rateLimiter.js'

describe('rateLimiter cache-hit skip', () => {
  it('returns true when request is marked as cache hit', () => {
    const req = { batchCacheHit: true } as any
    expect(shouldSkipFmpRateLimit(req)).toBe(true)
  })

  it('returns false when request is not marked as cache hit', () => {
    const req = { batchCacheHit: false } as any
    expect(shouldSkipFmpRateLimit(req)).toBe(false)
  })

  it('returns false when batchCacheHit is undefined', () => {
    const req = {} as any
    expect(shouldSkipFmpRateLimit(req)).toBe(false)
  })
})
