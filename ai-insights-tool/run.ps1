# AI Insights Tool - Launcher Script
# Quick start script for Windows PowerShell

Write-Host "🤖 Starting AI Insights Tool..." -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path ".\venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Check if Streamlit is installed
if (-not (Test-Path ".\venv\Scripts\streamlit.exe")) {
    Write-Host "❌ Streamlit not installed!" -ForegroundColor Red
    Write-Host "Please run: .\venv\Scripts\pip.exe install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment and run Streamlit
Write-Host "✅ Virtual environment found" -ForegroundColor Green
Write-Host "🚀 Launching Streamlit app..." -ForegroundColor Cyan
Write-Host ""

& ".\venv\Scripts\Activate.ps1"
& streamlit run app.py --server.headless true
