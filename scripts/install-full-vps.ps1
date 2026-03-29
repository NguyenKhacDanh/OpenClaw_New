# ============================================================
# OpenClaw Gateway - CAI DAT + KHOI DONG TU ZERO (Windows VPS)
# ============================================================
# 1 LENH DUY NHAT:
#   [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri "https://raw.githubusercontent.com/NguyenKhacDanh/OpenClaw_New/main/scripts/install-full-vps.ps1" -OutFile "D:\install.ps1" -UseBasicParsing; powershell -ExecutionPolicy Bypass -File D:\install.ps1
# ============================================================

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Port = 19001
$Token = "80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b"
$GroqApiKey = if ($env:GROQ_API_KEY) { $env:GROQ_API_KEY } else { Read-Host "Nhap Groq API Key" }
$NvidiaApiKey = if ($env:NVIDIA_API_KEY) { $env:NVIDIA_API_KEY } else { Read-Host "Nhap NVIDIA API Key" }
$ProjectDir = "D:\OpenClaw_New"
$RepoUrl = "https://github.com/NguyenKhacDanh/OpenClaw_New.git"

# --- Helper: Refresh PATH ---
function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $extras = @("C:\Program Files\nodejs", "C:\Program Files\Git\cmd", "$env:APPDATA\npm", "$env:LOCALAPPDATA\pnpm")
    $all = ($machinePath + ";" + $userPath + ";" + ($extras -join ";"))
    $env:Path = $all
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  OPENCLAW GATEWAY - CAI DAT + KHOI DONG TU ZERO" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# BUOC 1: Cai Git
# ============================================================
Write-Host "[1/9] Kiem tra Git..." -ForegroundColor Yellow
Refresh-Path
$gitOk = $false
try { $gv = git --version 2>$null; if ($gv) { $gitOk = $true } } catch {}

