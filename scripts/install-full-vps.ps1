# ============================================================
# OpenClaw Gateway - CAI DAT TU ZERO CHO VPS MOI (Windows)
# ============================================================
# CACH DUNG: Luu file nay vao VPS, vi du D:\install.ps1
# Roi chay: powershell -ExecutionPolicy Bypass -File D:\install.ps1
# ============================================================

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  OPENCLAW GATEWAY - CAI DAT TU ZERO" -ForegroundColor Cyan  
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------
# BUOC 1: Cai Git
# -----------------------------------------------------------
Write-Host "[1/7] Kiem tra Git..." -ForegroundColor Yellow
$gitOk = $false
try { $gv = git --version 2>$null; if ($gv) { $gitOk = $true } } catch {}

if ($gitOk) {
    Write-Host "      -> Git da co: $gv" -ForegroundColor Green
} else {
    Write-Host "      -> Dang tai Git..." -ForegroundColor Yellow
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe"
    $gitFile = "$env:TEMP\Git-Install.exe"
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitFile -UseBasicParsing
    Write-Host "      -> Dang cai Git (silent)..." -ForegroundColor Yellow
    Start-Process -FilePath $gitFile -ArgumentList "/VERYSILENT","/NORESTART","/NOCANCEL","/SP-","/CLOSEAPPLICATIONS","/RESTARTAPPLICATIONS","/COMPONENTS=icons,ext\reg\shellhere,assoc,assoc_sh" -Wait
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\Git\cmd"
    try { $gv = git --version 2>$null } catch { $gv = $null }
    if ($gv) {
        Write-Host "      -> $gv - OK!" -ForegroundColor Green
    } else {
        Write-Host "      -> LOI: Khong cai duoc Git! Cai thu cong: https://git-scm.com/download/win" -ForegroundColor Red
        exit 1
    }
}

# -----------------------------------------------------------
# BUOC 2: Cai Node.js 22
# -----------------------------------------------------------
Write-Host "[2/7] Kiem tra Node.js..." -ForegroundColor Yellow
$nodeOk = $false
try {
    $nv = node --version 2>$null
    if ($nv) {
        $major = [int]($nv -replace 'v','').Split('.')[0]
        if ($major -ge 22) { $nodeOk = $true }
    }
} catch {}

if ($nodeOk) {
    Write-Host "      -> Node.js $nv da co - OK!" -ForegroundColor Green
} else {
    Write-Host "      -> Dang tai Node.js v22.22.1..." -ForegroundColor Yellow
    $nodeUrl = "https://nodejs.org/dist/v22.22.1/node-v22.22.1-x64.msi"
    $nodeFile = "$env:TEMP\node-v22.22.1-x64.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeFile -UseBasicParsing
    Write-Host "      -> Dang cai Node.js (silent)..." -ForegroundColor Yellow
    Start-Process msiexec.exe -ArgumentList "/i",$nodeFile,"/qn","/norestart" -Wait
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\Git\cmd"
    try { $nv = node --version 2>$null } catch { $nv = $null }
    if ($nv) {
        Write-Host "      -> Node.js $nv - OK!" -ForegroundColor Green
    } else {
        Write-Host "      -> LOI: Khong cai duoc Node.js! Cai thu cong: https://nodejs.org" -ForegroundColor Red
        exit 1
    }
}

# -----------------------------------------------------------
# BUOC 3: Cai pnpm
# -----------------------------------------------------------
Write-Host "[3/7] Kiem tra pnpm..." -ForegroundColor Yellow
$pnpmOk = $false
try { $pv = pnpm --version 2>$null; if ($pv) { $pnpmOk = $true } } catch {}

