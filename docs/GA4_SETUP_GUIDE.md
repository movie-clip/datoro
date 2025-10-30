# Google Analytics 4 Setup Guide

## Overview
This guide walks you through setting up Google Analytics 4 (GA4) for Datoro to track user behavior, measure ad campaign performance, and optimize conversion funnels.

## Prerequisites
- Google account
- Access to [Google Analytics](https://analytics.google.com/)
- Datoro codebase with GA4 integration (already implemented)

---

## Step 1: Create GA4 Property

### 1.1 Sign in to Google Analytics
1. Go to https://analytics.google.com/
2. Sign in with your Google account
3. Click **Admin** (gear icon in bottom left)

### 1.2 Create Property
1. Click **Create Property** button
2. Fill in property details:
   - **Property name**: `Datoro`
   - **Reporting time zone**: Your time zone (e.g., `United States - Eastern Time`)
   - **Currency**: `USD` (or your preferred currency)
3. Click **Next**

### 1.3 Configure Business Details
1. **Industry category**: `Finance` or `Technology`
2. **Business size**: Select appropriate size
3. Click **Next**

### 1.4 Set Business Objectives
1. Select objectives (check all that apply):
   - ✅ **Generate leads** (email signups)
   - ✅ **Examine user behavior** (how users interact)
   - ✅ **Measure advertising ROI** (Google/Instagram ads)
2. Click **Create**

### 1.5 Accept Terms of Service
1. Select your country
2. Check the boxes to accept terms
3. Click **Accept**

### 1.6 Choose Platform
1. Select **Web** platform
2. Click **Next**

### 1.7 Set Up Data Stream
1. **Website URL**: `https://datoro.com` (use your actual domain)
   - For testing: `http://localhost:5173`
2. **Stream name**: `Datoro Web`
3. **Enhanced measurement**: Leave toggles ON (recommended)
   - Page views ✅
   - Scrolls ✅
   - Outbound clicks ✅
   - Site search ✅
   - Video engagement ✅
   - File downloads ✅
4. Click **Create stream**

### 1.8 Copy Measurement ID
1. After creation, you'll see **Measurement ID** (looks like `G-XXXXXXXXXX`)
2. **COPY THIS ID** - you'll need it in Step 2

---

## Step 2: Add Measurement ID to Datoro

### 2.1 Update index.html
1. Open `d:\projects\datoro\index.html`
2. Find the GA4 script section (around line 53):
   ```html
   <!-- Google Analytics 4 -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   ```
3. Replace **ALL instances** of `G-XXXXXXXXXX` with your actual Measurement ID:
   ```html
   <!-- Google Analytics 4 -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     
     window.GA_MEASUREMENT_ID = 'G-ABC123DEF4';  // ← Replace here
     
     gtag('config', 'G-ABC123DEF4', {  // ← And here
       cookie_flags: 'SameSite=None;Secure',
       anonymize_ip: true,
       send_page_view: true
     });
   ```
4. Save the file

### 2.2 Rebuild Frontend (if production)
```powershell
npm run build
```

---

## Step 3: Test GA4 Events

### 3.1 Enable Debug Mode
1. In Chrome, install [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) extension
2. Click the extension icon to enable debugging

### 3.2 Start Development Server
```powershell
npm run start:dev
```

### 3.3 Open DebugView in GA4
1. Go to Google Analytics dashboard
2. Click **Admin** → Your property → **DebugView** (under Data Display)
3. You should see your device appear in DebugView within 30 seconds

### 3.4 Test Each Event

**Test 1: Page View**
- Action: Navigate to http://localhost:5173
- Expected: `page_view` event appears in DebugView
- Parameters: `page_location`, `page_title`

**Test 2: Search Ticker**
- Action: Search for a stock (e.g., "AAPL")
- Expected: `search_ticker` event appears
- Parameters:
  - `ticker_symbol`: `AAPL`
  - `search_method`: `direct`

**Test 3: View Ticker Data**
- Action: Wait for AAPL data to load
- Expected: `view_ticker_data` event appears
- Parameters:
  - `ticker_symbol`: `AAPL`
  - `data_load_time_ms`: (number, e.g., 350)

**Test 4: Add to Watchlist** (requires login)
- Action: Log in, click star icon to add AAPL to watchlist
- Expected: `add_to_watchlist` event appears
- Parameters:
  - `ticker_symbol`: `AAPL`
  - `is_authenticated`: `true`

**Test 5: Sign Up**
- Action: Register a new account with email
- Expected: `sign_up` event appears
- Parameters:
  - `method`: `email`

**Test 6: Email Verification**
- Action: Click verification link in email
- Expected: `verify_email` event appears
- Parameters: (none required)

**Test 7: Login**
- Action: Log in with existing account
- Expected: `login` event appears
- Parameters:
  - `method`: `email`

### 3.5 Check Browser Console
Open browser console (F12) and verify you see:
```
[GA4 Event] search_ticker {ticker_symbol: "AAPL", search_method: "direct"}
[GA4 Event] view_ticker_data {ticker_symbol: "AAPL", data_load_time_ms: 350}
```

---

## Step 4: Configure Conversions

### 4.1 Mark Events as Conversions
1. Go to **Admin** → **Events** (under Data Display)
2. Wait for events to appear (may take 24 hours)
3. For each important event, toggle **Mark as conversion**:
   - ✅ `sign_up` (PRIMARY conversion)
   - ✅ `verify_email`
   - ✅ `add_to_watchlist`
   - ✅ `export_data` (premium feature, when implemented)

### 4.2 Why Mark as Conversions?
- Conversions appear in Google Ads reports
- You can optimize ad campaigns for conversions
- Calculate cost per conversion (ad spend / conversions)

---

## Step 5: Set Up Audiences (for Retargeting)

### 5.1 Create "Active Users" Audience
1. Go to **Admin** → **Audiences** → **New Audience**
2. Click **Create a custom audience**
3. Name: `Active Users`
4. Conditions:
   - Event: `view_ticker_data`
   - In last: `7 days`
   - Count: `>= 3` (viewed 3+ stocks)
5. Click **Save**

### 5.2 Create "High Intent" Audience
1. Name: `High Intent Users`
2. Conditions:
   - Event: `add_to_watchlist` OR `sign_up`
   - In last: `30 days`
3. Click **Save**

### 5.3 Link to Google Ads (when ready)
1. Go to **Admin** → **Google Ads Links**
2. Click **Link**
3. Select your Google Ads account
4. Enable audiences for remarketing

---

## Step 6: Production Deployment

### 6.1 Verify Production Domain
1. Make sure `index.html` has your production domain in GA4 config:
   ```html
   gtag('config', 'G-ABC123DEF4', {
     cookie_flags: 'SameSite=None;Secure',  // ← Required for cross-domain tracking
     anonymize_ip: true,  // ← GDPR compliance
     send_page_view: true
   });
   ```

### 6.2 Deploy to Production
```powershell
# Build frontend
npm run build

# Deploy to Render (or your hosting)
git add .
git commit -m "Add GA4 tracking"
git push origin main
```

### 6.3 Test on Production
1. Visit your production site (e.g., https://datoro.com)
2. Open GA4 DebugView
3. Perform test actions (search, signup, etc.)
4. Verify events appear in real-time

---

## Step 7: Monitor & Optimize

### 7.1 Daily Checks (First Week)
1. **Realtime Report**: Check active users right now
2. **Events**: Verify all custom events firing correctly
3. **Conversions**: Track sign-up rate (visitors → signups)

### 7.2 Weekly Analysis
1. **Acquisition Report**: Where users come from (Google, Instagram, Direct)
2. **Engagement Report**: What stocks users search for (top tickers)
3. **Conversion Funnel**: page_view → search_ticker → add_to_watchlist → sign_up

### 7.3 Monthly Optimization
1. Compare ad campaign performance (Google Ads vs Instagram)
2. Calculate ROI: `(Revenue - Ad Spend) / Ad Spend × 100%`
3. Adjust budget: scale winning campaigns, pause losing ones

---

## Tracked Events Summary

| Event Name | When Fired | Parameters |
|------------|-----------|------------|
| `page_view` | Page loads | `page_location`, `page_title` |
| `search_ticker` | User searches stock | `ticker_symbol`, `search_method` |
| `view_ticker_data` | Data loads successfully | `ticker_symbol`, `data_load_time_ms` |
| `add_to_watchlist` | User adds to watchlist | `ticker_symbol`, `is_authenticated` |
| `remove_from_watchlist` | User removes from watchlist | `ticker_symbol` |
| `sign_up` | User registers | `method` (email/google) |
| `login` | User logs in | `method` (email/google) |
| `verify_email` | Email verified | (none) |
| `export_data` | User exports CSV | `export_type`, `ticker_symbol` |
| `view_chart` | Chart viewed | `chart_type`, `ticker_symbol` |
| `view_ai_insight` | AI insight viewed | `ticker_symbol`, `insight_type` |
| `error_occurred` | Error happens | `error_type`, `error_message` |

---

## GDPR Compliance

### Cookie Consent Integration
GA4 tracking respects cookie consent banner (when implemented in Task #7):

```typescript
// When user consents to analytics cookies
import { updateAnalyticsConsent } from './services/analytics/gaService'

if (userAcceptsAnalytics) {
  updateAnalyticsConsent(true)  // Start tracking
} else {
  updateAnalyticsConsent(false) // Stop tracking
}
```

**Default behavior**: Analytics tracking is **denied by default** until user consents.

---

## Troubleshooting

### Events Not Appearing in DebugView
1. Check browser console for errors
2. Verify Measurement ID is correct in `index.html`
3. Disable ad blockers (uBlock, AdBlock, etc.)
4. Try Chrome Incognito mode
5. Clear browser cache and reload

### "gtag is not defined" Error
1. Check that gtag.js script loads **before** your app code
2. Verify script tag is in `<head>` section
3. Check network tab - gtag.js should return 200 OK

### Events Show in DebugView but Not in Reports
- **Normal**: Real-time reports update within minutes, but full reports take 24-48 hours
- Be patient - check back tomorrow

### High Bounce Rate
- Users leaving immediately without interacting
- **Fix**: Improve landing page, add clear CTA, optimize load speed

---

## Next Steps

After GA4 is working:
1. ✅ Complete Task #5 (Google Analytics 4 Setup) - **DONE**
2. ⏭️ Task #6: Meta Pixel Setup (Instagram/Facebook retargeting)
3. ⏭️ Task #7: Cookie Consent Banner (GDPR compliance)
4. ⏭️ Create Google Ads account and link to GA4
5. ⏭️ Run test ad campaigns with $50 budget
6. ⏭️ Optimize based on conversion data

---

## Support Resources
- [GA4 Documentation](https://support.google.com/analytics/answer/9304153)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [DebugView Guide](https://support.google.com/analytics/answer/7201382)
- [Conversion Tracking](https://support.google.com/google-ads/answer/6331304)
