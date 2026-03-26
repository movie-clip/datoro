# Configuration Files

This directory contains **centralized configuration** to make the codebase easier to maintain and rebrand.

## 📁 Files

### `brand.ts` ⭐
**Brand identity and SEO metadata**

Contains all brand-specific strings, URLs, and metadata in one place.

**Used by:**
- `src/App.vue` - Brand name in header
- `src/components/common/MainMenu.vue` - Menu logo alt text
- `index.html` - Meta tags, Open Graph, Schema.org (future)
- `public/manifest.json` - PWA metadata (future)
- Documentation files (future)

**Example:**
```typescript
import BRAND from './config/brand'

console.log(BRAND.name) // "Datoro"
console.log(BRAND.seo.title) // "Datoro - Free Stock Analysis..."
```

**To rename the project:** Change `BRAND.name` and rebuild.

---

### `storage.ts` ⭐
**localStorage and sessionStorage keys**

Centralized storage keys with consistent prefix.

**Used by:**
- `src/stores/tickerStore.ts` - API version tracking
- `src/composables/useRecentSearch.ts` - Recent search history
- `src/composables/useWatchlists.ts` - Active watchlist ID
- `src/App.vue` - Active tab selection

**Example:**
```typescript
import { STORAGE_KEYS } from './config/storage'

localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'valuation')
const tab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)
```

**To rename storage keys:** Change the `PREFIX` constant.

---

### `constants.ts` (server/config/)
**Application-wide constants**

Cache TTLs, validation limits, performance thresholds, etc.

**Used by:** All server and client files needing magic numbers.

---

### `services.ts` (server/config/) ⭐
**Service names for deployment**

Centralized service names for infrastructure configuration.

**Used by:**
- `ecosystem.config.cjs` - PM2 process name
- `render.yaml` - Render.com service names (future)
- `docker-compose.dev.yml` - Container names (future)

**Example:**
```typescript
import SERVICES from './config/services'

console.log(SERVICES.api.name) // "datoro-api"
console.log(SERVICES.database.name) // "datoro-db"
```

**To rename services:** Change `PROJECT_NAME` constant.

---

## 🎯 Benefits

### Before (Scattered)
Renaming the project brand required changes in **100+ files**:
- 20+ frontend files (brand name hardcoded)
- 6+ deployment files (service names hardcoded)
- 4+ composables (storage keys hardcoded)
- 10+ documentation files

**Time: ~2 hours of manual find-replace**

### After (Centralized)
Renaming now requires changes in **3 files**:
- `src/config/brand.ts` - Change `BRAND.name`
- `src/config/storage.ts` - Change `PREFIX`
- `server/config/services.ts` - Change `PROJECT_NAME`

**Time: ~5 minutes**

---

## 🚀 Usage Guidelines

### ✅ DO
- Import from config files when you need brand name, URLs, or service names
- Add new brand-related constants to `brand.ts`
- Add new storage keys to `storage.ts`
- Add new service definitions to `services.ts`

### ❌ DON'T
- Hardcode brand name strings in components
- Create localStorage keys without adding to `storage.ts`
- Hardcode service names in deployment files
- Duplicate configuration across files

---

## 📝 Migration Checklist

Files that still need migration to use centralized config:

### High Priority
- [ ] `index.html` - Meta tags, Schema.org (use `BRAND` object)
- [ ] `public/manifest.json` - PWA metadata (use `BRAND.pwa`)
- [ ] `render.yaml` - Service names (use `SERVICES`)
- [ ] `docker-compose.dev.yml` - Container names (use `SERVICES.docker`)

### Medium Priority
- [ ] `README.md` - Replace brand references with template
- [ ] `LICENSE` - Use `BRAND.organization.copyright`
- [ ] `.env.example` - Use `BRAND.domain`
- [ ] SEO validation scripts - Use `BRAND` for checks

### Low Priority
- [ ] Documentation files in `docs/`
- [ ] Voice generation scripts
- [ ] OG image templates

---

## 🔄 Future Improvements

1. **Template system** for markdown files (replace `{{BRAND_NAME}}` at build time)
2. **Automated render.yaml generation** from `services.ts`
3. **Automated manifest.json generation** from `brand.ts`
4. **Pre-commit hook** to detect hardcoded brand strings

---

## 📚 Related Documentation

- [Brand Configuration](./brand.ts) - All brand identity constants
- [Storage Keys](./storage.ts) - All localStorage/sessionStorage keys
- [Services](./services.ts) - All deployment service names
- [Constants](./constants.ts) - Application constants (cache TTLs, limits)

---

**Last Updated:** 2025-10-29  
**Maintainer:** Development Team
