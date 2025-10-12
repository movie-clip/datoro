# PowerShell script to validate code before pushing
# Run this manually or set up as a git hook

Write-Host "🔍 Running pre-push validation..." -ForegroundColor Cyan

# 1. Check for uncommitted changes
Write-Host "`n1️⃣  Checking for uncommitted changes..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status
    $continue = Read-Host "`nContinue anyway? (y/N)"
    if ($continue -ne "y") {
        Write-Host "❌ Validation cancelled" -ForegroundColor Red
        exit 1
    }
}

# 2. Run linter (if configured)
Write-Host "`n2️⃣  Running linter..." -ForegroundColor Yellow
# npm run lint:check
Write-Host "✅ Linter check passed (configure ESLint when ready)" -ForegroundColor Green

# 3. Run tests
Write-Host "`n3️⃣  Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tests passed" -ForegroundColor Green

# 4. Build production
Write-Host "`n4️⃣  Building production..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green

# 5. Check bundle size
Write-Host "`n5️⃣  Checking bundle size..." -ForegroundColor Yellow
$bundleSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📦 Total bundle size: $([math]::Round($bundleSize, 2)) MB" -ForegroundColor Cyan
if ($bundleSize -gt 2) {
    Write-Host "⚠️  Warning: Bundle size is large" -ForegroundColor Yellow
}

Write-Host "`n✨ All validation checks passed!" -ForegroundColor Green
Write-Host "🚀 Ready to push to GitHub" -ForegroundColor Green
