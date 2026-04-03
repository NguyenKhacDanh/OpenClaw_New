# ============================================================
# DEPLOY SCRIPT - Helpdesk FinViet trên VPS Windows
# Chạy SAU KHI clone/pull code xong
# Usage: powershell -File D:\OpenClaw_New\helpdesk-finviet\deploy-vps.ps1
# ============================================================
# Commit: 4e0da8c  (workspace editor + dynamic agent name)
# ============================================================

$ErrorActionPreference = "Stop"
$RepoRoot = "D:\OpenClaw_New"
$HelpdeskDir = "$RepoRoot\helpdesk-finviet"
$OpenClawHome = "C:\Users\Administrator\.openclaw"
$WorkspaceDir = "$OpenClawHome\workspace"
$GatewayPort = 19001

Write-Host "=== Deploy Helpdesk FinViet ===" -ForegroundColor Cyan
Write-Host "  Repo:  $RepoRoot" -ForegroundColor DarkGray
Write-Host "  Home:  $OpenClawHome" -ForegroundColor DarkGray

# 1. Kill gateway nếu đang chạy
Write-Host "`n[1/7] Stopping gateway..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# 2. Clean locks + sessions
Write-Host "[2/7] Cleaning locks & sessions..." -ForegroundColor Yellow
Remove-Item "$env:TEMP\openclaw\gateway.*.lock" -Force -ErrorAction SilentlyContinue
Remove-Item "$OpenClawHome\agents\main\sessions\*" -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item "$OpenClawHome\agents\main\agent\models.json" -Force -ErrorAction SilentlyContinue

# 3. Copy workspace files (IDENTITY.md, SOUL.md, AGENTS.md)
Write-Host "[3/7] Copying workspace files..." -ForegroundColor Yellow
if (!(Test-Path $WorkspaceDir)) { New-Item -ItemType Directory -Path $WorkspaceDir -Force | Out-Null }
$wsFiles = @("IDENTITY.md", "SOUL.md", "AGENTS.md")
foreach ($f in $wsFiles) {
    $src = "$HelpdeskDir\workspace\$f"
    if (Test-Path $src) {
        Copy-Item $src "$WorkspaceDir\$f" -Force
        Write-Host "  -> $f copied" -ForegroundColor Green
    }
    else {
        Write-Host "  -> $f not found in repo, skipping" -ForegroundColor DarkYellow
    }
}

# 4. Copy openclaw.json
Write-Host "[4/7] Updating openclaw.json..." -ForegroundColor Yellow
Copy-Item "$HelpdeskDir\openclaw.json" "$OpenClawHome\openclaw.json" -Force
Write-Host "  -> openclaw.json updated" -ForegroundColor Green

# 5. Install dependencies (nếu chưa install)
$ErrorActionPreference = "Continue"
if (!(Test-Path "$RepoRoot\node_modules\.pnpm")) {
    Write-Host "[5/7] Installing dependencies (pnpm install)..." -ForegroundColor Yellow
    Set-Location $RepoRoot
    pnpm install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Retry: pnpm install without lockfile..." -ForegroundColor DarkYellow
        pnpm install --no-frozen-lockfile --no-optional
    }
}
else {
    Write-Host "[5/7] Dependencies OK, skipping pnpm install" -ForegroundColor Green
}

# 5b. Install UI dependencies separately
if (!(Test-Path "$RepoRoot\ui\node_modules")) {
    Write-Host "[5b] Installing UI dependencies..." -ForegroundColor Yellow
    Set-Location "$RepoRoot\ui"
    pnpm install --no-frozen-lockfile
    Set-Location $RepoRoot
}
$ErrorActionPreference = "Stop"

# 6. Build
Write-Host "[6/7] Building..." -ForegroundColor Yellow
Set-Location $RepoRoot

# Backend build
if (!(Test-Path "$RepoRoot\dist\entry.js")) {
    Write-Host "  Building backend..." -ForegroundColor DarkGray
    node scripts/runtime-postbuild.mjs
    node scripts/build-stamp.mjs
    if (!(Test-Path "$RepoRoot\dist\entry.js")) {
        Write-Host "  ERROR: dist/entry.js still missing after build!" -ForegroundColor Red
        Write-Host "  Try manually: cd $RepoRoot; pnpm build" -ForegroundColor Yellow
    }
}
else {
    Write-Host "  Backend dist exists, skipping" -ForegroundColor Green
}

# UI build (always rebuild to get latest NKD Custom changes)
Write-Host "  Building UI..." -ForegroundColor DarkGray
Set-Location "$RepoRoot\ui"
$ErrorActionPreference = "Continue"
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  UI build failed, trying npx vite build..." -ForegroundColor DarkYellow
    npx vite build
}
$ErrorActionPreference = "Stop"
Set-Location $RepoRoot
Write-Host "  -> Build complete" -ForegroundColor Green

# 7. Start gateway
Write-Host "[7/7] Starting gateway..." -ForegroundColor Yellow
Set-Location $RepoRoot
Start-Process -FilePath "node" -ArgumentList "openclaw.mjs", "gateway", "run", "--bind", "lan", "--port", "$GatewayPort", "--force" -NoNewWindow -RedirectStandardOutput "$RepoRoot\gw-stdout.log" -RedirectStandardError "$RepoRoot\gw-stderr.log"

Write-Host ""
Write-Host "Waiting 12s for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# Verify gateway
$listening = netstat -ano | Select-String "${GatewayPort}.*LISTENING"
if ($listening) {
    Write-Host "=== GATEWAY OK - Port $GatewayPort LISTENING ===" -ForegroundColor Green
}
else {
    Write-Host "=== WARNING: Gateway may not have started ===" -ForegroundColor Red
    Write-Host "Check: Get-Content $RepoRoot\gw-stderr.log -Tail 30" -ForegroundColor Yellow
}

# Verify zalouser
$zaloLog = Select-String -Path "$RepoRoot\gw-stdout.log" -Pattern "zalouser|starting.*provider" -ErrorAction SilentlyContinue
if ($zaloLog) {
    Write-Host "=== ZALOUSER OK ===" -ForegroundColor Green
    $zaloLog | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Cyan }
}
else {
    Write-Host "=== WARNING: Zalouser not found in log yet ===" -ForegroundColor DarkYellow
}

# Print UI URL
$ipAddr = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "Done! Access UI at:" -ForegroundColor Green
Write-Host "  http://${ipAddr}:${GatewayPort}" -ForegroundColor Cyan
Write-Host "  Token: 80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Tabs: NKD Custom -> Workspace -> SOUL.md / IDENTITY.md" -ForegroundColor Green
