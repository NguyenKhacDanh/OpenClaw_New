# ============================================================
# OpenClaw Gateway - CAI DAT FULL CHO VPS MOI (Windows)
# ============================================================
# Chay bang: powershell -ExecutionPolicy Bypass -File .\scripts\setup-vps.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  OPENCLAW GATEWAY - CAI DAT VPS" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------
# 1. Kiem tra Node.js
# -----------------------------------------------
Write-Host "[1/5] Kiem tra Node.js..." -ForegroundColor Yellow
$nodeOk = $false
try {
    $nodeVer = (node --version 2>$null)
    if ($nodeVer) {
        $major = [int]($nodeVer -replace 'v', '').Split('.')[0]
        if ($major -ge 22) {
            Write-Host "      -> Node.js $nodeVer OK" -ForegroundColor Green
            $nodeOk = $true
        }
        else {
            Write-Host "      -> Node.js $nodeVer qua cu! Can >= v22.14.0" -ForegroundColor Red
        }
    }
}
catch {}

if (!$nodeOk) {
    Write-Host "      -> Dang cai Node.js 22 LTS..." -ForegroundColor Yellow
    # Download Node.js 22 LTS installer
    $nodeUrl = "https://nodejs.org/dist/v22.22.1/node-v22.22.1-x64.msi"
    $nodeInstaller = "$env:TEMP\node-v22.22.1-x64.msi"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/qn", "/norestart" -Wait
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        $nodeVer = (node --version 2>$null)
        if ($nodeVer) {
            Write-Host "      -> Node.js $nodeVer da cai thanh cong!" -ForegroundColor Green
        }
        else {
            Write-Host "      -> KHONG THE CAI NODE.JS TU DONG!" -ForegroundColor Red
            Write-Host "      -> Hay cai thu cong tu: https://nodejs.org/en/download" -ForegroundColor Red
            Write-Host "      -> Chon version 22 LTS, Windows x64 MSI" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "      -> Download that bai. Hay cai thu cong:" -ForegroundColor Red
        Write-Host "         https://nodejs.org/en/download" -ForegroundColor Yellow
        exit 1
    }
}

# -----------------------------------------------
# 2. Cai pnpm
# -----------------------------------------------
Write-Host "[2/5] Kiem tra pnpm..." -ForegroundColor Yellow
$pnpmOk = $false
try {
    $pnpmVer = (pnpm --version 2>$null)
    if ($pnpmVer) {
        Write-Host "      -> pnpm v$pnpmVer OK" -ForegroundColor Green
        $pnpmOk = $true
    }
}
catch {}

if (!$pnpmOk) {
    Write-Host "      -> Dang cai pnpm..." -ForegroundColor Yellow
    npm install -g pnpm@10.32.1
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    $pnpmVer = (pnpm --version 2>$null)
    if ($pnpmVer) {
        Write-Host "      -> pnpm v$pnpmVer da cai thanh cong!" -ForegroundColor Green
    }
    else {
        Write-Host "      -> KHONG THE CAI PNPM!" -ForegroundColor Red
        Write-Host "      -> Chay thu cong: npm install -g pnpm@10.32.1" -ForegroundColor Yellow
        exit 1
    }
}

# -----------------------------------------------
# 3. pnpm install
# -----------------------------------------------
Write-Host "[3/5] Cai dependencies (pnpm install)..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()
pnpm install 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      -> pnpm install THAT BAI! Chay lai thu cong: pnpm install" -ForegroundColor Red
    exit 1
}
$sw.Stop()
Write-Host "      -> Dependencies cai xong trong $($sw.Elapsed.TotalSeconds.ToString('F0'))s" -ForegroundColor Green

# -----------------------------------------------
# 4. Tao config openclaw (neu chua co)
# -----------------------------------------------
Write-Host "[4/5] Cau hinh openclaw..." -ForegroundColor Yellow

# Token co dinh
$token = "80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b"

# Config cho ~/.openclaw/openclaw.json
$configDir = Join-Path $env:USERPROFILE ".openclaw"
$configFile = Join-Path $configDir "openclaw.json"

