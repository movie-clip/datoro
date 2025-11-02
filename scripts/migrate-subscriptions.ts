/**
 * Migration Script: Create Subscription records for existing users
 * 
 * This script:
 * 1. Finds all users without a Subscription record
 * 2. Creates a trial subscription for each (30 days from their signup date)
 * 3. Migrates existing Stripe customer/subscription IDs
 * 4. Handles edge cases (users already past trial period)
 * 
 * Usage: npx tsx scripts/migrate-subscriptions.ts
 */

import { PrismaClient } from '@prisma/client'
import { add, isPast } from 'date-fns'

const prisma = new PrismaClient()

async function migrateSubscriptions() {
  console.log('🔄 Starting subscription data migration...\n')
  
  try {
    // Find all users without a subscription record
    const users = await prisma.user.findMany({
      where: {
        subscription: null
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionEndsAt: true,
        subscriptionTier: true,
      }
    })
    
    console.log(`📊 Found ${users.length} users to migrate\n`)
    
    if (users.length === 0) {
      console.log('✅ No users need migration. All users already have subscriptions.')
      return
    }
    
    let successCount = 0
    let errorCount = 0
    
    for (const user of users) {
      try {
        const trialStart = user.createdAt
        const trialEnd = add(trialStart, { days: 30 })
        const now = new Date()
        
        // Determine subscription status
        let status: 'TRIALING' | 'ACTIVE' | 'CANCELED' = 'TRIALING'
        let isInTrial = true
        
        // If user has Stripe subscription ID, they're paid (not trialing)
        if (user.stripeSubscriptionId) {
          status = 'ACTIVE'
          isInTrial = false
        }
        // If trial has expired and no Stripe ID, mark as canceled
        else if (isPast(trialEnd)) {
          status = 'CANCELED'
          isInTrial = false
        }
        
        await prisma.subscription.create({
          data: {
            userId: user.id,
            status,
            isInTrial,
            trialStartsAt: trialStart,
            trialEndsAt: trialEnd,
            
            // Migrate existing Stripe data
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: user.stripeSubscriptionId,
            currentPeriodEnd: user.subscriptionEndsAt,
            
            // If has Stripe subscription, set period dates
            ...(user.stripeSubscriptionId && user.subscriptionEndsAt ? {
              currentPeriodStart: now,
              currentPeriodEnd: user.subscriptionEndsAt
            } : {})
          }
        })
        
        successCount++
        console.log(`✅ Migrated user ${user.id} (${user.email || 'no email'}) - Status: ${status}`)
        
      } catch (error) {
        errorCount++
        console.error(`❌ Failed to migrate user ${user.id}:`, error)
      }
    }
    
    console.log(`\n📊 Migration Summary:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log(`   📈 Total: ${users.length}\n`)
    
    if (errorCount === 0) {
      console.log('✅ Migration complete! All users migrated successfully.')
    } else {
      console.log('⚠️  Migration complete with errors. Please review failed migrations above.')
    }
    
    // Verify migration
    const totalSubscriptions = await prisma.subscription.count()
    const totalUsers = await prisma.user.count()
    
    console.log(`\n🔍 Verification:`)
    console.log(`   Users: ${totalUsers}`)
    console.log(`   Subscriptions: ${totalSubscriptions}`)
    
    if (totalSubscriptions < totalUsers) {
      console.log(`   ⚠️  Warning: ${totalUsers - totalSubscriptions} users still missing subscriptions`)
    } else {
      console.log(`   ✅ All users have subscriptions!`)
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateSubscriptions()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
