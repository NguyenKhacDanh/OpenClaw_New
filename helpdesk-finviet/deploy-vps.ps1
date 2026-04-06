# ============================================================
# DEPLOY SCRIPT - Helpdesk FinViet trên VPS Windows
# dist/ đã có sẵn trong git → KHÔNG cần build tsdown
# Usage: powershell -File D:\OpenClaw_New\helpdesk-finviet\deploy-vps.ps1
# ============================================================
# Commit: fe390fc1  (pre-built dist/ in git)
# ============================================================

$ErrorActionPreference = "Continue"
$RepoRoot = "D:\OpenClaw_New"
$HelpdeskDir = "$RepoRoot\helpdesk-finviet"
$OpenClawHome = "C:\Users\Administrator\.openclaw"
$WorkspaceDir = "$OpenClawHome\workspace"
$GatewayPort = 19001

Write-Host "=== Deploy Helpdesk FinViet ===" -ForegroundColor Cyan
Write-Host "  Repo:  $RepoRoot" -ForegroundColor DarkGray
Write-Host "  Home:  $OpenClawHome" -ForegroundColor DarkGray

# 1. Kill gateway nếu đang chạy
Write-Host "`n[1/5] Stopping gateway..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# 2. Clean locks + sessions
Write-Host "[2/5] Cleaning locks & sessions..." -ForegroundColor Yellow
Remove-Item "$env:TEMP\openclaw\gateway.*.lock" -Force -ErrorAction SilentlyContinue
Remove-Item "$OpenClawHome\agents\main\sessions\*" -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item "$OpenClawHome\agents\main\agent\models.json" -Force -ErrorAction SilentlyContinue

# 3. Copy workspace files (IDENTITY.md, SOUL.md, AGENTS.md)
Write-Host "[3/5] Copying workspace files..." -ForegroundColor Yellow
if (!(Test-Path $WorkspaceDir)) {
    try { New-Item -ItemType Directory -Path $WorkspaceDir -Force | Out-Null }
    catch { Write-Host "  Note: Could not create $WorkspaceDir (may need admin). Trying mkdir..." -ForegroundColor DarkYellow; cmd /c "mkdir `"$WorkspaceDir`"" 2>$null }
}
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

# 4. Copy openclaw.json + verify dist/entry.js
Write-Host "[4/5] Updating config & verifying dist..." -ForegroundColor Yellow
Copy-Item "$HelpdeskDir\openclaw.json" "$OpenClawHome\openclaw.json" -Force
Write-Host "  -> openclaw.json updated" -ForegroundColor Green

if (Test-Path "$RepoRoot\dist\entry.js") {
    Write-Host "  -> dist/entry.js OK (pre-built from git)" -ForegroundColor Green
}
else {
    Write-Host "  ERROR: dist/entry.js NOT FOUND!" -ForegroundColor Red
    Write-Host "  Run: git pull origin main" -ForegroundColor Yellow
    exit 1
}

# 5. Start gateway
Write-Host "[5/5] Starting gateway..." -ForegroundColor Yellow
Set-Location $RepoRoot
Start-Process -FilePath "node" -ArgumentList "openclaw.mjs", "gateway", "run", "--bind", "lan", "--port", "$GatewayPort", "--force" -NoNewWindow -RedirectStandardOutput "$RepoRoot\gw-stdout.log" -RedirectStandardError "$RepoRoot\gw-stderr.log"

Write-Host ""
Write-Host "Waiting 15s for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

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
