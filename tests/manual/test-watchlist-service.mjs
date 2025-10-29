/**
 * Manual test for Watchlist Service (Prisma Implementation)
 * 
 * Tests:
 * 1. Get existing watchlists
 * 2. Get items from default watchlist
 * 3. Verify migrated data (12 items)
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')
dotenv.config({ path: join(rootDir, '.env') })

// Dynamic import after env is loaded
const { watchlistService } = await import('../../server/services/watchlistService.ts')
const { getPrismaClient } = await import('../../server/services/databaseService.ts')

const prisma = getPrismaClient()

async function testWatchlistService() {
  console.log('🧪 Testing Watchlist Service (Prisma Implementation)...\n')
  
  try {
    // Use the user who actually has watchlist items from migration
    const testUserId = '25ed8f43-9e43-4ac5-a201-58a5ef1bb315'
    console.log(`Using user ID: ${testUserId}\n`)
    
    // Test 1: Get watchlists for user
    console.log('📋 Test 1: Get watchlists for user')
    const watchlists = await watchlistService.getWatchlistsByUserId(testUserId)
    console.log(`Found ${watchlists.length} watchlists:`)
    watchlists.forEach(w => {
      console.log(`  - ${w.name} (ID: ${w.id}, Default: ${w.isDefault})`)
    })
    
    if (watchlists.length === 0) {
      console.log('❌ No watchlists found!')
      return
    }
    
    const defaultWatchlist = watchlists.find(w => w.isDefault)
    if (!defaultWatchlist) {
      console.log('❌ No default watchlist found!')
      return
    }
    
    console.log(`\n📋 Test 2: Get items from default watchlist`)
    const items = await watchlistService.getWatchlistItems(defaultWatchlist.id)
    console.log(`Found ${items.length} items in "${defaultWatchlist.name}":`)
    items.forEach((_item, _i) => {
      console.log(`  ${i + 1}. ${item.ticker} (Added: ${item.addedAt.toLocaleDateString()})`)
    })
    
    if (items.length === 12) {
      console.log('\n✅ SUCCESS: Found 12 migrated items as expected!')
    } else {
      console.log(`\n⚠️  Expected 12 items, found ${items.length}`)
    }
    
    // Test 4: Get stats
    console.log(`\n📋 Test 3: Get service stats`)
    const stats = await watchlistService.getStats()
    console.log('Stats:', JSON.stringify(stats, null, 2))
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (_error) {
    console.error('❌ Error during testing:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testWatchlistService()
