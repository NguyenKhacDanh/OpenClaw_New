# ============================================================
# Fix VPS Config - Them channels.zalouser.enabled = true
# ============================================================
# Su dung: powershell -ExecutionPolicy Bypass -File D:\OpenClaw_New\scripts\fix-vps-config.ps1
# ============================================================

$Token = "80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b"

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
  "plugins": {
    "enabled": true,
    "allow": []
  }
}
"@

foreach ($dir in @("$env:USERPROFILE\.openclaw", "$env:USERPROFILE\.openclaw-dev")) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $cfgFile = Join-Path $dir "openclaw.json"
    [System.IO.File]::WriteAllText($cfgFile, $configContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated: $cfgFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "Config da duoc cap nhat!" -ForegroundColor Green
Write-Host "Channels enabled: zalouser, whatsapp, zalo" -ForegroundColor Cyan
Write-Host ""
Write-Host "Khoi dong lai gateway:" -ForegroundColor Yellow
Write-Host "  cd D:\OpenClaw_New" -ForegroundColor White
Write-Host "  node openclaw.mjs gateway run --bind lan --port 19001 --force" -ForegroundColor White
