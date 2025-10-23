-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_items_user_id_added_at_idx" ON "watchlist_items"("user_id", "added_at" DESC);

-- CreateIndex
CREATE INDEX "watchlist_items_ticker_idx" ON "watchlist_items"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_user_id_ticker_key" ON "watchlist_items"("user_id", "ticker");

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
