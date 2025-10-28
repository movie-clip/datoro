# Multi-Watchlist Migration

**Migration ID:** `20251028_add_multi_watchlist_support`  
**Date:** October 28, 2025  
**Status:** Ready for execution

## Overview

This migration adds support for multiple watchlists per user. Previously, each user could only have one watchlist. Now users can create up to 5 watchlists with custom names.

## Changes

### New Tables
- **`watchlists`**: Container for user watchlists
  - `id` (UUID, primary key)
  - `user_id` (foreign key to users)
  - `name` (user-defined watchlist name)
  - `is_default` (boolean, one default per user)
  - `created_at`, `updated_at` (timestamps)

### Modified Tables
- **`watchlist_items`**: Now belongs to a watchlist instead of directly to a user
  - Added `watchlist_id` (foreign key to watchlists)
  - Kept `user_id` temporarily for backward compatibility
  - New unique constraint: `(watchlist_id, ticker)`
  - Old constraint `(user_id, ticker)` kept temporarily

## Migration Strategy

The migration follows a **phased approach** to ensure zero data loss:

### Phase 1: Schema Extension (This Migration)
1. Create `watchlists` table
2. Create default watchlist for each existing user
3. Add `watchlist_id` to `watchlist_items`
4. Migrate all existing items to default watchlist
5. Keep `user_id` in `watchlist_items` for backward compatibility

### Phase 2: Application Update (After Migration)
1. Update all application code to use `watchlist_id`
2. Test thoroughly in staging
3. Deploy to production

### Phase 3: Cleanup (Future Migration - Optional)
1. Drop old `user_id` column from `watchlist_items`
2. Drop old unique constraint `(user_id, ticker)`
3. Drop legacy indexes

## Data Migration

### Automatic Migration
- **Every user** with existing watchlist items will automatically get a **default watchlist** named "My Watchlist"
- **All existing items** will be migrated to this default watchlist
- **Display order** and **added dates** are preserved
- **No data loss** - all tickers remain in user's watchlist

### Example
Before migration:
```
User A:
  - watchlist_items: [AAPL, GOOGL, MSFT]

User B:
  - watchlist_items: [TSLA, NVDA]
```

After migration:
```
User A:
  - Watchlist "My Watchlist" (default): [AAPL, GOOGL, MSFT]

User B:
  - Watchlist "My Watchlist" (default): [TSLA, NVDA]
```

## Execution Steps

### 1. Backup Database (CRITICAL)
```bash
# Production
pg_dump -h <host> -U <user> -d factorly_prod > backup_before_watchlist_migration_$(date +%Y%m%d).sql

# Development
pg_dump -h localhost -U postgres -d factorly_dev > backup_dev_$(date +%Y%m%d).sql
```

### 2. Run Migration
```bash
# Development
npx prisma migrate deploy

# Production (via Render dashboard or CLI)
# Migration will run automatically on deploy
```

### 3. Verify Migration
```bash
# Run verification queries
psql -h <host> -U <user> -d <database> -f prisma/migrations/20251028_add_multi_watchlist_support/verify.sql
```

### 4. Test Application
- [ ] Create new watchlist
- [ ] Switch between watchlists
- [ ] Add tickers to different watchlists
- [ ] Rename watchlist
- [ ] Delete non-default watchlist
- [ ] Verify isolation (tickers in one watchlist don't appear in another)

## Rollback

If issues occur, run the rollback script:

```bash
psql -h <host> -U <user> -d <database> -f prisma/migrations/20251028_add_multi_watchlist_support/rollback.sql
```

**⚠️ WARNING:** Rollback will **DELETE** all non-default watchlists and their items!

## Verification Checklist

After migration, verify:
- [ ] All users with items have a default watchlist
- [ ] All watchlist_items have valid watchlist_id
- [ ] No user has multiple default watchlists
- [ ] No orphaned items
- [ ] Item counts match pre-migration
- [ ] Application can read existing watchlists
- [ ] Application can create new watchlists
- [ ] Users can add/remove tickers

## Performance Impact

- **Estimated downtime:** < 5 seconds (with indexes)
- **Migration time:** ~1 second per 10,000 items
- **Indexes:** Created for optimal query performance
- **Lock duration:** Minimal (uses CONCURRENTLY where possible)

## Indexes Created

1. `watchlists_user_id_idx` - User's watchlists lookup
2. `watchlists_user_id_is_default_idx` - Fast default watchlist lookup
3. `watchlists_user_id_created_at_idx` - Watchlist ordering
4. `watchlist_items_watchlist_id_idx` - Items by watchlist
5. `watchlist_items_watchlist_id_display_order_idx` - Ordered retrieval
6. `watchlist_items_watchlist_id_added_at_idx` - Recently added items
7. `watchlist_items_watchlist_id_ticker_key` (UNIQUE) - No duplicates

## Risk Assessment

- **Risk Level:** Low-Medium
- **Backward Compatible:** Yes (Phase 1)
- **Reversible:** Yes (with data loss for new watchlists)
- **Tested:** Extensively in development

## Support

If issues occur:
1. Check migration logs
2. Run verification script
3. Check Prisma client regeneration
4. Contact dev team if data inconsistencies found

## References

- **Feature Branch:** `feature/watchlist-list`
- **Mock Implementation:** `server/services/mockWatchlistService.ts`
- **Frontend Composable:** `src/composables/useWatchlists.ts`
- **API Routes:** `server/routes/watchlists.ts`, `server/routes/watchlistItems.ts`
