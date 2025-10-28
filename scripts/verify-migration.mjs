// Quick verification script for multi-watchlist migration
// Run: node scripts/verify-migration.mjs

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMigration() {
  console.log('🔍 Verifying Multi-Watchlist Migration...\n')

  try {
    // Check 1: Count users with watchlists
    const usersWithItems = await prisma.watchlistItem.groupBy({
      by: ['userId'],
      where: { userId: { not: null } }
    })
    
    const usersWithWatchlists = await prisma.watchlist.groupBy({
      by: ['userId']
    })
    
    console.log('✓ Check 1: Users with items vs watchlists')
    console.log(`  - Users with watchlist items: ${usersWithItems.length}`)
    console.log(`  - Users with watchlists: ${usersWithWatchlists.length}`)
    console.log(`  - Match: ${usersWithItems.length === usersWithWatchlists.length ? '✅' : '❌'}\n`)

    // Check 2: Verify all items have watchlist_id
    const totalItems = await prisma.watchlistItem.count()
    const itemsWithWatchlistId = await prisma.watchlistItem.count({
      where: {
        watchlistId: { not: '' }
      }
    })
    
    console.log('✓ Check 2: Items with watchlist_id')
    console.log(`  - Total items: ${totalItems}`)
    console.log(`  - Items with watchlist_id: ${itemsWithWatchlistId}`)
    console.log(`  - All have watchlist_id: ${totalItems === itemsWithWatchlistId ? '✅' : '❌'}\n`)

    // Check 3: Verify no user has multiple default watchlists
    const usersWithMultipleDefaults = await prisma.watchlist.groupBy({
      by: ['userId'],
      where: { isDefault: true },
      having: { userId: { _count: { gt: 1 } } }
    })
    
    console.log('✓ Check 3: Users with multiple default watchlists (should be 0)')
    console.log(`  - Users with multiple defaults: ${usersWithMultipleDefaults.length}`)
    console.log(`  - Valid: ${usersWithMultipleDefaults.length === 0 ? '✅' : '❌'}\n`)

    // Check 4: Count totals
    const totalWatchlists = await prisma.watchlist.count()
    const totalItemsCount = await prisma.watchlistItem.count()
    const defaultWatchlists = await prisma.watchlist.count({
      where: { isDefault: true }
    })
    
    console.log('✓ Check 4: Summary statistics')
    console.log(`  - Total watchlists: ${totalWatchlists}`)
    console.log(`  - Default watchlists: ${defaultWatchlists}`)
    console.log(`  - Total watchlist items: ${totalItemsCount}\n`)

    // Check 5: Sample watchlists
    const sampleWatchlists = await prisma.watchlist.findMany({
      take: 5,
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('✓ Check 5: Sample watchlists')
    sampleWatchlists.forEach(w => {
      console.log(`  - ${w.name} (${w.isDefault ? 'default' : 'custom'}) - ${w._count.items} items - User: ${w.userId.substring(0, 8)}...`)
    })

    console.log('\n✅ Migration verification complete!')
    console.log(`\nSummary:`)
    console.log(`  - ${totalWatchlists} watchlists created`)
    console.log(`  - ${totalItems} items migrated`)
    console.log(`  - ${defaultWatchlists} default watchlists`)
    console.log(`  - All items have valid watchlist_id: ${totalItems === itemsWithWatchlistId ? '✅' : '❌'}`)
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyMigration()
