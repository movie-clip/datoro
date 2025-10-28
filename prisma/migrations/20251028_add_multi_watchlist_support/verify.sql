-- Verification Script for Multi-Watchlist Migration
-- Run this after migration to verify data integrity

-- Check 1: Verify every user with watchlist items has a default watchlist
SELECT 
    COUNT(DISTINCT wi.user_id) as users_with_items,
    COUNT(DISTINCT w.user_id) as users_with_watchlists
FROM watchlist_items wi
LEFT JOIN watchlists w ON wi.user_id = w.user_id AND w.is_default = true;
-- Expected: Both counts should be equal

-- Check 2: Verify all watchlist items have a valid watchlist_id
SELECT COUNT(*) as orphaned_items
FROM watchlist_items
WHERE watchlist_id IS NULL;
-- Expected: 0

-- Check 3: Verify no user has more than one default watchlist
SELECT user_id, COUNT(*) as default_count
FROM watchlists
WHERE is_default = true
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Expected: No rows

-- Check 4: Verify all watchlist items belong to existing watchlists
SELECT COUNT(*) as invalid_watchlist_refs
FROM watchlist_items wi
LEFT JOIN watchlists w ON wi.watchlist_id = w.id
WHERE w.id IS NULL;
-- Expected: 0

-- Check 5: Count total watchlists and items
SELECT 
    (SELECT COUNT(*) FROM watchlists) as total_watchlists,
    (SELECT COUNT(*) FROM watchlist_items) as total_items,
    (SELECT COUNT(DISTINCT user_id) FROM watchlists) as users_with_watchlists;

-- Check 6: Verify watchlist ownership matches items
SELECT 
    w.id as watchlist_id,
    w.user_id as watchlist_user,
    wi.user_id as item_user
FROM watchlists w
JOIN watchlist_items wi ON w.id = wi.watchlist_id
WHERE w.user_id != wi.user_id
LIMIT 10;
-- Expected: No rows (all watchlist items should belong to same user as watchlist)

-- Check 7: Verify no duplicate tickers within same watchlist
SELECT watchlist_id, ticker, COUNT(*) as duplicate_count
FROM watchlist_items
GROUP BY watchlist_id, ticker
HAVING COUNT(*) > 1;
-- Expected: No rows

-- Check 8: List sample watchlists with item counts
SELECT 
    w.id,
    w.user_id,
    w.name,
    w.is_default,
    COUNT(wi.id) as item_count,
    w.created_at
FROM watchlists w
LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
GROUP BY w.id, w.user_id, w.name, w.is_default, w.created_at
ORDER BY w.created_at DESC
LIMIT 20;

-- Summary Stats
SELECT 
    'Total Users' as metric,
    COUNT(DISTINCT user_id) as value
FROM watchlists
UNION ALL
SELECT 
    'Total Watchlists',
    COUNT(*)
FROM watchlists
UNION ALL
SELECT 
    'Total Watchlist Items',
    COUNT(*)
FROM watchlist_items
UNION ALL
SELECT 
    'Avg Items per Watchlist',
    ROUND(AVG(item_count), 2)
FROM (
    SELECT watchlist_id, COUNT(*) as item_count
    FROM watchlist_items
    GROUP BY watchlist_id
) counts;
