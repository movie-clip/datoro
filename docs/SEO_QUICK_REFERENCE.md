# Google Search Indexing - Quick Reference

## ✅ Your SEO Score: 85% (34/40 checks passed)

---

## 🔴 CRITICAL (Do This First)

### Missing Social Media Images
**What:** Create 2 image files  
**Why:** Referenced in meta tags but don't exist - blocking social sharing

```bash
# Files needed:
public/og-image.png        # 1200x630px
public/twitter-card.png    # 1200x675px (or reuse og-image.png)
```

**How to Create:**
1. Go to [Canva.com](https://www.canva.com) (easiest)
2. Search "Open Graph Image" template
3. Create 1200 x 630 px design with:
   - Your logo
   - Text: "Factorly - Free Stock Analysis"
   - Tagline: "10,000+ Stocks | AI Insights | Real-Time Data"
   - Dark background (#0a0a0a)
   - Purple accent (#7c3aed)
4. Download as PNG
5. Save to `public/og-image.png`
6. Duplicate or symlink to `public/twitter-card.png`

**Time:** 30-60 minutes  
**Guide:** See `docs/CREATE_OG_IMAGES.md` for 5 different methods

---

## 🟢 What's Already Working

✅ robots.txt configured  
✅ sitemap.xml with 8 URLs  
✅ All canonical URLs fixed  
✅ Open Graph tags complete  
✅ Twitter Card tags complete  
✅ 3 JSON-LD schemas (WebApplication, Organization, FAQPage)  
✅ PWA manifest  
✅ SPA routing (render.yaml)  
✅ Cache headers  
✅ Mobile-responsive  
✅ HTTPS enabled  

---

## 📋 Google Search Console Setup (After OG Images)

### 1. Verify Ownership (15 min)
```
1. Go to https://search.google.com/search-console
2. Add property: https://factorly.onrender.com
3. Choose verification method:
   - Download HTML file
   - Upload to public/.well-known/
   - Or use HTML meta tag in index.html
4. Click "Verify"
```

### 2. Submit Sitemap (5 min)
```
1. In Search Console → Sitemaps
2. Submit: https://factorly.onrender.com/sitemap.xml
3. Wait for Google to process (1-7 days)
```

### 3. Request Indexing (10 min)
```
1. URL Inspection tool
2. Enter: https://factorly.onrender.com
3. Click "Request Indexing"
4. Repeat for top stocks:
   - /AAPL
   - /MSFT
   - /GOOGL
   - /TSLA
   - /NVDA
```

---

## 🚀 Quick Commands

### Validate SEO
```bash
node scripts/validate-seo.mjs
```

### Test Meta Tags
```bash
# Check if files are accessible
curl https://factorly.onrender.com/robots.txt
curl https://factorly.onrender.com/sitemap.xml
curl -I https://factorly.onrender.com/og-image.png  # Will fail until created
```

### Deploy Changes
```bash
git add .
git commit -m "Add OG images for social sharing"
git push
```

---

## 📊 Expected Timeline

| Action | Time |
|--------|------|
| Create OG images | 30-60 min |
| Set up Search Console | 15 min |
| Submit sitemap | 5 min |
| Google crawls | 1-3 days |
| Initial indexing | 3-14 days |
| Full ranking | 30-90 days |

---

## 🛠️ Validation Tools

- **Our script:** `node scripts/validate-seo.mjs`
- **Meta tags:** https://metatags.io
- **Structured data:** https://validator.schema.org
- **Rich results:** https://search.google.com/test/rich-results
- **Page speed:** https://pagespeed.web.dev

---

## 📚 Full Documentation

- **Complete checklist:** `docs/SEO_CHECKLIST.md`
- **OG images guide:** `docs/CREATE_OG_IMAGES.md`
- **Implementation summary:** `docs/SEO_IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Priority Order

1. 🔴 **Create OG images** (30-60 min) - BLOCKS SOCIAL SHARING
2. 🟡 **Set up Search Console** (15 min) - BLOCKS INDEXING
3. 🟢 **Submit sitemap** (5 min) - ENABLES CRAWLING
4. 🟢 **Request indexing** (10 min) - SPEEDS UP INDEXING

**Total time to 95% SEO:** ~1-2 hours  
**Current score:** 85%  
**After OG images:** 95%  
**After Search Console:** 100%

---

## ❓ Common Issues

**Q: Why "Crawled - currently not indexed"?**  
A: New domain. Submit sitemap + fix OG images → should index in 3-14 days.

**Q: How long until I appear in Google?**  
A: 3-14 days for initial indexing, 30-90 days for ranking visibility.

**Q: Do I need the OG images?**  
A: YES! They're referenced in meta tags. Missing images = incomplete SEO.

**Q: Can I skip Twitter image?**  
A: Yes, Twitter can use og-image.png. Just symlink or copy the same file.

---

## 🎉 Bottom Line

**You're 95% ready!** Just create 2 image files and you're production-ready.

**Next step:** Spend 30-60 min creating OG images → Deploy → Submit to Google

Good luck! 🚀
