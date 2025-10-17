-- Add Advanced Composite Indexes for Query Optimization
-- These indexes improve performance for common analytics and monitoring queries

-- Search model indexes
-- User-specific ticker history (e.g., "Show me all searches by user X for ticker Y")
CREATE INDEX IF NOT EXISTS "searches_user_id_ticker_created_at_idx" ON "searches"("user_id", "ticker", "created_at" DESC);

-- Search source analytics (e.g., "Show me searches from autocomplete vs direct")
CREATE INDEX IF NOT EXISTS "searches_source_created_at_idx" ON "searches"("source", "created_at" DESC);

-- ApiRequest model indexes
-- Endpoint error analysis (e.g., "Show me all 500 errors on /api/ticker-data")
CREATE INDEX IF NOT EXISTS "api_requests_endpoint_status_code_created_at_idx" ON "api_requests"("endpoint", "status_code", "created_at" DESC);

-- Cache effectiveness tracking (e.g., "Show me cache hit rate over time")
CREATE INDEX IF NOT EXISTS "api_requests_cached_created_at_idx" ON "api_requests"("cached", "created_at" DESC);

-- User request patterns per endpoint (e.g., "Show me user X's requests to /api/ticker-data")
CREATE INDEX IF NOT EXISTS "api_requests_user_id_endpoint_created_at_idx" ON "api_requests"("user_id", "endpoint", "created_at" DESC);

-- ErrorLog model indexes
-- Active errors by type (e.g., "Show me all unresolved TIMEOUT errors")
CREATE INDEX IF NOT EXISTS "error_logs_error_code_resolved_last_seen_idx" ON "error_logs"("error_code", "resolved", "last_seen" DESC);

-- Endpoint-specific errors (e.g., "Show me all errors for /api/ticker-data endpoint")
CREATE INDEX IF NOT EXISTS "error_logs_endpoint_error_code_last_seen_idx" ON "error_logs"("endpoint", "error_code", "last_seen" DESC);

-- Ticker-specific errors (e.g., "Show me all errors related to ticker AAPL")
CREATE INDEX IF NOT EXISTS "error_logs_ticker_error_code_last_seen_idx" ON "error_logs"("ticker", "error_code", "last_seen" DESC);
