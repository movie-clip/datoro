-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "users_ip_address_idx" ON "users"("ip_address");

-- CreateIndex
CREATE INDEX "searches_ticker_idx" ON "searches"("ticker");

-- CreateIndex
CREATE INDEX "searches_user_id_idx" ON "searches"("user_id");

-- CreateIndex
CREATE INDEX "searches_created_at_idx" ON "searches"("created_at");

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

-- AddForeignKey
ALTER TABLE "searches" ADD CONSTRAINT "searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
