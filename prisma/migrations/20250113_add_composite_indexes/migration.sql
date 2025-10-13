-- CreateIndex
-- Composite indexes for Search model (optimize popular tickers and user history queries)
CREATE INDEX "searches_ticker_created_at_idx" ON "searches"("ticker", "created_at" DESC);
CREATE INDEX "searches_user_id_created_at_idx" ON "searches"("user_id", "created_at" DESC);

-- Composite indexes for ApiRequest model (optimize analytics and monitoring queries)
CREATE INDEX "api_requests_endpoint_created_at_idx" ON "api_requests"("endpoint", "created_at" DESC);
CREATE INDEX "api_requests_status_code_created_at_idx" ON "api_requests"("status_code", "created_at" DESC);
CREATE INDEX "api_requests_user_id_created_at_idx" ON "api_requests"("user_id", "created_at" DESC);
