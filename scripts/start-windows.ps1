# ==============================================================================
# EconQuest - Sovereign Council Orchestrator
# Keep this file plain ASCII: Windows PowerShell 5.1 reads a file without a byte-order mark as
# ANSI, and a UTF-8 dash then turns into a quote mark that breaks the script.
# Turnkey Windows 10/11 Self-Host Launcher (PowerShell / WSL2 / NVIDIA GPU / CPU)
# ==============================================================================

# "Continue", not "Stop": Windows PowerShell 5.1 turns a program's progress messages (docker
# writes them to stderr) into errors when they are redirected, and "Stop" would end the script on
# them. Each step's exit code is checked instead (Stop-IfFailed below).
# -Light (or LIGHT_MODE=on in .env): light mode for a modest laptop. No AI model on this computer,
# no GDELT news files, only the watchlist countries downloaded (docs/INSTALL.md).
param([switch]$Light)
$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

$QuickModel = if ($env:OLLAMA_QUICK_MODEL) { $env:OLLAMA_QUICK_MODEL } else { "qwen2.5:7b" }
$DeepModel  = if ($env:OLLAMA_DEEP_MODEL)  { $env:OLLAMA_DEEP_MODEL }  else { "qwen2.5:32b" }
$Port       = if ($env:PORT)               { $env:PORT }               else { "3737" }

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  EconQuest - Sovereign Council Orchestrator (Windows Self-Host Launcher)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  Phase 1-2 Sub-Agents Model : $QuickModel"
Write-Host "  Phase 3 Supreme Council    : $DeepModel"
Write-Host "==============================================================================" -ForegroundColor Cyan

# 1. Verify Docker Desktop is running
# A failing program does not stop PowerShell by itself: check its exit code.
function Stop-IfFailed([string]$What) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] $What failed (exit code $LASTEXITCODE). EconQuest was not started." -ForegroundColor Red
        exit 1
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed. Install Docker Desktop for Windows (WSL2 backend) and try again." -ForegroundColor Red
    exit 1
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Desktop is not running. Please start Docker Desktop for Windows (WSL2 backend) and try again." -ForegroundColor Red
    exit 1
}

$LightMode = [bool]$Light -or ($env:LIGHT_MODE -match '^(on|true|1|yes)$')
if (-not $LightMode -and (Test-Path ".env")) {
    if (Select-String -Path ".env" -Pattern '^\s*LIGHT_MODE\s*=\s*"?(on|true|1|yes)"?\s*$' -Quiet) { $LightMode = $true }
}

# 2. Check if Native Windows Ollama is running on localhost:11434
$HostOllamaActive = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        $HostOllamaActive = $true
    }
} catch {
    $HostOllamaActive = $false
}

# The app runs as an ordinary user (uid 1000), not root. Data saved by an older version that ran as
# root is handed to that user once, so the app can keep writing it.
Write-Host "[INFO] Building the app image and checking the data folder owner..." -ForegroundColor Yellow
docker compose build econquest
Stop-IfFailed "Building the app image"
docker compose run --rm --no-deps --user root --entrypoint chown econquest -R 1000:1000 /app/data *> $null

if ($LightMode) {
    Write-Host "[INFO] Light mode: no AI model on this computer, no GDELT news files, only your watchlist countries." -ForegroundColor Cyan
    Write-Host "[INFO] Add your own Google Gemini key in Menu > Settings > API keys to use the council." -ForegroundColor Cyan
    $env:LIGHT_MODE = "on"
    docker compose up -d --build econquest
    Stop-IfFailed "Starting the app"
} elseif ($HostOllamaActive) {
    Write-Host "[OK] Detected native Windows Ollama on http://localhost:11434." -ForegroundColor Green
    $env:OLLAMA_BASE_URL = "http://host.docker.internal:11434"
    if (Get-Command ollama -ErrorAction SilentlyContinue) {
        Write-Host "[INFO] Checking local models ($QuickModel & $DeepModel) are pulled..." -ForegroundColor Yellow
        ollama pull $QuickModel
        ollama pull $DeepModel
    }
    Write-Host "[INFO] Starting EconQuest container connected to Windows Host Ollama..." -ForegroundColor Cyan
    docker compose up -d --build
    Stop-IfFailed "Starting the app"
} else {
    # Check if NVIDIA GPU is available for bundled container passthrough
    $HasNvidiaGpu = $false
    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        $HasNvidiaGpu = $true
    }

    if ($HasNvidiaGpu) {
        Write-Host "[INFO] Native Ollama not running; NVIDIA GPU detected. Launching bundled-ollama-gpu profile..." -ForegroundColor Green
        $env:OLLAMA_BASE_URL = "http://ollama-gpu:11434"
        docker compose --profile bundled-ollama-gpu up -d --build
        Stop-IfFailed "Starting the app and its model container"
    } else {
        Write-Host "[INFO] Launching EconQuest with bundled-ollama container profile..." -ForegroundColor Yellow
        $env:OLLAMA_BASE_URL = "http://ollama:11434"
        docker compose --profile bundled-ollama up -d --build
        Stop-IfFailed "Starting the app and its model container"
    }
}

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  EconQuest is live at : http://localhost:$Port" -ForegroundColor Green
if ($LightMode) {
    Write-Host "  Light mode           : on (no AI model on this computer)" -ForegroundColor Green
} else {
    Write-Host "  Ollama Endpoint      : $($env:OLLAMA_BASE_URL)" -ForegroundColor Green
}
Write-Host "==============================================================================" -ForegroundColor Green

Start-Process "http://localhost:$Port"
