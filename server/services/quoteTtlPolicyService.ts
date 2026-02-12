import { CacheTTL } from './cacheService.js'

const NY_TIME_ZONE = 'America/New_York'

interface NyDateParts {
  weekday: string
  hour: number
  minute: number
}

function parseTtlEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(30, Math.floor(parsed))
}

function getNyDateParts(date: Date): NyDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const weekday = parts.find(p => p.type === 'weekday')?.value || 'Sun'
  const hour = Number(parts.find(p => p.type === 'hour')?.value || '0')
  const minute = Number(parts.find(p => p.type === 'minute')?.value || '0')

  return { weekday, hour, minute }
}

export function isUsEquityMarketOpen(date: Date = new Date()): boolean {
  const { weekday, hour, minute } = getNyDateParts(date)

  // Weekend
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false
  }

  // Regular market hours: 09:30 - 16:00 New York time
  const totalMinutes = hour * 60 + minute
  const openMinutes = 9 * 60 + 30
  const closeMinutes = 16 * 60

  return totalMinutes >= openMinutes && totalMinutes < closeMinutes
}

export function resolveQuoteTtlSeconds(date: Date = new Date()): number {
  const adaptiveEnabled = process.env.QUOTE_TTL_ADAPTIVE_ENABLED !== 'false'
  if (!adaptiveEnabled) {
    return Number(CacheTTL.QUOTE)
  }

  const forcedRaw = process.env.QUOTE_TTL_FORCE_SECONDS
  const forced = parseTtlEnv(forcedRaw, 0)
  if (forcedRaw !== undefined && forcedRaw !== '' && forced > 0) {
    return forced
  }

  const openTtl = parseTtlEnv(process.env.QUOTE_TTL_MARKET_OPEN_SECONDS, 120)
  const closedTtl = parseTtlEnv(process.env.QUOTE_TTL_OFF_HOURS_SECONDS, 900)

  const ttl = isUsEquityMarketOpen(date) ? openTtl : closedTtl

  // Clamp to sane max for quote cache
  return Math.min(ttl, Math.max(30, Number(CacheTTL.COMPANY_PROFILE)))
}

export default {
  isUsEquityMarketOpen,
  resolveQuoteTtlSeconds
}
