import logger from './logger.js'
import { getCacheService, CacheTTL } from './cacheService.js'
import { getPopularTickers } from './databaseService.js'
import { fetchTickerBatch, fetchTickerPriority } from './batchDataService.js'

interface WarmTickerCandidate {
  ticker: string
  searchCount?: number
}

interface CacheWarmServiceOptions {
  enabled?: boolean
  dryRun?: boolean
  intervalMs?: number
  jitterMs?: number
  maxSymbols?: number
  maxFetchesPerCycle?: number
  concurrency?: number
  daysAgo?: number
  mode?: 'full' | 'priority'
  includeTickers?: string[]
  fallbackTickers?: string[]
  apiVersion?: string
  fmpApiKey?: string
}

interface CacheWarmCycleStats {
  startedAt: string
  endedAt: string
  durationMs: number
  candidates: number
  processed: number
  skippedHits: number
  fetched: number
  errors: number
  dryRun: boolean
  memoryOnlySkip: boolean
}

interface CacheWarmStatus {
  enabled: boolean
  running: boolean
  dryRun: boolean
  intervalMs: number
  jitterMs: number
  maxSymbols: number
  maxFetchesPerCycle: number
  concurrency: number
  daysAgo: number
  mode: 'full' | 'priority'
  includeTickers: string[]
  fallbackTickers: string[]
  lastCycle: CacheWarmCycleStats | null
  nextRunAt: string | null
}

const DEFAULT_FALLBACK_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
  'META', 'TSLA', 'BRK.B', 'JPM', 'V'
]

function normalizeTicker(ticker?: string): string {
  return (ticker || '').toUpperCase().trim()
}

function parseTickerList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback
  const list = value
    .split(',')
    .map(t => normalizeTicker(t))
    .filter(Boolean)
  return list.length > 0 ? Array.from(new Set(list)) : fallback
}

function toStaticBatchPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
  const { quote: _quote, ...staticData } = data

  return {
    ...payload,
    data: staticData,
    splitMode: 'static'
  }
}

class CacheWarmService {
  private readonly cache = getCacheService()
  private options: Required<CacheWarmServiceOptions>
  private timer: NodeJS.Timeout | null = null
  private running = false
  private inCycle = false
  private lastCycle: CacheWarmCycleStats | null = null
  private nextRunAt: Date | null = null

  constructor(options: CacheWarmServiceOptions = {}) {
    const envEnabled = process.env.WARM_ENABLED === 'true'
    const envDryRun = process.env.WARM_DRY_RUN === 'true'
    const envIntervalMs = Number(process.env.WARM_INTERVAL_MS || 15 * 60 * 1000)
    const envJitterMs = Number(process.env.WARM_JITTER_MS || 60 * 1000)
    const envMaxSymbols = Number(process.env.WARM_MAX_SYMBOLS || 10)
    const envMaxFetches = Number(process.env.WARM_MAX_FETCHES_PER_CYCLE || 10)
    const envConcurrency = Number(process.env.WARM_CONCURRENCY || 2)
    const envDaysAgo = Number(process.env.WARM_DAYS_AGO || 7)
    const envMode = (process.env.WARM_MODE === 'priority' ? 'priority' : 'full') as 'full' | 'priority'

    this.options = {
      enabled: options.enabled ?? envEnabled,
      dryRun: options.dryRun ?? envDryRun,
      intervalMs: Math.max(60_000, options.intervalMs ?? envIntervalMs),
      jitterMs: Math.max(0, options.jitterMs ?? envJitterMs),
      maxSymbols: Math.max(1, options.maxSymbols ?? envMaxSymbols),
      maxFetchesPerCycle: Math.max(1, options.maxFetchesPerCycle ?? envMaxFetches),
      concurrency: Math.max(1, options.concurrency ?? envConcurrency),
      daysAgo: Math.max(1, options.daysAgo ?? envDaysAgo),
      mode: options.mode ?? envMode,
      includeTickers: options.includeTickers ?? parseTickerList(process.env.WARM_INCLUDE_TICKERS, []),
      fallbackTickers: options.fallbackTickers ?? parseTickerList(process.env.WARM_FALLBACK_TICKERS, DEFAULT_FALLBACK_TICKERS),
      apiVersion: options.apiVersion ?? 'v2.12',
      fmpApiKey: options.fmpApiKey ?? ''
    }
  }

