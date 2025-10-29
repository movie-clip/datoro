#!/usr/bin/env node
/**
 * Render Migration Recovery Script
 * Resolves P3009 error: failed migrations blocking new deployments
 * 
 * This script handles the specific case where a migration partially failed
 * and is blocking future migrations on Render.com production database.
 */

const { execSync } = require('child_process');

console.log('🔄 Render Migration Recovery Script\n');

// Check if we're in a Render environment
const isRender = process.env.RENDER || process.env.RENDER_SERVICE_ID;

if (!isRender) {
  console.log('⚠️  This script is designed for Render deployment environments.');
  console.log('   For local development, use standard Prisma commands.\n');
  process.exit(1);
}

console.log('📋 Detected Render environment');
console.log('🔧 Resolving P3009 migration conflict...\n');

try {
  // Step 1: Check current migration status
  console.log('1️⃣  Checking migration status...');
  try {
    const status = execSync('npx prisma migrate status', { encoding: 'utf8', stdio: 'pipe' });
    console.log('Migration status:', status);
  } catch (statusError) {
    console.log('⚠️  Migration status check failed (expected for P3009)');
  }

  // Step 2: Mark the failed migration as resolved
  console.log('\n2️⃣  Marking failed migration as resolved...');
  
  // The specific migration that's causing issues
  const failedMigration = '20250113_add_composite_indexes';
  
  try {
    // Try to resolve the specific failed migration
    execSync(`npx prisma migrate resolve --applied ${failedMigration}`, { 
      stdio: 'inherit',
      timeout: 30000 
    });
    console.log(`✅ Marked ${failedMigration} as resolved`);
  } catch (resolveError) {
    console.log('⚠️  Could not resolve migration with --applied flag');
    
    // Alternative: try marking it as rolled back
    try {
      execSync(`npx prisma migrate resolve --rolled-back ${failedMigration}`, { 
        stdio: 'inherit',
        timeout: 30000 
      });
      console.log(`✅ Marked ${failedMigration} as rolled back`);
    } catch (rollbackError) {
      console.log('❌ Could not resolve migration with either flag');
      throw rollbackError;
    }
  }

  // Step 3: Deploy remaining migrations
  console.log('\n3️⃣  Deploying remaining migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', timeout: 60000 });
  
  // Step 4: Generate Prisma client
  console.log('\n4️⃣  Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', timeout: 30000 });
  
  console.log('\n✅ Migration recovery completed successfully!');
  console.log('🚀 Database is ready for deployment.');
  
} catch (error) {
  console.error('\n❌ Migration recovery failed:', error.message);
  
  console.log('\n🔧 Manual recovery steps:');
  console.log('1. In Render dashboard: Database → Reset Database');
  console.log('2. This will drop all data and start fresh');
  console.log('3. Redeploy the service (migrations will run on clean database)');
  console.log('\n⚠️  WARNING: Reset will delete all production data!');
  console.log('💾 Backup data first if needed');
  
  console.log('\n📚 More info: https://pris.ly/d/migrate-resolve');
  process.exit(1);
}