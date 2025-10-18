# Setup script for local TTS with Python 3.11
# Run this AFTER installing Python 3.11

Write-Host "🔍 Checking for Python 3.11..." -ForegroundColor Cyan

# Try to find Python 3.11
$python311Paths = @(
    "C:\Python311\python.exe",
    "C:\Program Files\Python311\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
)

$python311 = $null
foreach ($path in $python311Paths) {
    if (Test-Path $path) {
        $python311 = $path
        Write-Host "✅ Found Python 3.11 at: $path" -ForegroundColor Green
        break
    }
}

if (-not $python311) {
    # Try to find any Python 3.11 in PATH
    $pythonVersions = Get-Command python* -ErrorAction SilentlyContinue
    foreach ($py in $pythonVersions) {
        $version = & $py.Source --version 2>&1
        if ($version -match "Python 3\.11") {
            $python311 = $py.Source
            Write-Host "✅ Found Python 3.11 at: $python311" -ForegroundColor Green
            break
        }
    }
}

if (-not $python311) {
    Write-Host "❌ Python 3.11 not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.11 from:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/release/python-3119/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔨 Creating virtual environment with Python 3.11..." -ForegroundColor Cyan

# Create venv_tts folder
$venvPath = "venv_tts"
if (Test-Path $venvPath) {
    Write-Host "⚠️  venv_tts already exists. Removing..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $venvPath
}

& $python311 -m venv $venvPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment created" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Installing TTS and PyTorch..." -ForegroundColor Cyan

# Activate venv and install packages
& ".\$venvPath\Scripts\Activate.ps1"
pip install --upgrade pip
pip install TTS torch torchaudio

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install packages" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ LOCAL TTS SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To use local TTS:" -ForegroundColor Cyan
Write-Host "   1. Activate: .\venv_tts\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   2. Generate: python generate_voiceovers_local.py AAPL" -ForegroundColor White
Write-Host ""
Write-Host "💡 First run will download ~2GB model (one-time)" -ForegroundColor Yellow
