# Quick Setup Script for ML Services
# Run this after cloning the repository

Write-Host "🚀 Nivesh ML Services - Quick Setup" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Step 1: Create .env
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env created - Please update credentials!" -ForegroundColor Green
} else {
    Write-Host "✓ .env already exists" -ForegroundColor Gray
}

# Step 2: Create directories
Write-Host ""
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
$dirs = @("models", "logs", "cache", "data", "mlruns", "scripts")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "  ✅ Created $dir/" -ForegroundColor Green
    } else {
        Write-Host "  ✓ $dir/ exists" -ForegroundColor Gray
    }
}

# Step 3: Run full installation
Write-Host ""
Write-Host "📦 Ready to install dependencies..." -ForegroundColor Yellow
Write-Host "Run: .\install.ps1" -ForegroundColor Cyan

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Quick setup complete!" -ForegroundColor Green
