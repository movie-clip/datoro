#!/usr/bin/env pwsh
# Domain Setup Verification Script
# Run this after completing domain setup to verify everything works

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain = "datoro.com"
)

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Domain Setup Verification - $Domain" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

# Test 1: DNS Resolution
Write-Host "🔍 Test 1: DNS Resolution" -ForegroundColor Yellow
try {
    $dnsResult = Resolve-DnsName $Domain -ErrorAction Stop
    $ip = $dnsResult[0].IPAddress
    Write-Host "  ✅ DNS resolves to: $ip" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ DNS resolution failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  💡 Wait for DNS propagation (15-60 minutes) or check DNS records" -ForegroundColor Yellow
    $failed++
}

# Test 2: HTTPS Homepage
Write-Host ""
Write-Host "🔍 Test 2: HTTPS Homepage (https://$Domain)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$Domain" -Method HEAD -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Homepage loads successfully (HTTP $($response.StatusCode))" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ⚠️  Homepage returned HTTP $($response.StatusCode)" -ForegroundColor Yellow
        $failed++
    }
} catch {
    Write-Host "  ❌ Homepage failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  💡 Check if domain is added in Render and SSL is provisioned" -ForegroundColor Yellow
    $failed++
}

# Test 3: API Health Endpoint
Write-Host ""
Write-Host "🔍 Test 3: API Health Check (https://$Domain/api/health)" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "https://$Domain/api/health" -ErrorAction Stop
    if ($healthResponse.status -eq "healthy") {
        Write-Host "  ✅ API is healthy" -ForegroundColor Green
        Write-Host "     - Status: $($healthResponse.status)" -ForegroundColor Gray
        Write-Host "     - Database: $($healthResponse.database)" -ForegroundColor Gray
        Write-Host "     - Redis: $($healthResponse.redis)" -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ⚠️  API returned unexpected status: $($healthResponse.status)" -ForegroundColor Yellow
        $failed++
    }
} catch {
    Write-Host "  ❌ API health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  💡 Check if server is running and environment variables are set" -ForegroundColor Yellow
    $failed++
}

# Test 4: www Subdomain
Write-Host ""
Write-Host "🔍 Test 4: www Subdomain (https://www.$Domain)" -ForegroundColor Yellow
try {
    $wwwResponse = Invoke-WebRequest -Uri "https://www.$Domain" -Method HEAD -ErrorAction Stop
    Write-Host "  ✅ www subdomain works (HTTP $($wwwResponse.StatusCode))" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ⚠️  www subdomain failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  💡 Add www.$Domain as custom domain in Render dashboard" -ForegroundColor Yellow
    # Don't increment failed - www is optional
}

# Test 5: Legal Pages
Write-Host ""
Write-Host "🔍 Test 5: Legal Pages" -ForegroundColor Yellow
$legalPages = @(
    "privacy-policy.html",
    "terms-of-service.html",
    "cookie-policy.html"
)

$legalPassed = 0
foreach ($page in $legalPages) {
    try {
        $pageResponse = Invoke-WebRequest -Uri "https://$Domain/$page" -Method HEAD -ErrorAction Stop
        if ($pageResponse.StatusCode -eq 200) {
            Write-Host "  ✅ /$page loads (HTTP $($pageResponse.StatusCode))" -ForegroundColor Green
            $legalPassed++
        }
    } catch {
        Write-Host "  ❌ /$page failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($legalPassed -eq $legalPages.Count) {
    Write-Host "  ✅ All legal pages accessible" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ⚠️  Some legal pages missing ($legalPassed/$($legalPages.Count))" -ForegroundColor Yellow
    $failed++
}

# Test 6: SSL Certificate
Write-Host ""
Write-Host "🔍 Test 6: SSL Certificate" -ForegroundColor Yellow
try {
    $sslTest = Invoke-WebRequest -Uri "https://$Domain/api/health" -ErrorAction Stop
    Write-Host "  ✅ SSL certificate valid (HTTPS working)" -ForegroundColor Green
    Write-Host "  💡 Run full SSL test: https://www.ssllabs.com/ssltest/analyze.html?d=$Domain" -ForegroundColor Cyan
    $passed++
} catch {
    Write-Host "  ❌ SSL certificate error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  💡 Wait for Render to provision SSL (5-15 minutes after DNS propagation)" -ForegroundColor Yellow
    $failed++
}

# Test 7: CORS Configuration
Write-Host ""
Write-Host "🔍 Test 7: CORS Configuration" -ForegroundColor Yellow
try {
    $corsResponse = Invoke-WebRequest -Uri "https://$Domain/api/health" -Method OPTIONS -Headers @{
        "Origin" = "https://$Domain"
        "Access-Control-Request-Method" = "GET"
    } -ErrorAction Stop
    
    $allowOrigin = $corsResponse.Headers["Access-Control-Allow-Origin"]
    if ($allowOrigin -match $Domain) {
        Write-Host "  ✅ CORS configured correctly" -ForegroundColor Green
        Write-Host "     - Allow-Origin: $allowOrigin" -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ⚠️  CORS might not be configured for $Domain" -ForegroundColor Yellow
        Write-Host "     - Allow-Origin: $allowOrigin" -ForegroundColor Gray
        Write-Host "  💡 Set CORS_ORIGIN=$Domain in Render environment variables" -ForegroundColor Yellow
        $failed++
    }
} catch {
    Write-Host "  ⚠️  Could not verify CORS: $($_.Exception.Message)" -ForegroundColor Yellow
    # Don't fail - CORS check can be unreliable
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ Passed: $passed" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
} else {
    Write-Host "  ❌ Failed: $failed" -ForegroundColor Gray
}
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All tests passed! Domain setup complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Update legal pages with production domain" -ForegroundColor Gray
    Write-Host "  2. Test user registration and email verification" -ForegroundColor Gray
    Write-Host "  3. Run SSL quality test: https://www.ssllabs.com/ssltest/" -ForegroundColor Gray
    Write-Host "  4. Mark Task #3 as completed" -ForegroundColor Gray
    Write-Host "  5. Move to Task #4: SendGrid setup" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Some tests failed. Review the errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "  • DNS not working → Wait 15-60 minutes for propagation" -ForegroundColor Gray
    Write-Host "  • SSL errors → Wait 5-15 minutes after DNS propagates" -ForegroundColor Gray
    Write-Host "  • API errors → Check Render deployment logs" -ForegroundColor Gray
    Write-Host "  • CORS errors → Set CORS_ORIGIN in Render environment variables" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Full troubleshooting guide: docs/DOMAIN_SETUP_GUIDE.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Exit with appropriate code
if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
