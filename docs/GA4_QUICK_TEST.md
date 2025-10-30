# GA4 Quick Test Checklist

**After replacing `G-XXXXXXXXXX` with your actual Measurement ID in `index.html`:**

## 1. Start Dev Server
```powershell
npm run start:dev
```

## 2. Open GA4 DebugView
- Go to https://analytics.google.com/
- Admin → Your Property → DebugView

## 3. Test Events (Check Each ✓)

### Page Load
- [ ] Visit http://localhost:5173
- [ ] See `page_view` event in DebugView

### Search Stock
- [ ] Search for "AAPL" in search bar
- [ ] See `search_ticker` event
- [ ] Parameters: `ticker_symbol: "AAPL"`, `search_method: "direct"`

### View Data
- [ ] Wait for AAPL data to load
- [ ] See `view_ticker_data` event
- [ ] Parameters: `ticker_symbol: "AAPL"`, `data_load_time_ms: (number)`

### Sign Up
- [ ] Click "Sign Up" button
- [ ] Register with email/password
- [ ] See `sign_up` event
- [ ] Parameters: `method: "email"`

### Email Verification
- [ ] Check console for verification URL
- [ ] Copy and paste URL in browser
- [ ] See `verify_email` event

### Login
- [ ] Log out, then log back in
- [ ] See `login` event
- [ ] Parameters: `method: "email"`

### Watchlist (requires login)
- [ ] Click star icon on a stock
- [ ] See `add_to_watchlist` event
- [ ] Parameters: `ticker_symbol: (stock)`, `is_authenticated: true`
- [ ] Click star again to remove
- [ ] See `remove_from_watchlist` event

## 4. Browser Console Check
Open DevTools Console (F12) and verify:
```
[GA4 Event] search_ticker {ticker_symbol: "AAPL", search_method: "direct"}
[GA4 Event] view_ticker_data {ticker_symbol: "AAPL", data_load_time_ms: 350}
[GA4 Event] sign_up {method: "email"}
```

## 5. Production Deployment
After testing locally:
```powershell
# Replace G-XXXXXXXXXX in index.html with your real Measurement ID
# Then deploy:
npm run build
git add .
git commit -m "Add GA4 tracking with Measurement ID"
git push origin main
```

## 6. Mark as Conversions
In GA4 dashboard:
1. Admin → Events
2. Toggle "Mark as conversion" for:
   - ✅ `sign_up`
   - ✅ `verify_email`
   - ✅ `add_to_watchlist`

---

**Full Guide:** See `docs/GA4_SETUP_GUIDE.md` for detailed step-by-step instructions.

**Troubleshooting:**
- Events not showing? Disable ad blockers and clear cache
- "gtag is not defined"? Check script loads in `<head>` before app code
- Still stuck? Check browser console for errors
