import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')
dotenv.config({ path: join(rootDir, '.env') })

const { getPrismaClient } = await import('../../server/services/databaseService.ts')
const prisma = getPrismaClient()

const items = await prisma.watchlistItem.findMany({
  include: { 
    user: { select: { id: true, email: true } },
    watchlist: { select: { id: true, name: true, userId: true } }
  },
  take: 3
})

console.log('Watchlist Items:')
items.forEach((item, i) => {
  console.log(`\n${i + 1}. Ticker: ${item.ticker}`)
  console.log(`   User ID: ${item.userId || 'null'}`)
  console.log(`   User Email: ${item.user?.email || 'no user'}`)
  console.log(`   Watchlist ID: ${item.watchlistId}`)
  console.log(`   Watchlist Name: ${item.watchlist?.name || 'no watchlist'}`)
  console.log(`   Watchlist Owner: ${item.watchlist?.userId || 'unknown'}`)
})

const allWatchlists = await prisma.watchlist.findMany({
  include: {
    _count: { select: { items: true } }
  }
})

console.log(`\n\nAll Watchlists (${allWatchlists.length}):`)
allWatchlists.forEach((w, i) => {
  console.log(`${i + 1}. "${w.name}" - User: ${w.userId} - Items: ${w._count.items} - Default: ${w.isDefault}`)
})

await prisma.$disconnect()
