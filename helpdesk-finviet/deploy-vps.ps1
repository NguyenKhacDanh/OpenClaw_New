# ============================================================
# DEPLOY SCRIPT - Helpdesk FinViet trên VPS Windows
# Chạy SAU KHI clone/pull code xong
# Usage: powershell -File D:\OpenClaw_New\helpdesk-finviet\deploy-vps.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$RepoRoot = "D:\OpenClaw_New"
$HelpdeskDir = "$RepoRoot\helpdesk-finviet"
$OpenClawHome = "C:\Users\Administrator\.openclaw"
$WorkspaceDir = "$OpenClawHome\workspace"

Write-Host "=== Deploy Helpdesk FinViet ===" -ForegroundColor Cyan

# 1. Kill gateway nếu đang chạy
Write-Host "[1/6] Stopping gateway..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# 2. Clean locks + sessions
Write-Host "[2/6] Cleaning locks & sessions..." -ForegroundColor Yellow
Remove-Item "$env:TEMP\openclaw\gateway.*.lock" -Force -ErrorAction SilentlyContinue
Remove-Item "$OpenClawHome\agents\main\sessions\*" -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item "$OpenClawHome\agents\main\agent\models.json" -Force -ErrorAction SilentlyContinue

# 3. Copy workspace files
Write-Host "[3/6] Copying workspace files..." -ForegroundColor Yellow
if (!(Test-Path $WorkspaceDir)) { New-Item -ItemType Directory -Path $WorkspaceDir -Force | Out-Null }
Copy-Item "$HelpdeskDir\workspace\IDENTITY.md" "$WorkspaceDir\IDENTITY.md" -Force
Copy-Item "$HelpdeskDir\workspace\SOUL.md" "$WorkspaceDir\SOUL.md" -Force
Copy-Item "$HelpdeskDir\workspace\AGENTS.md" "$WorkspaceDir\AGENTS.md" -Force
Write-Host "  -> IDENTITY.md, SOUL.md, AGENTS.md copied" -ForegroundColor Green

# 4. Copy openclaw.json (chỉ nếu chưa có hoặc muốn override)
Write-Host "[4/6] Updating openclaw.json..." -ForegroundColor Yellow
Copy-Item "$HelpdeskDir\openclaw.json" "$OpenClawHome\openclaw.json" -Force
Write-Host "  -> openclaw.json updated" -ForegroundColor Green

# 5. Build (nếu dist chưa có)
if (!(Test-Path "$RepoRoot\dist\entry.js")) {
    Write-Host "[5/6] Building backend..." -ForegroundColor Yellow
    Set-Location $RepoRoot
    node scripts/runtime-postbuild.mjs
    node scripts/build-stamp.mjs
    
    Write-Host "[5b/6] Building UI..." -ForegroundColor Yellow
    Set-Location "$RepoRoot\ui"
    pnpm build
    Set-Location $RepoRoot
} else {
    Write-Host "[5/6] Build already exists, skipping..." -ForegroundColor Green
}

# 6. Start gateway
Write-Host "[6/6] Starting gateway..." -ForegroundColor Yellow
Set-Location $RepoRoot
Start-Process -FilePath "node" -ArgumentList "openclaw.mjs","gateway","run","--bind","lan","--port","19001","--force" -NoNewWindow -RedirectStandardOutput "$RepoRoot\gw-stdout.log" -RedirectStandardError "$RepoRoot\gw-stderr.log"

Write-Host ""
Write-Host "Waiting 10s for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verify
$listening = netstat -ano | Select-String "19001.*LISTENING"
if ($listening) {
    Write-Host "=== GATEWAY OK - Listening on port 19001 ===" -ForegroundColor Green
} else {
    Write-Host "=== WARNING: Gateway may not have started ===" -ForegroundColor Red
    Write-Host "Check logs: Get-Content $RepoRoot\gw-stderr.log -Tail 20" -ForegroundColor Yellow
}

$zaloLog = Select-String -Path "$RepoRoot\gw-stdout.log" -Pattern "zalouser|Agent Cu" -ErrorAction SilentlyContinue
if ($zaloLog) {
    Write-Host "=== ZALOUSER OK ===" -ForegroundColor Green
    $zaloLog | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Cyan }
} else {
    Write-Host "=== WARNING: Zalouser not found in log ===" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done! Test bot on Zalo group." -ForegroundColor Green
