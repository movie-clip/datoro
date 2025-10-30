# Custom Domain & SSL Setup Guide

**Goal:** Configure `datoro.com` (or your chosen domain) with free SSL certificate for production deployment.

**Why This Matters:**
- ✅ Google Ads & Meta Ads **require** custom domain (not localhost or free subdomain)
- ✅ SSL certificate required for HTTPS (security, SEO, user trust)
- ✅ Professional appearance increases conversion rates
- ✅ Required for production email delivery (SendGrid needs verified domain)

---

## Step 1: Purchase Domain

### Option A: Namecheap (Recommended - $12/year)

1. **Go to:** https://www.namecheap.com
2. **Search for:** `datoro.com` (or alternative if taken)
3. **Add to cart** and checkout
4. **Disable auto-renewal** if you want to save money (renew manually)
5. **Skip add-ons:** You don't need WhoisGuard, PremiumDNS, or SSL (Render provides free SSL)

**Alternative domains if `datoro.com` is taken:**
- `datoro.io` (~$30/year - tech startup vibe)
- `getdatoro.com` (~$12/year)
- `datoro.app` (~$15/year)
- `datoro.co` (~$10/year)

### Option B: Google Domains (~$12/year)
- https://domains.google
- Includes privacy protection free
- Integrated with Google Workspace if you need business email later

### Option C: Cloudflare Registrar (At-cost pricing)
- https://www.cloudflare.com/products/registrar/
- No markup, just ICANN fee (~$9/year for .com)
- Best DNS performance
- **Downside:** Requires Cloudflare account, slightly more complex setup

---

## Step 2: Get Your Render Server IP

### Find Your Render Service

1. **Go to:** https://dashboard.render.com
2. **Click** on your `datoro-api` service
3. **Look for** the default URL: `https://datoro-api.onrender.com` (or similar)
4. **Copy this URL** - you'll need it in the next step

### Get the IP Address

**Option A: Use Render's Custom Domain Setup (Easier)**
- Render will provide you with a CNAME or A record during domain setup
- **Best for beginners**

**Option B: Manual IP Lookup (Advanced)**
```powershell
# PowerShell command to get Render IP
nslookup datoro-api.onrender.com
```
- Look for the IP address (e.g., `216.24.57.1`)
- **Note:** Render IPs can change, so CNAME is safer

---

## Step 3: Configure DNS Records

### Namecheap DNS Setup

1. **Log into Namecheap** → Go to Domain List
2. **Click "Manage"** next to your domain
3. **Go to "Advanced DNS" tab**
4. **Add/Edit Records:**

**Option A: CNAME Method (Recommended - auto-updates if Render IP changes)**

| Type  | Host | Value                           | TTL       |
|-------|------|---------------------------------|-----------|
| CNAME | @    | datoro-api.onrender.com         | Automatic |
| CNAME | www  | datoro-api.onrender.com         | Automatic |

**Option B: A Record Method (Simpler but may break if Render changes IP)**

| Type | Host | Value            | TTL       |
|------|------|------------------|-----------|
| A    | @    | 216.24.57.1      | Automatic |
| A    | www  | 216.24.57.1      | Automatic |

**Important Notes:**
- `@` means root domain (`datoro.com`)
- `www` creates `www.datoro.com` subdomain
- TTL = Time To Live (how long DNS servers cache the record)
- Changes take 5-60 minutes to propagate globally

### Cloudflare DNS Setup (If using Cloudflare)

1. **Add your domain** to Cloudflare (free plan)
2. **Update nameservers** at your registrar to Cloudflare's nameservers
3. **Add DNS records:**
   - Type: `CNAME`, Name: `@`, Content: `datoro-api.onrender.com`, Proxy: **OFF** (gray cloud)
   - Type: `CNAME`, Name: `www`, Content: `datoro-api.onrender.com`, Proxy: **OFF**
4. **Wait 24 hours** for nameserver propagation (usually faster)

**Why proxy OFF?** Render needs to see the original request to provision SSL. You can enable proxy (orange cloud) after SSL is set up.

---

## Step 4: Add Custom Domain in Render

### Render Dashboard Setup

1. **Go to:** https://dashboard.render.com
2. **Select** your `datoro-api` service
3. **Click** "Settings" tab
4. **Scroll to** "Custom Domain" section
5. **Click** "Add Custom Domain"
6. **Enter:** `datoro.com`
7. **Click** "Add" → Repeat for `www.datoro.com`

### Wait for SSL Certificate

- Render automatically provisions a free SSL certificate via **Let's Encrypt**
- Takes 5-15 minutes after DNS propagation
- You'll see a green checkmark when ready
- Status: `Pending` → `Verifying` → `Live`

### Verify HTTPS Works

