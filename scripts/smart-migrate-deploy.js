#!/usr/bin/env node
/**
 * Smart Migration Deploy for Render
 * Handles P3009 errors from our migration renaming (20250113 -> 20251029)
 */

import { execSync } from 'child_process';

console.log('🔄 Smart Migration Deploy...\n');

try {
  // First, try normal migration deploy
  console.log('1️⃣  Attempting normal migration deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations deployed successfully');
  
} catch (error) {
  const errorOutput = error.message || error.toString();
  
  // Check if this is the specific P3009 error from our renamed migration
  if (errorOutput.includes('P3009') && errorOutput.includes('20250113_add_composite_indexes')) {
    console.log('\n⚠️  P3009 Error detected for renamed migration');
    console.log('🔧 Resolving migration conflict from 20250113 -> 20251029 rename...\n');
    
    try {
      // Mark the old failed migration as resolved
      console.log('2️⃣  Marking old migration as resolved...');
      execSync('npx prisma migrate resolve --applied 20250113_add_composite_indexes', { 
        stdio: 'inherit' 
      });
      
      // Now try to deploy the remaining migrations
      console.log('\n3️⃣  Deploying remaining migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      console.log('\n✅ Migration conflict resolved successfully!');
      
    } catch (resolveError) {
      console.log('\n❌ Could not resolve migration conflict');
      console.log('🔧 Trying alternative resolution...');
      
      try {
        // Try marking as rolled back instead
        execSync('npx prisma migrate resolve --rolled-back 20250113_add_composite_indexes', { 
          stdio: 'inherit' 
        });
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Alternative resolution successful!');
        
      } catch (altError) {
        console.error('❌ All resolution attempts failed');
        console.log('\n🆘 Manual intervention required:');
        console.log('1. Go to Render Dashboard → Your Database');
        console.log('2. Click "Reset Database" (⚠️  will delete all data)');
        console.log('3. Redeploy your service');
        process.exit(1);
      }
    }
    
  } else {
    // Different migration error - re-throw
    console.error('❌ Migration failed with different error:', errorOutput);
    process.exit(1);
  }
}

console.log('\n🚀 Database is ready for deployment!');