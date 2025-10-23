# AI Insights Tool - Stop Script
# Forcefully stops all Streamlit and Python processes

Write-Host "🛑 Stopping AI Insights Tool..." -ForegroundColor Red
Write-Host ""

# Find and display running processes
$streamlitProcs = Get-Process -Name "streamlit" -ErrorAction SilentlyContinue
$pythonProcs = Get-Process -Name "python" -ErrorAction SilentlyContinue

if ($streamlitProcs -or $pythonProcs) {
    Write-Host "Found running processes:" -ForegroundColor Yellow
    
    if ($streamlitProcs) {
        $streamlitProcs | ForEach-Object { Write-Host "  - Streamlit (PID: $($_.Id))" }
    }
    
    if ($pythonProcs) {
        $pythonProcs | ForEach-Object { Write-Host "  - Python (PID: $($_.Id))" }
    }
    
    Write-Host ""
    Write-Host "Stopping processes..." -ForegroundColor Yellow
    
    # Stop all Streamlit processes
    Stop-Process -Name "streamlit" -Force -ErrorAction SilentlyContinue
    
    # Stop all Python processes
    Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ All processes stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No Streamlit or Python processes found" -ForegroundColor Cyan
}

Write-Host ""