```powershell
# Test your domain (replace with your domain)
curl https://datoro.com/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## Step 5: Update Environment Variables

### Update Render Environment Variables

1. **In Render Dashboard** → `datoro-api` → Settings → Environment
2. **Add/Update these variables:**

```bash
# Frontend URL (where emails link to)
APP_URL=https://datoro.com

# API URL (backend)
API_URL=https://datoro.com/api

# CORS origins (allow frontend to call API)
CORS_ORIGIN=https://datoro.com,https://www.datoro.com

# Email sender domain
EMAIL_FROM=noreply@datoro.com
EMAIL_FROM_NAME=Datoro
```

3. **Click "Save Changes"**
4. **Render will auto-redeploy** (takes 2-3 minutes)

### Update Local Development .env

Update your `.env.development.local`:

```bash
# Keep localhost for development
APP_URL=http://localhost:5173
API_URL=http://localhost:7071

# But add production values for reference
# PROD_APP_URL=https://datoro.com
# PROD_API_URL=https://datoro.com/api
```

---

## Step 6: Test Everything

### DNS Propagation Check

```powershell
# Check if DNS is working globally
nslookup datoro.com

# Expected output:
# Name:    datoro.com
# Address: 216.24.57.1 (or your Render IP)
```

**Online tools:**
- https://dnschecker.org (check worldwide propagation)
- https://www.whatsmydns.net (alternative checker)

### SSL Certificate Check

```powershell
# PowerShell: Check SSL certificate
curl https://datoro.com/api/health -v
```

Look for:
- ✅ `SSL certificate verify ok`
- ✅ `issuer: CN=R3, O=Let's Encrypt`
- ✅ Status 200 response

**Online tools:**
- https://www.ssllabs.com/ssltest/ (comprehensive SSL test)
- Should get **A or A+ rating**

### Email Links Test

1. **Register a new test account** (use a real email)
2. **Check verification email** (should now say `https://datoro.com?action=verify-email&token=...`)
3. **Click the link** - should work without SSL warnings
4. **Verify email successfully**

### Frontend Deployment

Your frontend is built and served by Render from the same service:

1. **Build frontend:** `npm run build` (Render does this automatically)
2. **Serve static files:** Render serves `dist/` folder at root domain
3. **API proxied:** Requests to `/api/*` routed to Express backend

**Test pages:**
- https://datoro.com → Should load app homepage
- https://datoro.com/privacy-policy.html → Should load Privacy Policy
- https://datoro.com/terms-of-service.html → Should load Terms
- https://datoro.com/cookie-policy.html → Should load Cookie Policy
- https://datoro.com/api/health → Should return JSON health check

---

## Step 7: Update Legal Pages & Links

### Update Privacy Policy Contact

Edit `public/privacy-policy.html`:

```html
<!-- Find this section and update: -->
<h2>12. Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us:</p>
<ul>
  <li><strong>Email:</strong> privacy@datoro.com</li>
  <li><strong>Website:</strong> https://datoro.com</li>
</ul>
```

### Update Terms of Service Contact

Edit `public/terms-of-service.html`:

```html
<!-- Find this section and update: -->
<h2>14. Contact Information</h2>
<p>For questions about these Terms, contact us:</p>
<ul>
  <li><strong>Email:</strong> support@datoro.com</li>
  <li><strong>Website:</strong> https://datoro.com</li>
</ul>
```

### Update Cookie Policy Contact

Edit `public/cookie-policy.html`:

```html
<!-- Find this section and update: -->
<h2>8. Contact Us</h2>
<p>For questions about our use of cookies, contact:</p>
<ul>
  <li><strong>Email:</strong> privacy@datoro.com</li>
  <li><strong>Website:</strong> https://datoro.com</li>
</ul>
```

---

## Step 8: Configure Email Subdomain (Optional but Recommended)

### Why Set Up Email Subdomain?

- **Improves deliverability:** Separate email subdomain prevents email issues from affecting main site
- **Required for SendGrid:** SendGrid requires domain authentication for production
- **Prevents spam flags:** SPF, DKIM, DMARC records improve reputation

### Add Email DNS Records

**In Namecheap Advanced DNS:**

| Type  | Host          | Value                                    | TTL       |
|-------|---------------|------------------------------------------|-----------|
| CNAME | em.datoro.com | sendgrid.net                            | Automatic |
| TXT   | @             | v=spf1 include:sendgrid.net ~all        | Automatic |
| TXT   | _dmarc        | v=DMARC1; p=none; rua=mailto:dmarc@datoro.com | Automatic |

**SendGrid will provide:**
- 2 CNAME records for DKIM authentication
- 1 CNAME record for click/open tracking
- Add these when you set up SendGrid in Task #4

---

## Troubleshooting

### DNS Not Propagating

**Problem:** `nslookup datoro.com` returns `NXDOMAIN` or wrong IP

