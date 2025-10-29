import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')
dotenv.config({ path: join(rootDir, '.env') })

const { getPrismaClient } = await import('../../server/services/databaseService.ts')
const prisma = getPrismaClient()

console.log('Testing watchlistId_ticker unique constraint...\n')

// Test 1: Check if we can query using the unique constraint
try {
  const existing = await prisma.watchlistItem.findUnique({
    where: {
      watchlistId_ticker: {
        watchlistId: 'e878482e-c617-43fe-8428-faa22abf2ea5',
        ticker: 'TSM'
      }
    }
  })
  
  console.log('✅ Query successful!')
  console.log('Result:', existing ? `Found: ${existing.ticker}` : 'Not found')
} catch (_error) {
  console.error('❌ Query failed:', error.message)
  console.error('Full error:', error)
}

await prisma.$disconnect()
