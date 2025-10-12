# GitHub Actions CI/CD Setup Guide

## Overview
This project uses GitHub Actions for automated testing, building, and deployment.

## Workflows

### 1. **ci.yml** - Main CI/CD Pipeline
Runs on: `push` to `main` or `develop`, and on `pull_request`

**Jobs:**
- ✅ **Test & Lint** - Run tests and linting
- 🏗️ **Build** - Build the frontend application
- 🔒 **Security** - Run npm audit for vulnerabilities
- 🚀 **Deploy** - Deploy to production (main branch only)

### 2. **pr-checks.yml** - Pull Request Validation
Runs on: Pull request opened/updated

**Jobs:**
- ✅ Validate tests pass
- ✅ Validate build succeeds
- 💬 Comment on PR with status

---

## Required GitHub Secrets

To enable the CI/CD pipeline, configure these secrets in your GitHub repository:

### Navigate to: 
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

### Required Secrets:

| Secret Name | Description | Example/Notes |
|------------|-------------|---------------|
| `FMP_API_KEY` | Financial Modeling Prep API key | Your paid/free plan API key |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Optional Secrets (for deployment):

| Secret Name | Description | When to use |
|------------|-------------|-------------|
| `VERCEL_TOKEN` | Vercel deployment token | If deploying to Vercel |
| `VERCEL_ORG_ID` | Vercel organization ID | If deploying to Vercel |
| `VERCEL_PROJECT_ID` | Vercel project ID | If deploying to Vercel |
| `NETLIFY_AUTH_TOKEN` | Netlify authentication token | If deploying to Netlify |
| `NETLIFY_SITE_ID` | Netlify site ID | If deploying to Netlify |

---

## Setup Instructions

### 1. Add Required Secrets

```bash
# GitHub Repository Settings
1. Go to: https://github.com/YOUR_USERNAME/finance-view/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret:
   - Name: FMP_API_KEY
   - Value: your_fmp_api_key_here
   - Click "Add secret"
4. Repeat for DATABASE_URL
```

### 2. Enable GitHub Actions

If Actions are disabled:
```bash
1. Go to: Settings → Actions → General
2. Under "Actions permissions", select:
   ✅ "Allow all actions and reusable workflows"
3. Click "Save"
```

### 3. Test the Pipeline

```bash
# Push to trigger CI
git add .
git commit -m "feat: enable CI/CD pipeline"
git push origin main

# Or create a PR to test PR checks
git checkout -b feature/test-ci
git push origin feature/test-ci
# Then create PR on GitHub
```

---

## Workflow Details

### Test Job
```yaml
- Install dependencies (npm ci)
- Run ESLint (if configured)
- Run Vitest tests
- Generate coverage report
- Upload coverage artifacts
```

### Build Job
```yaml
- Install dependencies
- Build frontend with Vite
- Upload dist/ artifacts (retained for 7 days)
```

### Security Job
```yaml
- Run npm audit
- Check for high-severity vulnerabilities
- Report results (non-blocking)
```

### Deploy Job (main branch only)
```yaml
- Download build artifacts
- Deploy to production
- Currently placeholder - configure your deployment target
```

---

## Deployment Configuration

### Option 1: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Get project details: `vercel project ls`
4. Add secrets to GitHub:
   - `VERCEL_TOKEN` - From `vercel login` then `vercel whoami --token`
   - `VERCEL_ORG_ID` - From `.vercel/project.json`
   - `VERCEL_PROJECT_ID` - From `.vercel/project.json`
5. Uncomment Vercel deployment step in `ci.yml`

### Option 2: Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Link site: `netlify link`
3. Get site ID: `netlify status`
4. Get auth token: `netlify login` → Account settings → Applications
5. Add secrets to GitHub:
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`
6. Uncomment Netlify deployment step in `ci.yml`

### Option 3: Custom Server (PM2)

For deploying to your own server with PM2:

```yaml
# Add to ci.yml deploy job:
- name: Deploy to Server
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SERVER_SSH_KEY }}
    script: |
      cd /path/to/finance-view
      git pull origin main
      npm ci
      npm run build
      npm run pm2:reload
```

Required secrets:
- `SERVER_HOST` - Your server IP/domain
- `SERVER_USER` - SSH username
- `SERVER_SSH_KEY` - Private SSH key

---

## Monitoring CI/CD

### View Workflow Runs
```
https://github.com/YOUR_USERNAME/finance-view/actions
```

### Check Latest Status
Look for badges in README (add these):
```markdown
![CI Status](https://github.com/YOUR_USERNAME/finance-view/workflows/CI%2FCD%20Pipeline/badge.svg)
![Tests](https://github.com/YOUR_USERNAME/finance-view/workflows/Pull%20Request%20Checks/badge.svg)
```

### Coverage Reports
Coverage artifacts are uploaded to Actions → Workflow run → Artifacts
- Download `coverage-report.zip`
- Open `index.html` in browser

---

## Troubleshooting

### ❌ Tests failing in CI but pass locally

**Cause:** Missing environment variables or database connection

**Fix:**
```bash
1. Verify secrets are set: Settings → Secrets
2. Check workflow logs for errors
3. Ensure DATABASE_URL is accessible from GitHub runners
   (Use public URL or use Actions-hosted database)
```

### ❌ Build failing with "Module not found"

**Cause:** Dependencies not installed correctly

**Fix:**
```yaml
# Use npm ci instead of npm install in workflows
- run: npm ci  # ✅ Correct - uses package-lock.json
- run: npm install  # ❌ Avoid - may install different versions
```

### ❌ Deploy job not running

**Cause:** Only runs on main branch push

**Fix:**
```bash
# Check you're on main branch
git branch
# If on other branch, merge to main first
git checkout main
git merge your-branch
git push origin main
```

---

## Local Testing

Test GitHub Actions locally with [act](https://github.com/nektos/act):

```bash
# Install act
choco install act-cli  # Windows
brew install act       # macOS

# Run workflows locally
act -j test           # Run test job
act -j build          # Run build job
act pull_request      # Simulate PR event
```

---

## Best Practices

1. ✅ **Always test locally first** - Run `npm test` and `npm run build` before pushing
2. ✅ **Keep secrets secure** - Never commit API keys or passwords
3. ✅ **Use environment-specific configs** - Separate dev/test/prod settings
4. ✅ **Monitor workflow runs** - Check Actions tab regularly
5. ✅ **Update dependencies** - Keep Actions versions current

---

## Status Badges

Add to your README.md:

```markdown
## CI/CD Status

![CI Status](https://github.com/movie-clip/finance-view/workflows/CI%2FCD%20Pipeline/badge.svg)
![Tests](https://github.com/movie-clip/finance-view/workflows/Pull%20Request%20Checks/badge.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
```

---

**Questions?** Check the [GitHub Actions Documentation](https://docs.github.com/en/actions)