**Solutions:**
1. Wait longer (can take up to 48 hours, usually 15-60 minutes)
2. Check DNS records in registrar (typos in IP or CNAME?)
3. Try `nslookup datoro.com 8.8.8.8` to use Google DNS directly
4. Flush local DNS cache: `ipconfig /flushdns`

### SSL Certificate Pending

**Problem:** Render shows "Verifying" for 30+ minutes

**Solutions:**
1. DNS must be fully propagated first (use dnschecker.org)
2. Make sure CNAME record is correct: `datoro-api.onrender.com`
3. If using Cloudflare, turn OFF proxy (gray cloud, not orange)
4. Wait 24 hours, then delete and re-add custom domain in Render
5. Contact Render support (very responsive)

### CORS Errors

**Problem:** Frontend can't call API, see "blocked by CORS policy" in browser console

**Solutions:**
1. Make sure `CORS_ORIGIN` includes `https://datoro.com` (no trailing slash)
2. Include both `datoro.com` AND `www.datoro.com` if you use both
3. Redeploy after changing environment variables
4. Clear browser cache and cookies
5. Check Network tab: `Access-Control-Allow-Origin` header should match your domain

### Email Links Still Point to Localhost

**Problem:** Verification emails still say `http://localhost:5173?action=verify-email&token=...`

**Solutions:**
1. Update `APP_URL` environment variable in Render
2. Redeploy service (Render auto-deploys after env var changes)
3. Test with new registration (old emails cached old URL)
4. Check `server/services/emailService.ts` line 47: uses `process.env.APP_URL`

### www Subdomain Not Working

**Problem:** `https://datoro.com` works but `https://www.datoro.com` doesn't

**Solutions:**
1. Add `www` CNAME record in DNS (see Step 3)
2. Add `www.datoro.com` as custom domain in Render (see Step 4)
3. Wait for DNS propagation (15-60 minutes)
4. Add `https://www.datoro.com` to `CORS_ORIGIN` environment variable

---

## Post-Setup Checklist

After completing all steps, verify:

- [ ] `https://datoro.com` loads homepage with no SSL warnings
- [ ] `https://www.datoro.com` works (or redirects to non-www)
- [ ] `https://datoro.com/api/health` returns JSON
- [ ] Legal pages accessible: `/privacy-policy.html`, `/terms-of-service.html`, `/cookie-policy.html`
- [ ] Footer links work (Privacy, Terms, Cookie)
- [ ] Register new account → verification email uses `https://datoro.com` not `localhost`
- [ ] Click verification link → successfully verifies email
- [ ] SSL Labs test: https://www.ssllabs.com/ssltest/ → A or A+ rating
- [ ] DNS propagated globally: https://dnschecker.org → all green checkmarks
- [ ] No console errors related to CORS or mixed content (HTTP/HTTPS)

---

## Next Steps

After domain is live:

1. ✅ **Task #3 Complete** - Mark as completed in todo list
2. 🎯 **Task #4** - Set up SendGrid with domain authentication
3. 🎯 **Task #5** - Add Google Analytics 4 tracking
4. 🎯 **Task #6** - Add Meta Pixel for ad retargeting
5. 🎯 **Task #7** - Implement cookie consent banner
6. 🚀 **Ready for Ads** - Can start running Google Ads and Instagram ads

---

## Cost Summary

| Item                    | Cost          | Frequency |
|-------------------------|---------------|-----------|
| Domain (Namecheap)      | $12           | Annual    |
| Render (Free Tier)      | $0            | Monthly   |
| SSL Certificate         | $0 (Free)     | Auto-renew|
| **Total First Year**    | **$12**       | -         |
| **Total Ongoing**       | **$12/year**  | -         |

**Optional Upgrades:**
- Render Starter Plan: $7/mo (no sleep, 24/7 uptime, better performance)
- Cloudflare Pro: $20/mo (advanced DDoS protection, image optimization)
- Custom business email: $6/mo per user (Google Workspace or Microsoft 365)

---

## Quick Reference

### DNS Record Format

**CNAME (Recommended):**
```
Type: CNAME
Host: @
Value: datoro-api.onrender.com
TTL: Automatic
```

**A Record (Alternative):**
```
Type: A
Host: @
Value: [Render IP from nslookup]
TTL: Automatic
```

### Environment Variables

```bash
APP_URL=https://datoro.com
API_URL=https://datoro.com/api
CORS_ORIGIN=https://datoro.com,https://www.datoro.com
EMAIL_FROM=noreply@datoro.com
EMAIL_FROM_NAME=Datoro
```

### Test Commands

```powershell
# DNS check
nslookup datoro.com

# SSL check
curl https://datoro.com/api/health -v

# API test
curl https://datoro.com/api/health

# Frontend test
curl https://datoro.com -I
```

---

**Questions?** Check Render's official guide: https://render.com/docs/custom-domains

**Need help?** Render support usually responds within 1-2 hours for free tier users.
