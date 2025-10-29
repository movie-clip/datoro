-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "avatar_url" TEXT,
    "name" TEXT,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "subscription_status" TEXT NOT NULL DEFAULT 'active',
    "subscription_ends_at" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "query" TEXT,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "watchlist_id" TEXT NOT NULL,
    "user_id" TEXT,
    "ticker" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popular_tickers" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "company_name" TEXT,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "last_searched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popular_tickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "status_code" INTEGER NOT NULL,
    "response_time" INTEGER NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "cache_hit_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_response_time" INTEGER NOT NULL DEFAULT 0,
    "error_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "top_ticker" TEXT,
    "top_endpoint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "error_code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "endpoint" TEXT,
    "ticker" TEXT,
    "stack_trace" TEXT,
    "user_id" TEXT,
    "ip_address" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_google_id_idx" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_subscription_tier_idx" ON "users"("subscription_tier");

-- CreateIndex
CREATE INDEX "users_subscription_status_idx" ON "users"("subscription_status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "searches_ticker_idx" ON "searches"("ticker");

-- CreateIndex
CREATE INDEX "searches_user_id_idx" ON "searches"("user_id");

-- CreateIndex
CREATE INDEX "searches_created_at_idx" ON "searches"("created_at");

-- CreateIndex
CREATE INDEX "searches_ticker_created_at_idx" ON "searches"("ticker", "created_at" DESC);

-- CreateIndex
CREATE INDEX "searches_user_id_created_at_idx" ON "searches"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "searches_user_id_ticker_created_at_idx" ON "searches"("user_id", "ticker", "created_at" DESC);

-- CreateIndex
CREATE INDEX "searches_source_created_at_idx" ON "searches"("source", "created_at" DESC);

-- CreateIndex
CREATE INDEX "watchlists_user_id_idx" ON "watchlists"("user_id");

-- CreateIndex
CREATE INDEX "watchlists_user_id_is_default_idx" ON "watchlists"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "watchlists_user_id_created_at_idx" ON "watchlists"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "watchlist_items_watchlist_id_idx" ON "watchlist_items"("watchlist_id");

-- CreateIndex
CREATE INDEX "watchlist_items_watchlist_id_display_order_idx" ON "watchlist_items"("watchlist_id", "display_order");

-- CreateIndex
CREATE INDEX "watchlist_items_watchlist_id_added_at_idx" ON "watchlist_items"("watchlist_id", "added_at" DESC);

-- CreateIndex
CREATE INDEX "watchlist_items_ticker_idx" ON "watchlist_items"("ticker");

-- CreateIndex
CREATE INDEX "watchlist_items_user_id_display_order_idx" ON "watchlist_items"("user_id", "display_order");

-- CreateIndex
CREATE INDEX "watchlist_items_user_id_added_at_idx" ON "watchlist_items"("user_id", "added_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_watchlist_id_ticker_key" ON "watchlist_items"("watchlist_id", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "popular_tickers_ticker_key" ON "popular_tickers"("ticker");

-- CreateIndex
CREATE INDEX "popular_tickers_search_count_idx" ON "popular_tickers"("search_count" DESC);

-- CreateIndex
CREATE INDEX "popular_tickers_last_searched_idx" ON "popular_tickers"("last_searched" DESC);

-- CreateIndex
CREATE INDEX "api_requests_endpoint_idx" ON "api_requests"("endpoint");

-- CreateIndex
CREATE INDEX "api_requests_status_code_idx" ON "api_requests"("status_code");

-- CreateIndex
CREATE INDEX "api_requests_created_at_idx" ON "api_requests"("created_at");

-- CreateIndex
CREATE INDEX "api_requests_user_id_idx" ON "api_requests"("user_id");

-- CreateIndex
CREATE INDEX "api_requests_endpoint_created_at_idx" ON "api_requests"("endpoint", "created_at" DESC);

-- CreateIndex
CREATE INDEX "api_requests_status_code_created_at_idx" ON "api_requests"("status_code", "created_at" DESC);

-- CreateIndex
CREATE INDEX "api_requests_user_id_created_at_idx" ON "api_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "api_requests_endpoint_status_code_created_at_idx" ON "api_requests"("endpoint", "status_code", "created_at" DESC);

-- CreateIndex
CREATE INDEX "api_requests_cached_created_at_idx" ON "api_requests"("cached", "created_at" DESC);

-- CreateIndex
CREATE INDEX "api_requests_user_id_endpoint_created_at_idx" ON "api_requests"("user_id", "endpoint", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_date_key" ON "daily_analytics"("date");

-- CreateIndex
CREATE INDEX "daily_analytics_date_idx" ON "daily_analytics"("date" DESC);

-- CreateIndex
CREATE INDEX "error_logs_error_code_idx" ON "error_logs"("error_code");

-- CreateIndex
CREATE INDEX "error_logs_endpoint_idx" ON "error_logs"("endpoint");

-- CreateIndex
CREATE INDEX "error_logs_ticker_idx" ON "error_logs"("ticker");

-- CreateIndex
CREATE INDEX "error_logs_resolved_idx" ON "error_logs"("resolved");

-- CreateIndex
CREATE INDEX "error_logs_first_seen_idx" ON "error_logs"("first_seen" DESC);

-- CreateIndex
CREATE INDEX "error_logs_error_code_resolved_last_seen_idx" ON "error_logs"("error_code", "resolved", "last_seen" DESC);

-- CreateIndex
CREATE INDEX "error_logs_endpoint_error_code_last_seen_idx" ON "error_logs"("endpoint", "error_code", "last_seen" DESC);

-- CreateIndex
CREATE INDEX "error_logs_ticker_error_code_last_seen_idx" ON "error_logs"("ticker", "error_code", "last_seen" DESC);

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "searches" ADD CONSTRAINT "searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
