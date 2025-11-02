// Test requireActiveSubscription middleware
import { PrismaClient } from '@prisma/client'
import { sub } from 'date-fns'

const prisma = new PrismaClient()

async function testMiddleware() {
  console.log('\n=== Testing requireActiveSubscription Middleware ===\n')
  
  // Create a test user with expired trial
  const expiredTrialEmail = `expired-trial-${Date.now()}@datoro.com`
  
  console.log('1. Creating user with EXPIRED trial...')
  const expiredUser = await prisma.user.create({
    data: {
      email: expiredTrialEmail,
      password: 'hashed',
      emailVerified: true,
      subscription: {
        create: {
          status: 'TRIALING',
          isInTrial: true,
          trialStartsAt: sub(new Date(), { days: 35 }), // 35 days ago
          trialEndsAt: sub(new Date(), { days: 5 })      // Expired 5 days ago
        }
      }
    },
    include: {
      subscription: true
    }
  })
  
  console.log(`✓ Created user: ${expiredUser.email}`)
  console.log(`  Trial ended: ${expiredUser.subscription?.trialEndsAt}`)
  console.log(`  Days expired: 5`)
  
  // Create a test user with active trial
  const activeTrialEmail = `active-trial-${Date.now()}@datoro.com`
  
  console.log('\n2. Creating user with ACTIVE trial...')
  const activeUser = await prisma.user.create({
    data: {
      email: activeTrialEmail,
      password: 'hashed',
      emailVerified: true,
      subscription: {
        create: {
          status: 'TRIALING',
          isInTrial: true,
          trialStartsAt: new Date(),
          trialEndsAt: sub(new Date(), { days: -25 })  // 25 days from now
        }
      }
    },
    include: {
      subscription: true
    }
  })
  
  console.log(`✓ Created user: ${activeUser.email}`)
  console.log(`  Trial ends: ${activeUser.subscription?.trialEndsAt}`)
  console.log(`  Days remaining: 25`)
  
  // Create user with ACTIVE paid subscription
  const paidEmail = `paid-user-${Date.now()}@datoro.com`
  
  console.log('\n3. Creating user with ACTIVE paid subscription...')
  const paidUser = await prisma.user.create({
    data: {
      email: paidEmail,
      password: 'hashed',
      emailVerified: true,
      subscription: {
        create: {
          status: 'ACTIVE',
          isInTrial: false,
          trialStartsAt: sub(new Date(), { days: 60 }),
          trialEndsAt: sub(new Date(), { days: 30 }),
          stripeSubscriptionId: 'sub_test123',
          currentPeriodEnd: sub(new Date(), { days: -30 })
        }
      }
    },
    include: {
      subscription: true
    }
  })
  
  console.log(`✓ Created user: ${paidUser.email}`)
  console.log(`  Status: ${paidUser.subscription?.status}`)
  console.log(`  Period ends: ${paidUser.subscription?.currentPeriodEnd}`)
  
  console.log('\n=== Expected Middleware Behavior ===\n')
  console.log('User 1 (Expired Trial): Should be BLOCKED (403)')
  console.log('User 2 (Active Trial):  Should have ACCESS (200)')
  console.log('User 3 (Paid Active):   Should have ACCESS (200)')
  
  console.log('\n✓ Test data created successfully!')
  console.log('\nTo test the middleware:')
  console.log('1. Login as each user')
  console.log('2. Try to access protected route (e.g., /api/ticker-data/AAPL)')
  console.log('3. Verify access control works as expected')
}

testMiddleware()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
