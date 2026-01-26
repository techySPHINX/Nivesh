# ML Services Installation Script for Windows
# Version: 2.0.0
# Last Updated: January 27, 2026

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Nivesh ML Services - Complete Installation" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Check Python version
Write-Host "[1/8] Checking Python version..." -ForegroundColor Yellow
$pythonVersion = & python --version 2>&1
if ($pythonVersion -match "Python (\d+)\.(\d+)") {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    
    if ($major -eq 3 -and $minor -ge 10) {
        Write-Host "✅ Python $major.$minor detected" -ForegroundColor Green
    } else {
        Write-Host "❌ Python 3.10+ required. Current: $major.$minor" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Python not found in PATH" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
Write-Host ""
Write-Host "[2/8] Checking virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "✅ Virtual environment found" -ForegroundColor Green
    $createVenv = $false
} else {
    Write-Host "⚠️  Virtual environment not found. Creating..." -ForegroundColor Yellow
    $createVenv = $true
}

# Create virtual environment if needed
if ($createVenv) {
    python -m venv venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Virtual environment created" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate virtual environment
Write-Host ""
Write-Host "[3/8] Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

# Upgrade pip
Write-Host ""
Write-Host "[4/8] Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ pip upgraded successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  pip upgrade failed, continuing..." -ForegroundColor Yellow
}

# Install PyTorch (CPU version)
Write-Host ""
Write-Host "[5/8] Installing PyTorch..." -ForegroundColor Yellow
Write-Host "Note: Installing CPU version. For GPU, change index-url" -ForegroundColor Cyan
pip install torch==2.2.0 torchvision==0.17.0 torchaudio==2.2.0 --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PyTorch installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  PyTorch installation failed, continuing..." -ForegroundColor Yellow
}

# Install main requirements
Write-Host ""
Write-Host "[6/8] Installing requirements (this may take 10-15 minutes)..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Requirements installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Requirements installation failed" -ForegroundColor Red
    Write-Host "Trying to continue with partial installation..." -ForegroundColor Yellow
}

# Download SpaCy model
Write-Host ""
Write-Host "[7/8] Downloading SpaCy language model..." -ForegroundColor Yellow
python -m spacy download en_core_web_sm
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SpaCy model downloaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  SpaCy model download failed" -ForegroundColor Yellow
}

# Download NLTK data
Write-Host ""
Write-Host "[8/8] Downloading NLTK data..." -ForegroundColor Yellow
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ NLTK data downloaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  NLTK data download failed" -ForegroundColor Yellow
}

# Check .env file
Write-Host ""
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created. Please update with your credentials!" -ForegroundColor Yellow
}

# Create necessary directories
Write-Host ""
Write-Host "Creating directories..." -ForegroundColor Yellow
$directories = @("models", "logs", "cache", "data", "mlruns")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "  ✅ Created $dir/" -ForegroundColor Green
    } else {
        Write-Host "  ✓ $dir/ exists" -ForegroundColor Gray
    }
}

# Run health check
Write-Host ""
Write-Host "Running health check..." -ForegroundColor Yellow
python -c "
import sys
try:
    import torch
    import transformers
    import fastapi
    import mlflow
    import redis
    import pandas
    import numpy
    print('✅ All core imports successful')
    sys.exit(0)
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Health check passed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some imports failed. Check errors above." -ForegroundColor Yellow
}

# Print summary
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update .env file with your credentials" -ForegroundColor White
Write-Host "  2. Start required services (Redis, PostgreSQL)" -ForegroundColor White
Write-Host "  3. Run: python -m pytest tests/ (to verify setup)" -ForegroundColor White
Write-Host "  4. Run: python model_server/app.py (to start ML API server)" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - ML_IMPROVEMENT_PLAN.md - Complete implementation plan" -ForegroundColor White
Write-Host "  - README.md - Architecture overview" -ForegroundColor White
Write-Host "  - docs/TRAINING_GUIDE.md - Model training guide" -ForegroundColor White
Write-Host ""
Write-Host "To activate the environment later:" -ForegroundColor Yellow
Write-Host "  .\\venv\\Scripts\\Activate.ps1" -ForegroundColor Cyan
Write-Host ""
