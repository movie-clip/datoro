# Google Analytics 4 - Quick Guide

## Current Status
✅ **GA4 is fully implemented and tracking events**

- **Measurement ID**: `G-PHL9SEVDV0`
- **Location**: `index.html` (gtag.js script)
- **Service**: `src/services/analytics/gaService.ts`
- **Consent**: Granted (development) - Cookie banner needed for production

## Events Being Tracked

| Event | Trigger | Parameters |
|-------|---------|------------|
| `search_ticker` | User searches/selects ticker | ticker_symbol, search_method |
| `view_ticker_data` | Ticker data loads | ticker_symbol, load_time_ms |
| `view_tab` | User switches tabs | tab_name |
| `view_check_list` | Check List panel loads | ticker_symbol |
| `add_to_watchlist` | Add to watchlist | ticker_symbol, is_authenticated |
| `remove_from_watchlist` | Remove from watchlist | ticker_symbol |
| `open_deep_finder` | Opens Deep Finder tool | - |
| `open_dcf_calculator` | Opens DCF Calculator tool | - |
| `open_macro_dashboard` | Opens Macro Dashboard tool | - |
| `open_market_performance` | Opens Market Performance modal | - |
| `sign_up` | User registration | method (email/google) |
| `login` | User login | method (email/google) |
| `verify_email` | Email verified | - |
| `view_chart` | Chart interaction | chart_type, ticker_symbol |
| `view_ai_insight` | AI insight clicked | ticker_symbol |
| `error_occurred` | App errors | error_type, error_message |

## Testing in Development

**1. Check Console Logs**
```javascript
// Open DevTools Console (F12)
// Search for a ticker - you should see:
[GA4 Event] search_ticker {ticker_symbol: 'AAPL', search_method: 'direct'}
```

**2. Verify gtag is Loaded**
```javascript
// In browser console:
typeof window.gtag === 'function'  // Should return true
window.dataLayer  // Should show array of events
```

**3. View in GA4 DebugView**
- Go to: https://analytics.google.com/analytics/web/#/a483848134p451088734/debugview
- Enable debug mode: Install "Google Analytics Debugger" Chrome extension
- Events appear in real-time (20-second delay)

## What to Do Next

### 1. Mark Key Events as Conversions (Required for Ads)
1. Go to GA4 Admin → Events
2. Mark these as conversions:
   - ✅ `sign_up` (Primary conversion)
   - ✅ `verify_email` (Registration completion)
   - ✅ `add_to_watchlist` (Engagement signal)
   - ✅ `open_dcf_calculator` (Tool usage - high intent)
   - ✅ `open_deep_finder` (Tool usage - high intent)
3. These conversions will be imported into Google Ads for campaign optimization

### 2. Create Retargeting Audiences
1. Go to GA4 Admin → Audiences → New Audience
2. Create:
   - **Active Users**: Users who triggered `search_ticker` in last 30 days
   - **Tab Engagement**: Users who viewed multiple tabs (view_tab count > 3)
   - **High Intent - Tools**: Users who opened DCF Calculator or Deep Finder
   - **High Intent - Watchlist**: Users who added to watchlist but didn't sign up
   - **Registered Users**: Users who triggered `sign_up`
3. Link audiences to Google Ads account for retargeting campaigns

### 3. Cookie Consent Banner (Before Production)
- **Current**: Consent is auto-granted (development only)
- **Production**: Must implement cookie banner (GDPR/CCPA compliance)
- **Task**: Use `cookieconsent` library + `updateAnalyticsConsent()` function
- **Default**: Deny analytics until user opts in

### 4. Verify Event Parameters
1. Admin → DebugView → Click any event
2. Check parameters are populated correctly
3. Fix any missing/incorrect data before running ads

## Common Issues

**Events not showing in console?**
- Check `index.html` has Measurement ID `G-PHL9SEVDV0`
- Verify consent is granted (check `gtag('consent', 'update', ...)` in `index.html`)
- Disable ad blockers (uBlock Origin blocks gtag.js)

**Events not in GA4 dashboard?**
- DebugView only shows events when debug mode is enabled
- Realtime reports have ~20 second delay
- Standard reports have 24-48 hour delay
- Check property ID matches in both `index.html` and GA4 dashboard

**Duplicate events?**
- ✅ Fixed: `App.vue` watcher now handles all ticker changes
- Don't call `setTicker()` manually - let the watcher handle it

## File Locations

- **Script**: `index.html` (lines 8-32)
- **Service**: `src/services/analytics/gaService.ts`
- **Integration**: 
  - `src/stores/tickerStore.ts` (search, view)
  - `src/stores/authStore.ts` (signup, login)
  - `src/composables/useWatchlist.ts` (watchlist add/remove)
  - `src/components/auth/VerifyEmailPage.vue` (email verification)

## Production Checklist

Before deploying to production with ads:

- [ ] Mark conversions in GA4 (sign_up, verify_email, add_to_watchlist)
- [ ] Create retargeting audiences
- [ ] Implement cookie consent banner
- [ ] Test all events in DebugView
- [ ] Link GA4 property to Google Ads account
- [ ] Set up custom domain (required for ad approval)
- [ ] Verify SSL certificate is active

---

**Quick Test**: Search for any ticker → Check console → Should see ONE `[GA4 Event] search_ticker` message
