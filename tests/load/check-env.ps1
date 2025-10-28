# Pre-Test Environment Checker
# Verifies everything is ready for load testing

Write-Host "`n=== Factorly Load Test Environment Check ===" -ForegroundColor Cyan
Write-Host "Verifying prerequisites for load testing...`n" -ForegroundColor Yellow

$allGood = $true

# Check 1: k6 installed
Write-Host "[1/7] Checking k6 installation..." -NoNewline
$k6 = Get-Command k6 -ErrorAction SilentlyContinue
if ($k6) {
    Write-Host " ✓" -ForegroundColor Green
    k6 version
} else {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "      Install: choco install k6 OR winget install k6" -ForegroundColor Yellow
    $allGood = $false
}

# Check 2: Node.js installed
Write-Host "`n[2/7] Checking Node.js..." -NoNewline
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host " ✓" -ForegroundColor Green
    node --version
} else {
    Write-Host " ✗" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Dependencies installed
Write-Host "`n[3/7] Checking node_modules..." -NoNewline
if (Test-Path "node_modules") {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "      Run: npm install" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: .env file exists
Write-Host "`n[4/7] Checking .env file..." -NoNewline
if (Test-Path ".env") {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ⚠" -ForegroundColor Yellow
    Write-Host "      Copy .env.example to .env" -ForegroundColor Yellow
}

# Check 5: API server running
Write-Host "`n[5/7] Checking API server (localhost:3001)..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host " ✓" -ForegroundColor Green
    Write-Host "      Server is responding" -ForegroundColor Gray
} catch {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "      Server not running. Start with:" -ForegroundColor Yellow
    Write-Host "        pm2 start ecosystem.config.cjs" -ForegroundColor White
    Write-Host "        OR" -ForegroundColor White
    Write-Host "        npm run start:server" -ForegroundColor White
    $allGood = $false
}

# Check 6: Redis (optional but recommended)
Write-Host "`n[6/7] Checking Redis (localhost:6380)..." -NoNewline
try {
    $redis = Test-NetConnection -ComputerName localhost -Port 6380 -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction Stop
    if ($redis) {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ⚠" -ForegroundColor Yellow
        Write-Host "      Redis not running (optional but recommended)" -ForegroundColor Yellow
        Write-Host "      Start: docker run -d -p 6380:6379 --name factorly-redis redis:7-alpine" -ForegroundColor White
    }
} catch {
    Write-Host " ⚠" -ForegroundColor Yellow
    Write-Host "      Redis not running (optional but recommended)" -ForegroundColor Yellow
}

# Check 7: Database accessible
Write-Host "`n[7/7] Checking database connection..." -NoNewline
if ($env:DATABASE_URL) {
    Write-Host " ✓" -ForegroundColor Green
    Write-Host "      DATABASE_URL is set" -ForegroundColor Gray
} else {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "      DATABASE_URL not found in environment" -ForegroundColor Yellow
    $allGood = $false
}

# Summary
Write-Host "`n" + ("="*50) -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ Environment is ready for load testing!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\tests\load\run-tests.ps1" -ForegroundColor White
    Write-Host "  2. Or: k6 run tests/load/mixed-workload.js`n" -ForegroundColor White
} else {
    Write-Host "✗ Please fix the issues above before running load tests" -ForegroundColor Red
    Write-Host "`nQuick fix commands:" -ForegroundColor Yellow
    Write-Host "  choco install k6" -ForegroundColor White
    Write-Host "  npm install" -ForegroundColor White
    Write-Host "  pm2 start ecosystem.config.cjs`n" -ForegroundColor White
}

# System info
Write-Host "System Information:" -ForegroundColor Cyan
Write-Host "  OS: $([System.Environment]::OSVersion.VersionString)" -ForegroundColor Gray
Write-Host "  PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor Gray
Write-Host "  CPU Cores: $($env:NUMBER_OF_PROCESSORS)" -ForegroundColor Gray
Write-Host "  RAM: $([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB`n" -ForegroundColor Gray