if (!(Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }

if (Test-Path $configFile) {
    # Update config hien tai
    $cfg = Get-Content $configFile -Raw | ConvertFrom-Json
}
else {
    $cfg = @{} | ConvertTo-Json | ConvertFrom-Json
}

# Dam bao co gateway config
if (-not $cfg.gateway) { $cfg | Add-Member -NotePropertyName "gateway" -NotePropertyValue @{} }
if (-not $cfg.gateway.auth) { $cfg.gateway | Add-Member -NotePropertyName "auth" -NotePropertyValue @{} }
$cfg.gateway.auth | Add-Member -NotePropertyName "mode" -NotePropertyValue "token" -Force
$cfg.gateway.auth | Add-Member -NotePropertyName "token" -NotePropertyValue $token -Force

if (-not $cfg.gateway.controlUi) { $cfg.gateway | Add-Member -NotePropertyName "controlUi" -NotePropertyValue @{} }
$cfg.gateway.controlUi | Add-Member -NotePropertyName "dangerouslyAllowHostHeaderOriginFallback" -NotePropertyValue $true -Force

$cfg | ConvertTo-Json -Depth 10 | Set-Content $configFile -Encoding UTF8
Write-Host "      -> Config: $configFile" -ForegroundColor Green
Write-Host "      -> Token:  $token" -ForegroundColor Green

# Config cho ~/.openclaw-dev/ (fallback)
$devConfigDir = Join-Path $env:USERPROFILE ".openclaw-dev"
$devConfigFile = Join-Path $devConfigDir "openclaw.json"
if (!(Test-Path $devConfigDir)) { New-Item -ItemType Directory -Path $devConfigDir -Force | Out-Null }
Copy-Item $configFile $devConfigFile -Force
Write-Host "      -> Dev config: $devConfigFile" -ForegroundColor Green

# Tao workspace dir
$workspaceDir = Join-Path $configDir "workspace"
if (!(Test-Path $workspaceDir)) { New-Item -ItemType Directory -Path $workspaceDir -Force | Out-Null }
$devWorkspaceDir = Join-Path $devConfigDir "workspace"
if (!(Test-Path $devWorkspaceDir)) { New-Item -ItemType Directory -Path $devWorkspaceDir -Force | Out-Null }
Write-Host "      -> Workspace: $workspaceDir" -ForegroundColor Green

# -----------------------------------------------
# 5. Build
# -----------------------------------------------
Write-Host "[5/5] Build server + UI..." -ForegroundColor Yellow

$sw.Restart()
npx tsdown 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      -> Server build THAT BAI!" -ForegroundColor Red
    exit 1
}
Write-Host "      -> Server built OK" -ForegroundColor Green

pnpm ui:build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      -> UI build THAT BAI!" -ForegroundColor Red
    exit 1
}
$sw.Stop()
Write-Host "      -> UI built OK" -ForegroundColor Green
Write-Host "      -> Tong thoi gian build: $($sw.Elapsed.TotalSeconds.ToString('F0'))s" -ForegroundColor Green

# -----------------------------------------------
# DONE
# -----------------------------------------------
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  CAI DAT HOAN TAT!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Node.js:  $(node --version)" -ForegroundColor White
Write-Host "  pnpm:     v$(pnpm --version)" -ForegroundColor White
Write-Host "  Config:   $configFile" -ForegroundColor White
Write-Host "  Token:    $token" -ForegroundColor White
Write-Host ""
Write-Host "  KHOI DONG GATEWAY:" -ForegroundColor Cyan
Write-Host "    .\scripts\build-and-run.ps1 -RunOnly" -ForegroundColor White
Write-Host ""
Write-Host "  HOAC BUILD + CHAY:" -ForegroundColor Cyan
Write-Host "    .\scripts\build-and-run.ps1" -ForegroundColor White
Write-Host ""
Write-Host "  TRUY CAP:" -ForegroundColor Cyan
Write-Host "    http://127.0.0.1:19001/#token=$token" -Foregr