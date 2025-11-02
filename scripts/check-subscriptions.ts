import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSubscriptions() {
  console.log('\n=== Checking User Subscriptions ===\n')
  
  const users = await prisma.user.findMany({
    include: {
      subscription: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  })
  
  console.log(`Found ${users.length} most recent users:\n`)
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Created: ${user.createdAt}`)
    console.log(`   Has Subscription: ${user.subscription ? 'YES' : 'NO'}`)
    
    if (user.subscription) {
      console.log(`   Status: ${user.subscription.status}`)
      console.log(`   In Trial: ${user.subscription.isInTrial}`)
      console.log(`   Trial Ends: ${user.subscription.trialEndsAt}`)
    }
    console.log('')
  })
  
  const totalUsers = await prisma.user.count()
  const usersWithSub = await prisma.subscription.count()
  
  console.log(`\n=== Summary ===`)
  console.log(`Total Users: ${totalUsers}`)
  console.log(`Users with Subscriptions: ${usersWithSub}`)
  console.log(`Coverage: ${Math.round((usersWithSub / totalUsers) * 100)}%`)
}

checkSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
