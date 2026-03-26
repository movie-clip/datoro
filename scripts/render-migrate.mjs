#!/usr/bin/env node

import { execSync } from 'child_process'

function normalizeRenderDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl

  const parsed = new URL(rawUrl)
  const isRenderFqdn = parsed.hostname.endsWith('.render.com')

  if (isRenderFqdn && !parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require')
  }

  return parsed.toString()
}

function maskUrl(rawUrl) {
  return rawUrl.replace(/:[^:@/]+@/, ':****@')
}

const runtimeUrl = process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_DATABASE_URL || runtimeUrl

if (!runtimeUrl && !directUrl) {
  console.error('[Render Migrate] Missing DATABASE_URL and DIRECT_DATABASE_URL')
  process.exit(1)
}

const normalizedRuntimeUrl = normalizeRenderDatabaseUrl(runtimeUrl || directUrl)
const normalizedDirectUrl = normalizeRenderDatabaseUrl(directUrl)

console.log('[Render Migrate] Running Prisma migrations')
console.log(`[Render Migrate] DATABASE_URL host: ${new URL(normalizedRuntimeUrl).host}`)
console.log(`[Render Migrate] DIRECT_DATABASE_URL host: ${new URL(normalizedDirectUrl).host}`)
console.log(`[Render Migrate] DATABASE_URL: ${maskUrl(normalizedRuntimeUrl)}`)

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: normalizedRuntimeUrl,
    DIRECT_DATABASE_URL: normalizedDirectUrl
  }
})
