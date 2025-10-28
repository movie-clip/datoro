# Factorly Load Test Runner
# 
# Runs comprehensive load tests to verify system can handle 20 concurrent users
# 
# Usage: .\tests\load\run-tests.ps1

Write-Host "`n=== Factorly Load Test Suite ===" -ForegroundColor Cyan
Write-Host "Testing capacity for 20 concurrent users`n" -ForegroundColor Cyan

# Configuration
$API_URL = "http://localhost:3001"
$BASE_URL = "http://localhost:5173"

# Check if k6 is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue

if (-not $k6Installed) {
    Write-Host "ERROR: k6 is not installed!" -ForegroundColor Red
    Write-Host "`nInstall k6:" -ForegroundColor Yellow
    Write-Host "  choco install k6" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor White
    Write-Host "  winget install k6`n" -ForegroundColor White
    exit 1
}

Write-Host "✓ k6 is installed`n" -ForegroundColor Green

# Check if server is running
Write-Host "Checking if API server is running on $API_URL..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ API server is running`n" -ForegroundColor Green
} catch {
    Write-Host "ERROR: API server is not responding!" -ForegroundColor Red
    Write-Host "`nStart the server:" -ForegroundColor Yellow
    Write-Host "  npm run start:server" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor White
    Write-Host "  pm2 start ecosystem.config.cjs`n" -ForegroundColor White
    exit 1
}

# Create results directory
$resultsDir = "tests\load\results"
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir | Out-Null
}

# Test menu
Write-Host "Select test to run:" -ForegroundColor Cyan
Write-Host "  1. Mixed Workload (Recommended - Tests all features)" -ForegroundColor White
Write-Host "  2. Watchlist Stress Test" -ForegroundColor White
Write-Host "  3. DCF Calculator Stress Test" -ForegroundColor White
Write-Host "  4. Run All Tests (Sequential)" -ForegroundColor White
Write-Host "  5. Quick Test (5 users, 1 minute)" -ForegroundColor White
Write-Host "`n  0. Exit`n" -ForegroundColor Gray

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`n=== Running Mixed Workload Test ===" -ForegroundColor Cyan
        Write-Host "Duration: ~8 minutes | Peak Load: 20 concurrent users`n" -ForegroundColor Yellow
        k6 run --env API_URL=$API_URL --env BASE_URL=$BASE_URL tests\load\mixed-workload.js
    }
    "2" {
        Write-Host "`n=== Running Watchlist Stress Test ===" -ForegroundColor Cyan
        Write-Host "Duration: ~5 minutes | Peak Load: 20 concurrent users`n" -ForegroundColor Yellow
        k6 run --env API_URL=$API_URL tests\load\watchlist-stress.js
    }
    "3" {
        Write-Host "`n=== Running DCF Calculator Stress Test ===" -ForegroundColor Cyan
        Write-Host "Duration: ~4 minutes | Peak Load: 20 concurrent users`n" -ForegroundColor Yellow
        k6 run --env API_URL=$API_URL tests\load\dcf-stress.js
    }
    "4" {
        Write-Host "`n=== Running All Tests ===" -ForegroundColor Cyan
        Write-Host "Total Duration: ~17 minutes`n" -ForegroundColor Yellow
        
        Write-Host "`n[1/3] Mixed Workload Test..." -ForegroundColor Cyan
        k6 run --env API_URL=$API_URL --env BASE_URL=$BASE_URL tests\load\mixed-workload.js
        
        Write-Host "`n[2/3] Watchlist Stress Test..." -ForegroundColor Cyan
        k6 run --env API_URL=$API_URL tests\load\watchlist-stress.js
        
        Write-Host "`n[3/3] DCF Calculator Stress Test..." -ForegroundColor Cyan
        k6 run --env API_URL=$API_URL tests\load\dcf-stress.js
        
        Write-Host "`n✓ All tests completed!`n" -ForegroundColor Green
    }
    "5" {
        Write-Host "`n=== Running Quick Test ===" -ForegroundColor Cyan
        Write-Host "Duration: 1 minute | Peak Load: 5 concurrent users`n" -ForegroundColor Yellow
        k6 run --vus 5 --duration 1m --env API_URL=$API_URL tests\load\mixed-workload.js
    }
    "0" {
        Write-Host "`nExiting...`n" -ForegroundColor Gray
        exit 0
    }
    default {
        Write-Host "`nInvalid choice. Exiting...`n" -ForegroundColor Red
        exit 1
    }
}

# Final summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "`nResults saved to: $resultsDir`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Check server logs: pm2 logs" -ForegroundColor White
Write-Host "  2. Review results in tests\load\results\" -ForegroundColor White
Write-Host "  3. If tests failed, see tests\load\README.md for troubleshooting`n" -ForegroundColor White
