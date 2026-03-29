# ============================================================
# OpenClaw Gateway - Build & Run Script (Windows VPS)
# ============================================================
# Usage:
#   .\scripts\build-and-run.ps1              # Build + Start
#   .\scripts\build-and-run.ps1 -BuildOnly   # Build only
#   .\scripts\build-and-run.ps1 -RunOnly     # Start only (skip build)
#   .\scripts\build-and-run.ps1 -Stop        # Stop gateway
# ============================================================

param(
    [switch]$BuildOnly,
    [switch]$RunOnly,
    [switch]$Stop,
    [int]$Port = 19001
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot "logs"
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$StdOut = Join-Path $LogDir "gateway-stdout.log"
$StdErr = Join-Path $LogDir "gateway-stderr.log"

# --- Stop ---
if ($Stop) {
    Write-Host "[STOP] Dang tat gateway..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $check = netstat -ano | findstr "$Port" | findstr "LISTENING"
    if ($check) {
        Write-Host "[ERROR] Port $Port van dang bi chiem!" -ForegroundColor Red
    }
    else {
        Write-Host "[OK] Gateway da tat." -ForegroundColor Green
    }
    exit 0
}

# --- Build ---
if (!$RunOnly) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  OPENCLAW GATEWAY - BUILD" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Step 1: Build server
    Write-Host "[1/2] Building server (tsdown)..." -ForegroundColor Yellow
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    npx tsdown 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Server build failed!" -ForegroundColor Red
        exit 1
    }
    $sw.Stop()
    Write-Host "      -> Server built in $($sw.Elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Green

    # Step 2: Build UI
    Write-Host "[2/2] Building UI..." -ForegroundColor Yellow
    $sw.Restart()
    pnpm ui:build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] UI build failed!" -ForegroundColor Red
        exit 1
    }
    $sw.Stop()
    Write-Host "      -> UI built in $($sw.Elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Green

    # Verify dist
    if (!(Test-Path (Join-Path $ProjectRoot "dist\control-ui\index.html"))) {
        Write-Host "[ERROR] dist/control-ui/index.html not found!" -ForegroundColor Red
        exit 1
    }

    $distFiles = (Get-ChildItem -Path (Join-Path $ProjectRoot "dist") -Recurse -File).Count
    $distSize = [math]::Round(((Get-ChildItem -Path (Join-Path $ProjectRoot "dist") -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB), 1)
    Write-Host ""
    Write-Host "[BUILD OK] $distFiles files, ${distSize} MB total" -ForegroundColor Green
    Write-Host ""

    if ($BuildOnly) {
        Write-Host "Build xong. Chay '.\scripts\build-and-run.ps1 -RunOnly' de start gateway." -ForegroundColor Cyan
        exit 0
    }
}

# --- Run ---
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OPENCLAW GATEWAY - START" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill existing
Write-Host "[1/3] Tat gateway cu (neu co)..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Set env
Write-Host "[2/3] Khoi dong gateway tren port $Port..." -ForegroundColor Yellow
$env:OPENCLAW_SKIP_CHANNELS = "1"

Start-Process -FilePath "node" `
    -ArgumentList "openclaw.mjs", "gateway", "run", "--bind", "0.0.0.0", "--port", "$Port", "--force" `
    -WorkingDirectory $ProjectRoot `
    -NoNewWindow `
    -RedirectStandardOutput $StdOut `
    -RedirectStandardError $StdErr

# Wait & verify
Write-Host "[3/3] Cho gateway khoi dong..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$listening = netstat -ano | findstr "$Port" | findstr "LISTENING"
if ($listening) {
    $gwPid = ($listening -split '\s+')[-1]
    # Get local IP for remote access URL
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress
    if (!$localIP) { $localIP = "YOUR_VPS_IP" }
    $token = "80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  GATEWAY DANG CHAY!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Local:   http://127.0.0.1:$Port" -ForegroundColor White
    Write-Host "  Remote:  http://${localIP}:${Port}" -ForegroundColor Cyan
    Write-Host "  Full:    http://${localIP}:${Port}/#token=${token}" -ForegroundColor Cyan
    Write-Host "  PID:     $gwPid" -ForegroundColor White
    Write-Host "  Logs:    $LogDir" -ForegroundColor White
    Write-Host ""
    Write-Host "  Tat gateway: .\scripts\build-and-run.ps1 -Stop" -ForegroundColor DarkGray
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "[ERROR] Gateway khong start duoc! Xem log:" -ForegroundColor Red
    Write-Host "  type $StdErr" -ForegroundColor Yellow
    Get-Content $StdErr -Tail 20 -ErrorAction SilentlyContinue
    exit 1
}