  configure(options: CacheWarmServiceOptions): void {
    this.options = {
      ...this.options,
      ...options,
      includeTickers: options.includeTickers ?? this.options.includeTickers,
      fallbackTickers: options.fallbackTickers ?? this.options.fallbackTickers,
      intervalMs: Math.max(60_000, options.intervalMs ?? this.options.intervalMs),
      jitterMs: Math.max(0, options.jitterMs ?? this.options.jitterMs),
      maxSymbols: Math.max(1, options.maxSymbols ?? this.options.maxSymbols),
      maxFetchesPerCycle: Math.max(1, options.maxFetchesPerCycle ?? this.options.maxFetchesPerCycle),
      concurrency: Math.max(1, options.concurrency ?? this.options.concurrency),
      daysAgo: Math.max(1, options.daysAgo ?? this.options.daysAgo)
    }
  }

  start(): void {
    if (!this.options.enabled) {
      logger.info('[CacheWarm] Disabled (WARM_ENABLED=false)')
      return
    }

    if (!this.options.fmpApiKey) {
      logger.warn('[CacheWarm] Disabled because FMP API key is missing')
      return
    }

    if (this.running) {
      logger.warn('[CacheWarm] Already started')
      return
    }

    this.running = true
    logger.info('[CacheWarm] Starting service', {
      dryRun: this.options.dryRun,
      intervalMs: this.options.intervalMs,
      jitterMs: this.options.jitterMs,
      maxSymbols: this.options.maxSymbols,
      maxFetchesPerCycle: this.options.maxFetchesPerCycle,
      concurrency: this.options.concurrency,
      daysAgo: this.options.daysAgo,
      mode: this.options.mode
    })

    this.scheduleNextRun(5_000)
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    logger.info('[CacheWarm] Stopped service')
  }

  getStatus(): CacheWarmStatus {
    return {
      enabled: this.options.enabled,
      running: this.running,
      dryRun: this.options.dryRun,
      intervalMs: this.options.intervalMs,
      jitterMs: this.options.jitterMs,
      maxSymbols: this.options.maxSymbols,
      maxFetchesPerCycle: this.options.maxFetchesPerCycle,
      concurrency: this.options.concurrency,
      daysAgo: this.options.daysAgo,
      mode: this.options.mode,
      includeTickers: this.options.includeTickers,
      fallbackTickers: this.options.fallbackTickers,
      lastCycle: this.lastCycle,
      nextRunAt: this.nextRunAt ? this.nextRunAt.toISOString() : null
    }
  }

  /**
   * Run one cycle immediately (used by tests and controlled operations)
   */
  async runCycleNow(): Promise<void> {
    const previousRunning = this.running
    this.running = true
    try {
      await this.runCycle()
    } finally {
      this.running = previousRunning
    }
  }

  private scheduleNextRun(delayMs?: number): void {
    if (!this.running) return

    const jitter = this.options.jitterMs > 0
      ? Math.floor((Math.random() * (this.options.jitterMs * 2 + 1)) - this.options.jitterMs)
      : 0

    const waitMs = Math.max(5_000, delayMs ?? this.options.intervalMs + jitter)
    this.nextRunAt = new Date(Date.now() + waitMs)

    this.timer = setTimeout(async () => {
      await this.runCycle()
      this.scheduleNextRun()
    }, waitMs)
  }

