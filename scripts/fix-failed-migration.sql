-- ============================================
-- Fix Failed Migration in Production Database
-- ============================================
-- This script marks the failed migration as rolled back
-- so new migrations can proceed
--
-- USAGE:
-- 1. Get database URL from Render dashboard
-- 2. Run: psql <DATABASE_URL> -f scripts/fix-failed-migration.sql
--
-- OR use Render web shell:
-- 1. Go to Render Dashboard -> factorly-db -> "Shell" tab
-- 2. Copy and paste the UPDATE command below

-- View current failed migrations
SELECT 
  migration_name, 
  started_at, 
  finished_at, 
  applied_steps_count,
  logs
FROM "_prisma_migrations"
WHERE finished_at IS NULL OR logs LIKE '%failed%'
ORDER BY started_at DESC;

-- Mark the failed migration as rolled back
UPDATE "_prisma_migrations"
SET 
  finished_at = NOW(),
  rolled_back_at = NOW(),
  logs = 'Manually rolled back - migration file was removed from codebase'
WHERE migration_name = '20250113_add_optimized_indexes'
  AND finished_at IS NULL;

-- Verify the fix
SELECT 
  migration_name, 
  started_at, 
  finished_at,
  rolled_back_at,
  logs
FROM "_prisma_migrations"
WHERE migration_name = '20250113_add_optimized_indexes';
