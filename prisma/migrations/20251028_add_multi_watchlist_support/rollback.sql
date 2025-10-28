-- Rollback Migration: Remove Multi-Watchlist Support
-- Date: 2025-10-28
-- Description: Reverts multi-watchlist changes and restores original schema
-- WARNING: This will DELETE all non-default watchlists and their items!

-- Step 1: Delete all watchlist items that belong to non-default watchlists
DELETE FROM "watchlist_items"
WHERE "watchlist_id" IN (
    SELECT "id" FROM "watchlists" WHERE "is_default" = false
);

-- Step 2: Drop new unique constraint
DROP INDEX IF EXISTS "watchlist_items_watchlist_id_ticker_key";

-- Step 3: Drop foreign key constraint for watchlist_id
ALTER TABLE "watchlist_items" DROP CONSTRAINT IF EXISTS "watchlist_items_watchlist_id_fkey";

-- Step 4: Drop new indexes
DROP INDEX IF EXISTS "watchlist_items_watchlist_id_idx";
DROP INDEX IF EXISTS "watchlist_items_watchlist_id_display_order_idx";
DROP INDEX IF EXISTS "watchlist_items_watchlist_id_added_at_idx";

-- Step 5: Remove watchlist_id column from watchlist_items
ALTER TABLE "watchlist_items" DROP COLUMN IF EXISTS "watchlist_id";

-- Step 6: Restore old unique constraint (user_id, ticker) if dropped
-- Only needed if Step 11 from forward migration was executed
-- CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_user_id_ticker_key" ON "watchlist_items"("user_id", "ticker");

-- Step 7: Make user_id NOT NULL again (it was made nullable in Step 12)
ALTER TABLE "watchlist_items" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 8: Drop Watchlist foreign key constraint
ALTER TABLE "watchlists" DROP CONSTRAINT IF EXISTS "watchlists_user_id_fkey";

-- Step 9: Drop Watchlist indexes
DROP INDEX IF EXISTS "watchlists_user_id_idx";
DROP INDEX IF EXISTS "watchlists_user_id_is_default_idx";
DROP INDEX IF EXISTS "watchlists_user_id_created_at_idx";

-- Step 10: Drop Watchlist table
DROP TABLE IF EXISTS "watchlists";

-- Rollback complete!
-- Original schema restored with single watchlist per user
