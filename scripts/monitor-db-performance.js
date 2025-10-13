/**
 * Database Performance Monitoring Script
 * 
 * Run this script to:
 * 1. Check if composite indexes are deployed
 * 2. Measure query performance before/after optimization
 * 3. Monitor connection pool usage
 * 
 * Usage:
 *   node scripts/monitor-db-performance.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function checkIndexes() {
  console.log('\n📊 Checking Database Indexes...\n');
  
  try {
    // Query to check if our composite indexes exist
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (
          indexname LIKE '%ticker_created_at%'
          OR indexname LIKE '%user_id_created_at%'
          OR indexname LIKE '%endpoint_created_at%'
          OR indexname LIKE '%status_code_created_at%'
        )
      ORDER BY tablename, indexname;
    `;
    
    if (indexes.length === 0) {
      console.log('❌ No composite indexes found!');
      console.log('   Run: npx prisma migrate deploy');
      return false;
    }
    
    console.log(`✅ Found ${indexes.length} composite indexes:\n`);
    indexes.forEach(idx => {
      console.log(`   ${idx.tablename}.${idx.indexname}`);
    });
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
    return false;
  }
}

async function measureQueryPerformance() {
  console.log('\n⚡ Measuring Query Performance...\n');
  
  const queries = [
    {
      name: 'Popular Tickers (last 7 days)',
      fn: async () => {
        const start = Date.now();
        await prisma.search.groupBy({
          by: ['ticker'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          _count: { ticker: true },
          orderBy: { _count: { ticker: 'desc' } },
          take: 10
        });
        return Date.now() - start;
      }
    },
    {
      name: 'User Search History',
      fn: async () => {
        const start = Date.now();
        await prisma.search.findMany({
          where: {
            userId: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });
        return Date.now() - start;
      }
    },
    {
      name: 'API Request Stats (last 24h)',
      fn: async () => {
        const start = Date.now();
        await prisma.apiRequest.groupBy({
          by: ['endpoint', 'statusCode'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          _count: { endpoint: true },
          _avg: { responseTime: true }
        });
        return Date.now() - start;
      }
    },
    {
      name: 'Failed Requests Analysis',
      fn: async () => {
        const start = Date.now();
        await prisma.apiRequest.findMany({
          where: {
            statusCode: { gte: 400 },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        });
        return Date.now() - start;
      }
    }
  ];
  
  console.log('🔄 Running benchmark queries...\n');
  
  for (const query of queries) {
    try {
      const duration = await query.fn();
      const status = duration < 1000 ? '✅' : duration < 5000 ? '⚠️' : '❌';
      console.log(`${status} ${query.name}: ${duration}ms`);
    } catch (error) {
      console.log(`❌ ${query.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n💡 Performance Targets:');
  console.log('   ✅ Excellent: < 1s');
  console.log('   ⚠️  Acceptable: 1-5s');
  console.log('   ❌ Needs optimization: > 5s\n');
}

async function checkConnectionPool() {
  console.log('\n🔌 Connection Pool Status...\n');
  
  try {
    // Get connection pool stats from PostgreSQL
    const poolStats = await prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database();
    `;
    
    const stats = poolStats[0];
    console.log(`   Total connections: ${stats.total_connections}`);
    console.log(`   Active: ${stats.active_connections}`);
    console.log(`   Idle: ${stats.idle_connections}`);
    
    // Check for connection limit warnings
    const totalConn = parseInt(stats.total_connections);
    if (totalConn > 50) {
      console.log('\n   ⚠️  High connection count! Consider:');
      console.log('      - Reducing connection_limit in DATABASE_URL');
      console.log('      - Check for connection leaks');
      console.log('      - Verify PM2 worker count (should be 4)');
    } else {
      console.log('\n   ✅ Connection pool healthy');
    }
    
  } catch (error) {
    console.log(`   ⚠️  Could not fetch pool stats: ${error.message}`);
  }
  
  console.log('');
}

async function checkDatabaseConfig() {
  console.log('\n⚙️  Database Configuration...\n');
  
  try {
    const config = await prisma.$queryRaw`
      SELECT name, setting, unit
      FROM pg_settings
      WHERE name IN (
        'max_connections',
        'statement_timeout',
        'idle_in_transaction_session_timeout'
      );
    `;
    
    config.forEach(c => {
      const value = c.unit ? `${c.setting}${c.unit}` : c.setting;
      console.log(`   ${c.name}: ${value}`);
    });
    
  } catch (error) {
    console.log(`   ⚠️  Could not fetch config: ${error.message}`);
  }
  
  console.log('');
}

async function main() {
  console.log('\n🚀 Database Performance Monitor\n');
  console.log('=' .repeat(60));
  
  try {
    // Check if indexes are deployed
    const hasIndexes = await checkIndexes();
    
    if (!hasIndexes) {
      console.log('\n⚠️  Composite indexes not found!');
      console.log('   Deploy them with: npx prisma migrate deploy\n');
    }
    
    // Measure query performance
    await measureQueryPerformance();
    
    // Check connection pool
    await checkConnectionPool();
    
    // Check database configuration
    await checkDatabaseConfig();
    
    console.log('=' .repeat(60));
    console.log('\n✅ Monitoring complete!\n');
    
  } catch (error) {
    console.error('\n❌ Monitoring failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
