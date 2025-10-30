# Domain Setup Checklist - Quick Reference

**Goal:** Get `datoro.com` live with SSL in ~1 hour

**Full guide:** See `DOMAIN_SETUP_GUIDE.md` for detailed instructions

---

## ☐ Step 1: Buy Domain (15 minutes)

- [ ] Go to https://www.namecheap.com
- [ ] Search for `datoro.com` (or alternative if taken)
- [ ] Add to cart and checkout (~$12/year)
- [ ] Skip add-ons (WhoisGuard, PremiumDNS, SSL - not needed)
- [ ] Complete purchase
- [ ] **Save login credentials** in password manager

**Alternative domains if taken:**
- `datoro.io`, `getdatoro.com`, `datoro.app`, `datoro.co`

---

## ☐ Step 2: Configure DNS (10 minutes)

### In Namecheap Dashboard:

- [ ] Log in → Domain List → Click "Manage" next to your domain
- [ ] Go to "Advanced DNS" tab
- [ ] Add CNAME record:
  ```
  Type: CNAME
  Host: @
  Value: datoro-api.onrender.com
  TTL: Automatic
  ```
- [ ] Add www CNAME record:
  ```
  Type: CNAME
  Host: www
  Value: datoro-api.onrender.com
  TTL: Automatic
  ```
- [ ] **Save changes**
- [ ] **Wait 15-60 minutes** for DNS propagation

### Verify DNS (after waiting):

```powershell
nslookup datoro.com
# Should return Render IP address
```

**Online checker:** https://dnschecker.org

---

## ☐ Step 3: Add Domain in Render (5 minutes)

### In Render Dashboard:

- [ ] Go to https://dashboard.render.com
- [ ] Click on `datoro-api` service
- [ ] Click "Settings" tab
- [ ] Scroll to "Custom Domain" section
- [ ] Click "Add Custom Domain"
- [ ] Enter `datoro.com` → Click "Add"
- [ ] **Repeat** for `www.datoro.com`
- [ ] **Wait 5-15 minutes** for SSL certificate provisioning
- [ ] Verify status shows green checkmark (not "Pending" or "Verifying")

---

## ☐ Step 4: Update Environment Variables (5 minutes)

### In Render Dashboard (datoro-api → Settings → Environment):

- [ ] Click "Add Environment Variable" for each:

```bash
APP_URL=https://datoro.com
```
```bash
API_URL=https://datoro.com/api
```
```bash
CORS_ORIGIN=https://datoro.com,https://www.datoro.com
```
```bash
EMAIL_FROM=noreply@datoro.com
```

- [ ] Click "Save Changes"
- [ ] **Wait 2-3 minutes** for automatic redeployment

---

## ☐ Step 5: Test Everything (10 minutes)

### DNS & SSL Tests:

```powershell
# Test DNS resolution
nslookup datoro.com

# Test SSL certificate
curl https://datoro.com/api/health -v

# Test API endpoint
curl https://datoro.com/api/health
```

**Expected API response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T...",
  "database": "connected",
  "redis": "connected"
}
```

### Browser Tests:

- [ ] Open https://datoro.com → Homepage loads (no SSL warning)
- [ ] Open https://www.datoro.com → Works (or redirects)
- [ ] Open https://datoro.com/privacy-policy.html → Privacy Policy loads
- [ ] Open https://datoro.com/terms-of-service.html → Terms loads
- [ ] Open https://datoro.com/cookie-policy.html → Cookie Policy loads
- [ ] Check footer links (Privacy, Terms, Cookie) → All work

### Email Test:

- [ ] Register new test account with real email
- [ ] Check verification email
- [ ] Verify link uses `https://datoro.com?action=verify-email&token=...` (NOT localhost)
- [ ] Click link → Email verified successfully

### SSL Quality Test:

- [ ] Go to https://www.ssllabs.com/ssltest/
- [ ] Enter `datoro.com`
- [ ] Run test
- [ ] Verify **A or A+ rating**

---

## ☐ Step 6: Update Legal Pages (5 minutes)

### Edit Contact Information:

**File:** `public/privacy-policy.html`
- [ ] Find "Contact Us" section (near end)
- [ ] Update email: `privacy@datoro.com`
- [ ] Update website: `https://datoro.com`

**File:** `public/terms-of-service.html`
- [ ] Find "Contact Information" section
- [ ] Update email: `support@datoro.com`
- [ ] Update website: `https://datoro.com`

**File:** `public/cookie-policy.html`
- [ ] Find "Contact Us" section
- [ ] Update email: `privacy@datoro.com`
- [ ] Update website: `https://datoro.com`

### Commit and Push:

```powershell
git add .
git commit -m "Update legal pages with production domain"
git push origin main
```

**Wait 2-3 minutes** for Render auto-deployment

---

## ☐ Final Verification Checklist

After all steps complete:

- [ ] `https://datoro.com` loads without SSL warnings
- [ ] `https://www.datoro.com` works
- [ ] API health check works: `https://datoro.com/api/health`
- [ ] All legal pages accessible and updated
- [ ] Footer links work correctly
- [ ] New user registration sends email with correct domain
- [ ] Email verification link works
- [ ] SSL Labs test shows A or A+ rating
- [ ] DNS propagated globally (check https://dnschecker.org)
- [ ] No console errors in browser (press F12)

---

## ☐ Mark Task Complete

- [ ] Update todo list: Mark "Custom Domain & SSL Setup" as **completed**
- [ ] Celebrate! 🎉 Domain is live and secure
- [ ] Move to **Task #4: Production Email Service (SendGrid)**

---

## Troubleshooting

### DNS Not Working?

```powershell
# Flush local DNS cache
ipconfig /flushdns

# Check DNS globally
# Visit: https://dnschecker.org
# Enter: datoro.com
# Wait for all green checkmarks
```

### SSL Certificate Stuck on "Verifying"?

1. Verify DNS is fully propagated (use dnschecker.org)
2. Make sure CNAME record is exactly: `datoro-api.onrender.com`
3. Wait 24 hours, then delete and re-add custom domain in Render
4. Contact Render support if still stuck

### CORS Errors in Browser Console?

1. Verify `CORS_ORIGIN` environment variable includes your domain
2. Check for typos (no trailing slash, correct protocol https://)
3. Redeploy service after changing env vars
4. Clear browser cache and cookies

### Email Links Still Use Localhost?

1. Verify `APP_URL=https://datoro.com` in Render environment variables
2. Wait for redeployment (check Render Events tab)
3. Register **new** account (old emails cached old URL)
4. Check email source code to confirm new URL

---

## Next Steps After Domain Setup

1. ✅ **Task #3 Complete** - Domain live with SSL
2. 🎯 **Task #4** - Set up SendGrid for production emails
3. 🎯 **Task #5** - Add Google Analytics 4
4. 🎯 **Task #6** - Add Meta Pixel
5. 🎯 **Task #7** - Cookie consent banner
6. 🚀 **Ready for Ads** - Can start running campaigns

---

## Quick Commands Reference

```powershell
# Test DNS
nslookup datoro.com

# Test SSL & API
curl https://datoro.com/api/health -v

# Check DNS propagation globally
# https://dnschecker.org

# Check SSL quality
# https://www.ssllabs.com/ssltest/

# Flush DNS cache
ipconfig /flushdns

# Redeploy in Render
# Dashboard → datoro-api → Manual Deploy → Deploy latest commit
```

---

**Estimated Total Time:** 50-70 minutes (including DNS propagation wait time)

**Cost:** $12/year for domain (SSL is free via Let's Encrypt)

**Questions?** See full guide: `docs/DOMAIN_SETUP_GUIDE.md`
