#!/usr/bin/env node
/**
 * Render Migration Deploy Script
 * Handles both fresh database initialization and incremental migrations
 */

const { execSync } = require('child_process');

console.log('🔄 Starting Prisma migration deployment...\n');

try {
  // First, generate the Prisma client
  console.log('1️⃣  Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Check migration status
  console.log('\n2️⃣  Checking migration status...');
  
  try {
    // Try to get migration status - this will fail if database is completely fresh
    const statusOutput = execSync('npx prisma migrate status --verbose', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (statusOutput.includes('Database schema is up to date')) {
      console.log('✅ Database is already up to date');
      return;
    }
    
    if (statusOutput.includes('migrations have not yet been applied')) {
      console.log('📋 Found pending migrations, applying...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
      return;
    }
    
  } catch (statusError) {
    // If migrate status fails, the database might not be initialized
    console.log('⚠️  Migration status check failed, attempting database initialization...');
    
    try {
      // Try to deploy migrations (this works for fresh databases)
      console.log('\n3️⃣  Deploying migrations to fresh database...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Fresh database initialized with all migrations');
      
    } catch (deployError) {
      if (deployError.message.includes('P3018')) {
        console.log('\n❌ P3018 Error detected - migration conflict');
        console.log('🔧 Attempting migration reset...');
        
        // Force reset and redeploy
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migration reset completed');
        
      } else {
        throw deployError;
      }
    }
  }
  
  console.log('\n🚀 Database migration completed successfully!');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check DATABASE_URL environment variable');
  console.log('2. Verify PostgreSQL database is accessible');
  console.log('3. Check migration files in prisma/migrations/');
  console.log('4. Consider recreating the database in Render dashboard');
  
  process.exit(1);
}