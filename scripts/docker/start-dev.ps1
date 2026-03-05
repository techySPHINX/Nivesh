# ==========================================================
# Nivesh — Local Development Startup Script (Windows)
# ==========================================================
# Usage:  .\scripts\docker\start-dev.ps1
#         .\scripts\docker\start-dev.ps1 -SkipGpu      # CPU-only
#         .\scripts\docker\start-dev.ps1 -SkipModels   # Skip Ollama model pull
# ==========================================================

param(
    [switch]$SkipGpu,
    [switch]$SkipModels,
    [switch]$Down   # Tear down all containers
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\..\"

function Write-Step([string]$msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "    [OK] $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "    [WARN] $msg" -ForegroundColor Yellow
}

# ── Prerequisite checks ───────────────────────────────────────
Write-Step "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "`n[ERROR] Docker is not found in PATH." -ForegroundColor Red
    Write-Host "        Install Docker Desktop from https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    exit 1
}

$dockerVersion = (docker --version) -replace "Docker version ", ""
Write-OK "Docker: $dockerVersion"

$composeVersion = (docker compose version) -replace "Docker Compose version ", ""
Write-OK "Docker Compose: $composeVersion"

# ── .env check ───────────────────────────────────────────────
Write-Step "Checking .env file..."
$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Warn ".env not found — copying from docker-compose.env.example"
    Copy-Item (Join-Path $ProjectRoot "docker-compose.env.example") $envFile
    Write-Warn "Review and update $envFile with your real secrets before production use."
} else {
    Write-OK ".env found"
}

# ── Tear down ────────────────────────────────────────────────
if ($Down) {
    Write-Step "Tearing down all containers..."
    Push-Location $ProjectRoot
    docker compose down -v --remove-orphans
    Pop-Location
    Write-OK "Done"
    exit 0
}

# ── GPU check ────────────────────────────────────────────────
Write-Step "Checking GPU / Ollama mode..."
$composeFile = "docker-compose.yml"
$overrideFile = "docker-compose.cpu.yml"

if ($SkipGpu) {
    Write-Warn "GPU skipped by flag — Ollama will run on CPU"
    $composeArgs = "-f $composeFile -f $overrideFile"
} else {
    # Detect nvidia-smi
    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        Write-OK "NVIDIA GPU detected — running Ollama with GPU"
        $composeArgs = "-f $composeFile"
    } else {
        Write-Warn "No NVIDIA GPU detected — using CPU override for Ollama"
        $composeArgs = "-f $composeFile -f $overrideFile"
    }
}

# ── Start infrastructure ─────────────────────────────────────
Write-Step "Starting all services (databases, Kafka, ML, monitoring)..."
Push-Location $ProjectRoot
try {
    $buildCmd = "docker compose $composeArgs up -d --build"
    Write-Host "    Running: $buildCmd" -ForegroundColor DarkGray
    Invoke-Expression $buildCmd

    Write-OK "All containers started"

    # Show running containers
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

    # ── Ollama model pull ────────────────────────────────────
    if (-not $SkipModels) {
        Write-Step "Waiting for Ollama to be ready..."
        $tries = 0
        do {
            Start-Sleep -Seconds 3
            $tries++
            $ready = docker inspect --format "{{.State.Health.Status}}" nivesh-ollama 2>$null
        } while ($ready -ne "healthy" -and $tries -lt 20)

        if ($ready -eq "healthy") {
            Write-OK "Ollama is healthy — models are being pulled by ollama-init container"
            Write-Warn "First pull can take 5-15 min (llama3:8b ~4.7 GB, mistral:7b ~4.1 GB)"
            Write-Host "    Watch progress: docker logs -f nivesh-ollama-init" -ForegroundColor DarkGray
        } else {
            Write-Warn "Ollama not yet healthy after 60s — check: docker logs nivesh-ollama"
        }
    } else {
        Write-Warn "Model pull skipped by flag. Pull manually:"
        Write-Host "    docker exec nivesh-ollama ollama pull llama3:8b-instruct-q4_K_M" -ForegroundColor DarkGray
        Write-Host "    docker exec nivesh-ollama ollama pull mistral:7b-instruct-q4_K_M" -ForegroundColor DarkGray
    }

} finally {
    Pop-Location
}

# ── Done ─────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Nivesh Dev Environment Ready" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Frontend  : http://localhost:3002" -ForegroundColor White
Write-Host " Backend   : http://localhost:3000/api/v1" -ForegroundColor White
Write-Host " ML API    : http://localhost:8000/docs" -ForegroundColor White
Write-Host " Ollama    : http://localhost:11434" -ForegroundColor White
Write-Host " MLflow    : http://localhost:5000" -ForegroundColor White
Write-Host " Airflow   : http://localhost:8080" -ForegroundColor White
Write-Host " Grafana   : http://localhost:3001" -ForegroundColor White
Write-Host " Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host " Jaeger    : http://localhost:16686" -ForegroundColor White
Write-Host " Neo4j     : http://localhost:7474" -ForegroundColor White
Write-Host " Qdrant    : http://localhost:6333/dashboard" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