  private async runCycle(): Promise<void> {
    if (!this.running || this.inCycle) return

    this.inCycle = true
    const startedAt = new Date()

    const cycle: CacheWarmCycleStats = {
      startedAt: startedAt.toISOString(),
      endedAt: startedAt.toISOString(),
      durationMs: 0,
      candidates: 0,
      processed: 0,
      skippedHits: 0,
      fetched: 0,
      errors: 0,
      dryRun: this.options.dryRun,
      memoryOnlySkip: false
    }

    try {
      if (this.cache.isMemoryOnly()) {
        cycle.memoryOnlySkip = true
        logger.warn('[CacheWarm] Skipping cycle because Redis is in memory-only mode')
        return
      }

      const candidates = await this.getWarmCandidates()
      cycle.candidates = candidates.length

      if (candidates.length === 0) {
        logger.info('[CacheWarm] No candidates for warm cycle')
        return
      }

      const toProcess = candidates.slice(0, this.options.maxSymbols)
      const queue = toProcess.slice(0, this.options.maxFetchesPerCycle)

      let index = 0
      const workerCount = Math.min(this.options.concurrency, queue.length)

      const workers = Array.from({ length: workerCount }, async () => {
        while (this.running) {
          const currentIndex = index
          index += 1

          if (currentIndex >= queue.length) break

          const ticker = queue[currentIndex]
          if (!ticker) {
            continue
          }
          cycle.processed += 1

          try {
            const result = await this.warmTicker(ticker)
            if (result === 'hit') cycle.skippedHits += 1
            if (result === 'fetched') cycle.fetched += 1
          } catch (_error: any) {
            cycle.errors += 1
            logger.warn('[CacheWarm] Failed to warm ticker', {
              ticker,
              error: _error?.message || String(_error)
            })
          }
        }
      })

      await Promise.all(workers)

      logger.info('[CacheWarm] Cycle completed', {
        candidates: cycle.candidates,
        processed: cycle.processed,
        skippedHits: cycle.skippedHits,
        fetched: cycle.fetched,
        errors: cycle.errors,
        dryRun: cycle.dryRun
      })
    } finally {
      cycle.endedAt = new Date().toISOString()
      cycle.durationMs = Date.now() - startedAt.getTime()
      this.lastCycle = cycle
      this.inCycle = false
    }
  }

  private async getWarmCandidates(): Promise<string[]> {
    const fromDb: string[] = []

    try {
      const popular = await getPopularTickers(this.options.maxSymbols, this.options.daysAgo)
      const rows = Array.isArray(popular) ? popular as WarmTickerCandidate[] : []
      for (const row of rows) {
        const t = normalizeTicker(row?.ticker)
        if (t) fromDb.push(t)
      }
    } catch (_error: any) {
      logger.warn('[CacheWarm] Failed to load popular tickers, using fallback list', {
        error: _error?.message || String(_error)
      })
    }

    const merged = [
      ...this.options.includeTickers.map(normalizeTicker),
      ...fromDb,
      ...this.options.fallbackTickers.map(normalizeTicker)
    ].filter(Boolean)

    return Array.from(new Set(merged)).slice(0, this.options.maxSymbols)
  }

  private async warmTicker(ticker: string): Promise<'hit' | 'fetched'> {
    const t = normalizeTicker(ticker)
    const mode = this.options.mode
    const cacheKey = this.cache.generateKey('batch-static', t, mode, this.options.apiVersion)

    const cached = await this.cache.get(cacheKey)
    if (cached.data !== null) {
      return 'hit'
    }

    if (this.options.dryRun) {
      logger.info('[CacheWarm] DRY RUN would fetch ticker', { ticker: t, mode })
      return 'fetched'
    }

    const fullPayload = mode === 'priority'
      ? await fetchTickerPriority(t, this.options.fmpApiKey)
      : await fetchTickerBatch(t, this.options.fmpApiKey)

    const staticPayload = toStaticBatchPayload(fullPayload)
    await this.cache.set(cacheKey, staticPayload, CacheTTL.COMPANY_PROFILE)

    const quoteData = (fullPayload as any)?.data?.quote
    if (Array.isArray(quoteData) && quoteData.length > 0) {
      const quoteKey = this.cache.generateKey('quote', t)
      this.cache.setFast(quoteKey, quoteData, CacheTTL.QUOTE)
    }

    return 'fetched'
  }
}

let cacheWarmInstance: CacheWarmService | null = null

export function getCacheWarmService(): CacheWarmService {
  if (!cacheWarmInstance) {
    cacheWarmInstance = new CacheWarmService()
  }
  return cacheWarmInstance
}

export default CacheWarmService
