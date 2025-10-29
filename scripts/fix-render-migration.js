#!/usr/bin/env node
/**
 * Migration Reset Script for Render Deployment
 * Resolves P3018 migration conflicts by resetting the migration state
 */

const { execSync } = require('child_process');

console.log('🔄 Prisma Migration Reset Script for Render\n');

// Check if we're in a Render environment
const isRender = process.env.RENDER || process.env.RENDER_SERVICE_ID;

if (!isRender) {
  console.log('⚠️  This script is designed for Render deployment environments.');
  console.log('   For local development, use: npx prisma migrate reset\n');
  process.exit(1);
}

console.log('📋 Detected Render environment. Starting migration reset...\n');

try {
  // Step 1: Reset the migration state (this will drop all tables and reapply migrations)
  console.log('1️⃣  Resetting migration state...');
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
  
  // Step 2: Deploy all migrations from scratch
  console.log('\n2️⃣  Deploying all migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Step 3: Generate Prisma client
  console.log('\n3️⃣  Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n✅ Migration reset completed successfully!');
  console.log('🚀 Your database is now ready for deployment.');
  
} catch (error) {
  console.error('\n❌ Migration reset failed:', error.message);
  console.log('\n🔧 Manual recovery options:');
  console.log('   1. In Render dashboard, delete and recreate the PostgreSQL database');
  console.log('   2. Update DATABASE_URL environment variable with new database');
  console.log('   3. Redeploy the service');
  console.log('\n📚 More info: https://pris.ly/d/migrate-resolve');
  process.exit(1);
}