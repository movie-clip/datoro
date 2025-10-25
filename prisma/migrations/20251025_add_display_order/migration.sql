-- AlterTable
ALTER TABLE "watchlist_items" ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "watchlist_items_user_id_display_order_idx" ON "watchlist_items"("user_id", "display_order");
