# Automated dependency installation script for ML Services
# This script installs all required Python packages in batches

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ML SERVICES DEPENDENCY INSTALLER" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

$venvPython = "C:\Users\KIIT\Desktop\nivesh\ml-services\venv\Scripts\python.exe"
$venvPip = "C:\Users\KIIT\Desktop\nivesh\ml-services\venv\Scripts\pip.exe"

# Check if virtual environment exists
if (!(Test-Path $venvPython)) {
    Write-Host "✗ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Virtual environment found" -ForegroundColor Green

# Batch 1: Core ML Libraries
Write-Host "`n[1/5] Installing PyTorch and related packages..." -ForegroundColor Cyan
& $venvPip install torch==2.2.0 torchvision==0.17.0 torchaudio==2.2.0 --index-url https://download.pytorch.org/whl/cpu

# Batch 2: Transformers and NLP
Write-Host "`n[2/5] Installing Transformers and NLP packages..." -ForegroundColor Cyan
& $venvPip install transformers==4.37.0 sentence-transformers==2.3.0 spacy==3.7.2 regex safetensors

# Batch 3: Time Series and ML
Write-Host "`n[3/5] Installing Time Series and ML packages..." -ForegroundColor Cyan
& $venvPip install prophet==1.1.5 statsmodels==0.14.1 xgboost==2.0.3 lightgbm==4.2.0

# Batch 4: Already installed (skip)
Write-Host "`n[4/5] Core packages already installed (FastAPI, MLflow, Redis)" -ForegroundColor Green

# Batch 5: spaCy model
Write-Host "`n[5/5] Downloading spaCy language model..." -ForegroundColor Cyan
& $venvPython -m spacy download en_core_web_sm

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nVerifying installations..." -ForegroundColor Yellow
& $venvPip list | Select-String -Pattern "torch|transformers|spacy|mlflow|fastapi|prophet|xgboost"

Write-Host "`nRun validation:" -ForegroundColor Cyan
Write-Host "  python quick_check.py" -ForegroundColor Yellow
