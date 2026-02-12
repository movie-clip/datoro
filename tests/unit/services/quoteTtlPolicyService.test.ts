import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isUsEquityMarketOpen, resolveQuoteTtlSeconds } from '../../../server/services/quoteTtlPolicyService.js'

describe('quoteTtlPolicyService', () => {
  const originalEnv = {
    force: process.env.QUOTE_TTL_FORCE_SECONDS,
    open: process.env.QUOTE_TTL_MARKET_OPEN_SECONDS,
    off: process.env.QUOTE_TTL_OFF_HOURS_SECONDS,
    adaptive: process.env.QUOTE_TTL_ADAPTIVE_ENABLED,
  }

  beforeEach(() => {
    delete process.env.QUOTE_TTL_FORCE_SECONDS
    delete process.env.QUOTE_TTL_MARKET_OPEN_SECONDS
    delete process.env.QUOTE_TTL_OFF_HOURS_SECONDS
    delete process.env.QUOTE_TTL_ADAPTIVE_ENABLED
  })

  afterEach(() => {
    process.env.QUOTE_TTL_FORCE_SECONDS = originalEnv.force
    process.env.QUOTE_TTL_MARKET_OPEN_SECONDS = originalEnv.open
    process.env.QUOTE_TTL_OFF_HOURS_SECONDS = originalEnv.off
    process.env.QUOTE_TTL_ADAPTIVE_ENABLED = originalEnv.adaptive
  })

  it('detects market open during NY regular hours on weekday', () => {
    // 2026-02-12 15:00:00 UTC = 10:00 NY (market open)
    const now = new Date('2026-02-12T15:00:00.000Z')
    expect(isUsEquityMarketOpen(now)).toBe(true)
  })

  it('detects market closed on weekend', () => {
    // Saturday noon UTC
    const now = new Date('2026-02-14T12:00:00.000Z')
    expect(isUsEquityMarketOpen(now)).toBe(false)
  })

  it('uses market-open TTL during open market', () => {
    process.env.QUOTE_TTL_MARKET_OPEN_SECONDS = '90'
    process.env.QUOTE_TTL_OFF_HOURS_SECONDS = '900'

    const now = new Date('2026-02-12T15:00:00.000Z')
    expect(resolveQuoteTtlSeconds(now)).toBe(90)
  })

  it('uses off-hours TTL outside market', () => {
    process.env.QUOTE_TTL_MARKET_OPEN_SECONDS = '90'
    process.env.QUOTE_TTL_OFF_HOURS_SECONDS = '900'

    // 2026-02-12 00:00 NY (off-hours)
    const now = new Date('2026-02-12T05:00:00.000Z')
    expect(resolveQuoteTtlSeconds(now)).toBe(900)
  })

  it('uses forced TTL override when configured', () => {
    process.env.QUOTE_TTL_FORCE_SECONDS = '180'
    process.env.QUOTE_TTL_MARKET_OPEN_SECONDS = '90'
    process.env.QUOTE_TTL_OFF_HOURS_SECONDS = '900'

    const openNow = new Date('2026-02-12T15:00:00.000Z')
    const closedNow = new Date('2026-02-12T05:00:00.000Z')

    expect(resolveQuoteTtlSeconds(openNow)).toBe(180)
    expect(resolveQuoteTtlSeconds(closedNow)).toBe(180)
  })

  it('falls back to default quote TTL when adaptive mode is disabled', () => {
    process.env.QUOTE_TTL_ADAPTIVE_ENABLED = 'false'
    process.env.QUOTE_TTL_MARKET_OPEN_SECONDS = '90'
    process.env.QUOTE_TTL_OFF_HOURS_SECONDS = '900'

    const now = new Date('2026-02-12T15:00:00.000Z')
    expect(resolveQuoteTtlSeconds(now)).toBe(300)
  })
})
