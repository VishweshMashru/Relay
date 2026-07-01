# Streamo edge agent installer for Windows.
#
# Run from an *elevated* PowerShell (Right-click → Run as Administrator):
#   iwr https://streamo.in/install.ps1 -useb | iex
#
# Or unattended:
#   $env:RELAY_EDGE_TOKEN = "your-token"; iwr https://streamo.in/install.ps1 -useb | iex
#
# What it does:
#   - Downloads the latest relay-edge.exe from GitHub Releases
#   - Installs to C:\Program Files\RelayEdge\
#   - Registers as a startup task (SYSTEM user, no login required)
#   - Prompts for edge token if not set via env
#   - Attempts to install ffmpeg via winget if missing
#
# Uninstall:
#   schtasks /Delete /F /TN "RelayEdge"
#   Remove-Item -Recurse -Force 'C:\Program Files\RelayEdge','C:\ProgramData\RelayEdge'

$ErrorActionPreference = 'Stop'

$Repo         = 'VishweshMashru/Relay'
$InstallDir   = 'C:\Program Files\RelayEdge'
$ConfigDir    = 'C:\ProgramData\RelayEdge'
$TaskName     = 'RelayEdge'
$RelayApiUrl  = if ($env:RELAY_API_URL) { $env:RELAY_API_URL } else { 'https://api.streamo.in' }

# --- Admin check --------------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole( `
  [Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
  Write-Host "✗ This installer needs Administrator. Right-click PowerShell → Run as Administrator." -ForegroundColor Red
  exit 1
}

# --- Architecture -------------------------------------------------------------
if (-not [Environment]::Is64BitOperatingSystem) {
  Write-Host "✗ Only 64-bit Windows is supported." -ForegroundColor Red
  exit 1
}
$Binary = "relay-edge-windows-amd64.exe"

# --- Locate the release asset -------------------------------------------------
Write-Host "→ Finding latest release..."
$Release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ 'User-Agent' = 'streamo-installer' }
$Asset = $Release.assets | Where-Object { $_.name -eq $Binary }
if (-not $Asset) {
  Write-Host "✗ Could not find $Binary in the latest release. Cut one first with:" -ForegroundColor Red
  Write-Host "    git tag edge-v0.1.0; git push origin edge-v0.1.0" -ForegroundColor Yellow
  exit 1
}

# --- Directories --------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $ConfigDir  | Out-Null

# --- Download binary ----------------------------------------------------------
Write-Host "→ Downloading $Binary..."
$TargetExe = Join-Path $InstallDir 'relay-edge.exe'
Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $TargetExe -UseBasicParsing
Write-Host "✓ Installed $TargetExe"

# --- Ensure ffmpeg present (best-effort via winget) ---------------------------
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host "→ Installing ffmpeg via winget..."
    winget install --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements
  } else {
    Write-Host "! ffmpeg is not installed. Install it before using the agent:" -ForegroundColor Yellow
    Write-Host "  https://www.gyan.dev/ffmpeg/builds/  (add ffmpeg.exe to PATH)"
  }
} else {
  Write-Host "✓ ffmpeg already present"
}

# --- Config -------------------------------------------------------------------
$Token = $env:RELAY_EDGE_TOKEN
if (-not $Token) {
  $Token = Read-Host "`nPaste your edge token (from the Streamo dashboard)"
}
if (-not $Token) {
  Write-Host "✗ RELAY_EDGE_TOKEN is required." -ForegroundColor Red
  exit 1
}

$CamerasFile = Join-Path $ConfigDir 'cameras.json'
if (-not (Test-Path $CamerasFile)) {
  '{"cameras":{}}' | Out-File -FilePath $CamerasFile -Encoding utf8 -NoNewline
}

# Launcher batch file — carries env vars into the scheduled task
$Launcher = Join-Path $InstallDir 'run.bat'
$LauncherContent = @"
@echo off
set RELAY_API_URL=$RelayApiUrl
set RELAY_EDGE_TOKEN=$Token
set RELAY_CAMERAS_FILE=$CamerasFile
"$TargetExe"
"@
Set-Content -Path $Launcher -Value $LauncherContent -Encoding ASCII

# Lock down config so non-admins can't read the token
$acl = Get-Acl $Launcher
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM","FullControl","Allow")
$acl.AddAccessRule($rule)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators","FullControl","Allow")
$acl.AddAccessRule($rule)
Set-Acl $Launcher $acl

# --- Scheduled task at startup (SYSTEM, no login required) --------------------
Write-Host "→ Registering '$TaskName' to start on boot..."
schtasks /Delete /F /TN $TaskName 2>$null | Out-Null
schtasks /Create /F /RU SYSTEM /RL HIGHEST /SC ONSTART /TN $TaskName /TR "`"$Launcher`"" | Out-Null
schtasks /Run /TN $TaskName | Out-Null

Write-Host ""
Write-Host "✓ relay-edge installed and running." -ForegroundColor Green
Write-Host ""
Write-Host "Next step — add your cameras:" -ForegroundColor Cyan
Write-Host "  notepad $CamerasFile"
Write-Host ""
Write-Host "Example content:"
Write-Host '  {'
Write-Host '    "cameras": {'
Write-Host '      "<camera-uuid-from-dashboard>": "rtsp://user:pass@192.168.1.20:554/Streaming/Channels/101"'
Write-Host '    }'
Write-Host '  }'
Write-Host ""
Write-Host "After editing, restart the task:"
Write-Host "  schtasks /End /TN RelayEdge; schtasks /Run /TN RelayEdge"
