import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')
dotenv.config({ path: join(rootDir, '.env') })

const { watchlistService } = await import('../../server/services/watchlistService.ts')
const { getPrismaClient } = await import('../../server/services/databaseService.ts')

const prisma = getPrismaClient()

console.log('🧪 Testing addWatchlistItem...\n')

try {
  const watchlistId = 'e878482e-c617-43fe-8428-faa22abf2ea5'
  const ticker = 'TEST'
  
  console.log(`Adding ${ticker} to watchlist ${watchlistId}...\n`)
  
  const result = await watchlistService.addWatchlistItem({
    watchlistId,
    ticker
  })
  
  console.log('✅ Success! Result:')
  console.log(JSON.stringify(result, null, 2))
  
  // Clean up - remove the test item
  console.log(`\nCleaning up...`)
  await watchlistService.removeWatchlistItem(watchlistId, ticker)
  console.log('✅ Test item removed')
  
} catch (error) {
  console.error('❌ Error:', error.message)
  console.error('Full error:', error)
}

await prisma.$disconnect()
