# Development Server Startup Script
# Loads development environment and starts the API server

Write-Host "=== Starting Datoro Dev Server ===" -ForegroundColor Cyan
Write-Host ""

# Load development environment variables
if (Test-Path .env.development.local) {
    Write-Host "✓ Loading .env.development.local" -ForegroundColor Green
    Get-Content .env.development.local | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "✗ .env.development.local not found!" -ForegroundColor Red
    Write-Host "  Run: cp .env.development .env.development.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ DATABASE_URL: $(([Environment]::GetEnvironmentVariable('DATABASE_URL')).Substring(0, 40))..." -ForegroundColor Green
Write-Host "✓ REDIS_URL: $([Environment]::GetEnvironmentVariable('REDIS_URL'))" -ForegroundColor Green
Write-Host "✓ NODE_ENV: $([Environment]::GetEnvironmentVariable('NODE_ENV'))" -ForegroundColor Green
Write-Host ""

# Start server
Write-Host "Starting Node.js server..." -ForegroundColor Cyan
node server/server.mjs