if ($gitOk) {
    Write-Host "      -> Git da co: $gv" -ForegroundColor Green
}
else {
    Write-Host "      -> Dang tai Git..." -ForegroundColor Yellow
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe"
    $gitFile = "$env:TEMP\Git-Install.exe"
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitFile -UseBasicParsing
    Write-Host "      -> Dang cai Git (silent)..." -ForegroundColor Yellow
    Start-Process -FilePath $gitFile -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-", "/CLOSEAPPLICATIONS", "/RESTARTAPPLICATIONS", "/COMPONENTS=icons,ext\reg\shellhere,assoc,assoc_sh" -Wait
    Refresh-Path
    try { $gv = git --version 2>$null } catch { $gv = $null }
    if ($gv) {
        Write-Host "      -> $gv - OK!" -ForegroundColor Green
    }
    else {
        Write-Host "      -> LOI: Khong cai duoc Git!" -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# BUOC 2: Cai Node.js 22
# ============================================================
Write-Host "[2/9] Kiem tra Node.js..." -ForegroundColor Yellow
Refresh-Path
$nodeOk = $false
try {
    $nv = node --version 2>$null
    if ($nv) {
        $major = [int]($nv -replace 'v', '').Split('.')[0]
        if ($major -ge 22) { $nodeOk = $true }
    }
}
catch {}

if ($nodeOk) {
    Write-Host "      -> Node.js $nv - OK!" -ForegroundColor Green
}
else {
    Write-Host "      -> Dang tai Node.js v22.22.1..." -ForegroundColor Yellow
    $nodeUrl = "https://nodejs.org/dist/v22.22.1/node-v22.22.1-x64.msi"
    $nodeFile = "$env:TEMP\node-v22.22.1-x64.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeFile -UseBasicParsing
    Write-Host "      -> Dang cai Node.js (silent)..." -ForegroundColor Yellow
    Start-Process msiexec.exe -ArgumentList "/i", $nodeFile, "/qn", "/norestart" -Wait
    Refresh-Path
    try { $nv = node --version 2>$null } catch { $nv = $null }
    if ($nv) {
        Write-Host "      -> Node.js $nv - OK!" -ForegroundColor Green
    }
    else {
        Write-Host "      -> LOI: Khong cai duoc Node.js!" -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# BUOC 3: Cai pnpm
# ============================================================
Write-Host "[3/9] Kiem tra pnpm..." -ForegroundColor Yellow
Refresh-Path
$pnpmOk = $false
try { $pv = pnpm --version 2>$null; if ($pv) { $pnpmOk = $true } } catch {}

if ($pnpmOk) {
    Write-Host "      -> pnpm v$pv - OK!" -ForegroundColor Green
}
else {
    Write-Host "      -> Dang cai pnpm@10.32.1..." -ForegroundColor Yellow
    npm install -g pnpm@10.32.1 2>&1 | Out-Null
    Refresh-Path
    try { $pv = pnpm --version 2>$null } catch { $pv = $null }
    if ($pv) {
        Write-Host "      -> pnpm v$pv - OK!" -ForegroundColor Green
    }
    else {
        Write-Host "      -> LOI: Khong cai duoc pnpm!" -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# BUOC 4: Fix PATH vinh vien
# ============================================================
Write-Host "[4/9] Fix PATH vinh vien..." -ForegroundColor Yellow
$currentMachinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$pathsToAdd = @("C:\Program Files\nodejs", "C:\Program Files\Git\cmd", "$env:APPDATA\npm")
$changed = $false
foreach ($p in $pathsToAdd) {
    if ($currentMachinePath -notlike "*$p*") {
        $currentMachinePath = $currentMachinePath.TrimEnd(";") + ";$p"
        $changed = $true
    }
}
if ($changed) {
    [System.Environment]::SetEnvironmentVariable("Path", $currentMachinePath, "Machine")
    Write-Host "      -> PATH da cap nhat vinh vien!" -ForegroundColor Green
}
else {
    Write-Host "      -> PATH da dung san." -ForegroundColor Green
}
Refresh-Path

# ============================================================
# BUOC 5: Clone / Pull code
# ============================================================
Write-Host "[5/9] Clone code ve $ProjectDir..." -ForegroundColor Yellow

if (Test-Path $ProjectDir) {
    Write-Host "      -> Thu muc da ton tai, dang pull moi nhat..." -ForegroundColor Yellow
    Set-Location $ProjectDir
    git pull origin main 2>&1 | Out-Null
}
else {
    Set-Location "D:\"
    git clone $RepoUrl 2>&1 | Out-Null
    Set-Location $ProjectDir
}
Write-Host "      -> Code OK!" -ForegroundColor Green

# ============================================================
# BUOC 6: pnpm install
# ============================================================
Write-Host "[6/9] Cai dependencies..." -ForegroundColor Yellow
Set-Location $ProjectDir
pnpm install 2>&1 | Select-Object -Last 3
Write-Host "      -> Dependencies OK!" -ForegroundColor Green

# ============================================================
# BUOC 7: Tao config (DAY DU CAC FIX)
# ============================================================
Write-Host "[7/9] Tao config openclaw..." -ForegroundColor Yellow

$configContent = @"
{
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "$Token"
    },
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "dangerouslyDisableDeviceAuth": true
    }
  },
  "channels": {
    "zalouser": {
      "enabled": true
    },
    "whatsapp": {
      "enabled": true
    },
    "zalo": {
      "enabled": true
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "groq/meta-llama/llama-4-scout-17b-16e-instruct",
        "fallbacks": [
          "groq/llama-3.3-70b-versatile",
          "groq/llama-3.1-8b-instant",
          "nvidia/nvidia/llama-3.1-nemotron-70b-instruct"
        ]
      }
    }
  },
  "tools": {
    "profile": "minimal"
  },
  "plugins": {
    "enabled": true,
    "allow": []
  }
}
"@

foreach ($dir in @("$env:USERPROFILE\.openclaw", "$env:USERPROFILE\.openclaw-dev")) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $wsDir = Join-Path $dir "workspace"
    if (!(Test-Path $wsDir)) { New-Item -ItemType Directory -Path $wsDir -Force | Out-Null }
    
    $cfgFile = Join-Path $dir "openclaw.json"
    # Ghi UTF-8 KHONG CO BOM (tranh loi JSON parse)
    [System.IO.File]::WriteAllText($cfgFile, $configContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "      -> $cfgFile" -ForegroundColor Green
}
Write-Host "      -> gateway.mode = local" -ForegroundColor Green
Write-Host "      -> dangerouslyDisableDeviceAuth = true" -ForegroundColor Green
Write-Host "      -> dangerouslyAllowHostHeaderOriginFallback = true" -ForegroundColor Green
Write-Host "      -> Token: $Token" -ForegroundColor Green

# ============================================================
# BUOC 7b: Copy models.json + workspace templates
# ============================================================
Write-Host "[7b/9] Cau hinh AI model (Groq)..." -ForegroundColor Yellow

# Tao agent dir
$agentDir = "$env:USERPROFILE\.openclaw\agents\main\agent"
if (!(Test-Path $agentDir)) { New-Item -ItemType Directory -Path $agentDir -Force | Out-Null }

# Copy models.json (Groq config) + inject API key
$modelsSource = Join-Path $ProjectDir "config-templates\models.json"
if (Test-Path $modelsSource) {
    $modelsContent = Get-Content $modelsSource -Raw
    $modelsContent = $modelsContent -replace 'YOUR_GROQ_API_KEY_HERE', $GroqApiKey
    $modelsContent = $modelsContent -replace 'YOUR_NVIDIA_API_KEY_HERE', $NvidiaApiKey
    $modelsTarget = Join-Path $agentDir "models.json"
    [System.IO.File]::WriteAllText($modelsTarget, $modelsContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "      -> models.json (Groq API) -> $agentDir" -ForegroundColor Green
}
else {
    Write-Host "      -> CANH BAO: config-templates/models.json khong tim thay!" -ForegroundColor Yellow
}

# Tao auth-profiles.json (de gateway tim duoc API key)
$authProfilesPath = Join-Path $agentDir "auth-profiles.json"
$authProfilesJson = @{
    version  = 1
    profiles = @{
        "groq:default"   = @{
            type     = "api_key"
            provider = "groq"
            key      = $GroqApiKey
        }
        "nvidia:default" = @{
            type     = "api_key"
            provider = "nvidia"
            key      = $NvidiaApiKey
        }
    }
} | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($authProfilesPath, $authProfilesJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "      -> auth-profiles.json (Groq + NVIDIA API keys) -> $agentDir" -ForegroundColor Green

# Copy workspace IDENTITY.md neu chua co
$wsDir = "$env:USERPROFILE\.openclaw\workspace"
if (!(Test-Path $wsDir)) { New-Item -ItemType Directory -Path $wsDir -Force | Out-Null }
$identitySrc = Join-Path $ProjectDir "config-templates\IDENTITY.md"
if ((Test-Path $identitySrc) -and !(Test-Path (Join-Path $wsDir "IDENTITY.md"))) {
    Copy-Item $identitySrc (Join-Path $wsDir "IDENTITY.md") -Force
    Write-Host "      -> IDENTITY.md -> workspace" -ForegroundColor Green
}

# ============================================================
# BUOC 8: Build server + UI
# ============================================================
Write-Host "[8/9] Build server + UI..." -ForegroundColor Yellow
Set-Location $ProjectDir

Write-Host "      -> Building server..." -ForegroundColor Yellow
npx tsdown 2>&1 | Select-Object -Last 3

Write-Host "      -> Building UI..." -ForegroundColor Yellow
pnpm ui:build 2>&1 | Select-Object -Last 3

if (Test-Path "$ProjectDir\dist\control-ui\index.html") {
    Write-Host "      -> Build OK!" -ForegroundColor Green
}
else {
    Write-Host "      -> LOI BUILD!" -ForegroundColor Red
    exit 1
}

# ============================================================
# BUOC 9: Firewall + Khoi dong Gateway
# ============================================================
Write-Host "[9/9] Firewall + Khoi dong gateway..." -ForegroundColor Yellow

# Mo firewall
try {
    $existing = Get-NetFirewallRule -DisplayName "OpenClaw Gateway" -ErrorAction SilentlyContinue
    if (!$existing) {
        New-NetFirewallRule -DisplayName "OpenClaw Gateway" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
        Write-Host "      -> Firewall: da mo port $Port" -ForegroundColor Green
    }
    else {
        Write-Host "      -> Firewall: da co rule" -ForegroundColor Green
    }
}
catch {
    Write-Host "      -> Firewall: mo thu cong port $Port" -ForegroundColor Yellow
}

# Kill gateway cu
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Lay IP
$localIP = $null
try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress
}
catch {}
if (!$localIP) { $localIP = "IP_CUA_VPS" }

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  HOAN TAT! GATEWAY DANG KHOI DONG..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  TRUY CAP TU TRINH DUYET:" -ForegroundColor Cyan
Write-Host "  http://${localIP}:${Port}/#token=${Token}" -ForegroundColor White
Write-Host ""
Write-Host "  TAT: Ctrl+C" -ForegroundColor DarkGray
Write-Host "  CHAY LAI: cd $ProjectDir" -ForegroundColor DarkGray
Write-Host "    node openclaw.mjs gateway run --bind lan --port $Port --force" -ForegroundColor DarkGray
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Khoi dong gateway FOREGROUND (thay log realtime)
Set-Location $ProjectDir
& "node" "openclaw.mjs" "gateway" "run" "--bind" "lan" "--port" "$Port" "--force"
