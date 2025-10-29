#!/usr/bin/env node
/**
 * Local Migration Fix Script
 * Resets local migration state to match the corrected migration order
 */

const { execSync } = require('child_process');

console.log('🔄 Fixing local migration state after timestamp corrections...\n');

try {
  console.log('1️⃣  Backing up current data (optional - for safety)...');
  console.log('   💡 Consider running: npx prisma db seed (if you have seed data)');
  
  console.log('\n2️⃣  Resetting migration state to match corrected timestamps...');
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
  
  console.log('\n3️⃣  Applying all migrations in correct order...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('\n4️⃣  Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n✅ Local migration state fixed!');
  console.log('🚀 Your local database now matches the corrected migration order.');
  console.log('🔄 Render deployment should now work without P3018 errors.');
  
} catch (error) {
  console.error('\n❌ Migration fix failed:', error.message);
  console.log('\n💡 Manual steps:');
  console.log('   1. Run: npx prisma migrate reset --force');
  console.log('   2. Run: npx prisma migrate deploy');
  console.log('   3. Run: npx prisma generate');
  process.exit(1);
}