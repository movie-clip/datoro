-- Migration: Add Multi-Watchlist Support
-- Date: 2025-10-28
-- Description: Creates Watchlist table and migrates existing WatchlistItem data

-- Step 1: Create Watchlist table
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes for Watchlist table
CREATE INDEX "watchlists_user_id_idx" ON "watchlists"("user_id");
CREATE INDEX "watchlists_user_id_is_default_idx" ON "watchlists"("user_id", "is_default");
CREATE INDEX "watchlists_user_id_created_at_idx" ON "watchlists"("user_id", "created_at" DESC);

-- Step 3: Add foreign key for Watchlist
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Create default watchlist for each user with existing watchlist items
INSERT INTO "watchlists" ("id", "user_id", "name", "is_default", "created_at", "updated_at")
SELECT 
    gen_random_uuid()::text,
    "user_id",
    'My Watchlist',
    true,
    MIN("added_at"),
    CURRENT_TIMESTAMP
FROM "watchlist_items"
GROUP BY "user_id";

-- Step 5: Add watchlist_id column to watchlist_items (nullable for now)
ALTER TABLE "watchlist_items" ADD COLUMN "watchlist_id" TEXT;

-- Step 6: Populate watchlist_id with default watchlist for each user
UPDATE "watchlist_items" wi
SET "watchlist_id" = w."id"
FROM "watchlists" w
WHERE wi."user_id" = w."user_id" AND w."is_default" = true;

-- Step 7: Make watchlist_id NOT NULL after populating
ALTER TABLE "watchlist_items" ALTER COLUMN "watchlist_id" SET NOT NULL;

-- Step 8: Create new indexes for watchlist_id
CREATE INDEX "watchlist_items_watchlist_id_idx" ON "watchlist_items"("watchlist_id");
CREATE INDEX "watchlist_items_watchlist_id_display_order_idx" ON "watchlist_items"("watchlist_id", "display_order");
CREATE INDEX "watchlist_items_watchlist_id_added_at_idx" ON "watchlist_items"("watchlist_id", "added_at" DESC);

-- Step 9: Add foreign key constraint for watchlist_id
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_fkey" 
    FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Create new unique constraint (watchlist_id, ticker) 
-- Note: We keep the old (user_id, ticker) constraint temporarily for backward compatibility
CREATE UNIQUE INDEX "watchlist_items_watchlist_id_ticker_key" ON "watchlist_items"("watchlist_id", "ticker");

-- Step 11: Drop old unique constraint (user_id, ticker)
-- This is commented out to maintain backward compatibility during transition
-- Uncomment after verifying migration works correctly
-- DROP INDEX "watchlist_items_user_id_ticker_key";

-- Step 12: Make user_id nullable (for future cleanup after migration verification)
-- This is commented out to maintain backward compatibility during transition
-- Uncomment after verifying migration works correctly and updating all code
-- ALTER TABLE "watchlist_items" ALTER COLUMN "user_id" DROP NOT NULL;

-- Migration complete!
-- Next steps (after verification):
-- 1. Verify all watchlists and items migrated correctly
-- 2. Test create/read/update/delete operations with new schema
-- 3. Update all application code to use watchlist_id instead of user_id
-- 4. Uncomment Step 11 and 12 to complete cleanup
-- 5. Remove user_id column entirely in future migration (optional)
