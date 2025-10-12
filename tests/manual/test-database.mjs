#!/usr/bin/env node

/**
 * Database Connection Test
 * 
 * Tests connection to Supabase/PostgreSQL database
 * Run: node test-database.mjs
 */

import { 
  checkDatabaseHealth,
  getPrismaClient,
  trackSearch,
  getPopularTickers,
  findOrCreateUser 
} from './server/services/databaseService.js';

async function testDatabase() {
  console.log('🧪 Testing Database Connection...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing health check...');
    const healthy = await checkDatabaseHealth();
    if (!healthy) {
      throw new Error('Database health check failed!');
    }
    console.log('   ✅ Database is healthy\n');

    // Test 2: Count tables
    console.log('2️⃣  Checking tables...');
    const db = getPrismaClient();
    
    const userCount = await db.user.count();
    const searchCount = await db.search.count();
    const tickerCount = await db.popularTicker.count();
    const requestCount = await db.apiRequest.count();
    
    console.log(`   ✅ Users: ${userCount}`);
    console.log(`   ✅ Searches: ${searchCount}`);
    console.log(`   ✅ Popular Tickers: ${tickerCount}`);
    console.log(`   ✅ API Requests: ${requestCount}\n`);

    // Test 3: Create test data
    console.log('3️⃣  Creating test data...');
    
    // Track a search
    await trackSearch('127.0.0.1', 'AAPL', 'Test User Agent', 'direct', 'apple');
    console.log('   ✅ Tracked search for AAPL');
    
    // Track another search
    await trackSearch('127.0.0.1', 'MSFT', 'Test User Agent', 'search', 'microsoft');
    console.log('   ✅ Tracked search for MSFT\n');

    // Test 4: Retrieve data
    console.log('4️⃣  Retrieving data...');
    const popular = await getPopularTickers(5);
    console.log('   ✅ Popular Tickers:');
    popular.forEach(t => {
      console.log(`      - ${t.ticker}: ${t.searchCount} searches`);
    });

    console.log('\n✅ All tests passed!');
    console.log('\n📊 Database is ready to use!');
    console.log('\n🔧 Next steps:');
    console.log('   1. Open Prisma Studio: npx prisma studio');
    console.log('   2. Restart PM2: npm run pm2:reload');
    console.log('   3. Check logs: npm run pm2:logs');

  } catch (error) {
    console.error('\n❌ Database test failed:');
    console.error('   Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env.local');
    console.error('   2. Verify Supabase project is active');
    console.error('   3. Run migrations: npx prisma migrate dev');
    console.error('   4. See SUPABASE_SETUP.md for help');
    process.exit(1);
  } finally {
    // Disconnect
    const db = getPrismaClient();
    await db.$disconnect();
  }
}

// Run test
testDatabase();