if ($pnpmOk) {
    Write-Host "      -> pnpm v$pv da co - OK!" -ForegroundColor Green
} else {
    Write-Host "      -> Dang cai pnpm@10.32.1..." -ForegroundColor Yellow
    npm install -g pnpm@10.32.1 2>&1 | Out-Null
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\Git\cmd"
    try { $pv = pnpm --version 2>$null } catch { $pv = $null }
    if ($pv) {
        Write-Host "      -> pnpm v$pv - OK!" -ForegroundColor Green
    } else {
        Write-Host "      -> LOI: Khong cai duoc pnpm! Chay thu cong: npm install -g pnpm@10.32.1" -ForegroundColor Red
        exit 1
    }
}

# -----------------------------------------------------------
# BUOC 4: Clone code
# -----------------------------------------------------------
Write-Host "[4/7] Clone code ve D:\OpenClaw_New..." -ForegroundColor Yellow
Set-Location D:\

if (Test-Path "D:\OpenClaw_New") {
    Write-Host "      -> Thu muc da ton tai, dang pull moi nhat..." -ForegroundColor Yellow
    Set-Location "D:\OpenClaw_New"
    git pull origin main 2>&1
} else {
    git clone https://github.com/NguyenKhacDanh/OpenClaw_New.git 2>&1
    Set-Location "D:\OpenClaw_New"
}
Write-Host "      -> Code OK!" -ForegroundColor Green

# -----------------------------------------------------------
# BUOC 5: pnpm install
# -----------------------------------------------------------
Write-Host "[5/7] Cai dependencies (pnpm install)..." -ForegroundColor Yellow
pnpm install 2>&1 | Select-Object -Last 5
Write-Host "      -> Dependencies OK!" -ForegroundColor Green

# -----------------------------------------------------------
# BUOC 6: Tao config
# -----------------------------------------------------------
Write-Host "[6/7] Tao config openclaw..." -ForegroundColor Yellow

$token = "80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b"

foreach ($dir in @("$env:USERPROFILE\.openclaw", "$env:USERPROFILE\.openclaw-dev")) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $wsDir = Join-Path $dir "workspace"
    if (!(Test-Path $wsDir)) { New-Item -ItemType Directory -Path $wsDir -Force | Out-Null }
    
    $cfgFile = Join-Path $dir "openclaw.json"
    $cfgJson = @{
        gateway = @{
            auth = @{
                mode = "token"
                token = $token
            }
            controlUi = @{
                dangerouslyAllowHostHeaderOriginFallback = $true
            }
        }
    } | ConvertTo-Json -Depth 10
    $cfgJson | Set-Content $cfgFile -Encoding UTF8
    Write-Host "      -> $cfgFile" -ForegroundColor Green
}
Write-Host "      -> Token: $token" -ForegroundColor Green

# -----------------------------------------------------------
# BUOC 7: Build
# -----------------------------------------------------------
Write-Host "[7/7] Build server + UI..." -ForegroundColor Yellow

Write-Host "      -> Building server..." -ForegroundColor Yellow
npx tsdown 2>&1 | Select-Object -Last 3

Write-Host "      -> Building UI..." -ForegroundColor Yellow
pnpm ui:build 2>&1 | Select-Object -Last 3

if (Test-Path "D:\OpenClaw_New\dist\control-ui\index.html") {
    Write-Host "      -> Build OK!" -ForegroundColor Green
} else {
    Write-Host "      -> LOI BUILD! Chay lai: npx tsdown ; pnpm ui:build" -ForegroundColor Red
    exit 1
}

# -----------------------------------------------------------
# XONG!
# -----------------------------------------------------------
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  CAI DAT HOAN TAT!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  KHOI DONG GATEWAY:" -ForegroundColor Cyan
Write-Host "    cd D:\OpenClaw_New" -ForegroundColor White
Write-Host "    powershell -ExecutionPolicy Bypass -File .\scripts\build-and-run.ps1 -RunOnly" -ForegroundColor White
Write-Host ""
Write-Host "  TRUY CAP:" -ForegroundColor Cyan
Write-Host "    http://IP_VPS:19001/#token=$token" -ForegroundColor White
Write-Host ""
