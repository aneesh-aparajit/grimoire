<#
.SYNOPSIS
  Install Grimoire on Windows.

.DESCRIPTION
  Installs Grimoire for the current user (no administrator rights needed).

  Where the installer comes from, in order:
    1. the path given with -Installer
    2. a fresh build of this clone, with -Build
    3. a *-setup.exe next to this script, or the newest local build in app\src-tauri\target
    4. the latest GitHub release (via `gh` if installed and signed in, else the public API)

.PARAMETER Installer
  Path to a grimoire_*-setup.exe to install.

.PARAMETER Build
  Build the installer from this clone first (pnpm install, then pnpm tauri build).

.PARAMETER Open
  Launch Grimoire after installing.

.EXAMPLE
  Set-ExecutionPolicy -Scope Process Bypass -Force
  .\scripts\install.ps1 -Build -Open

.NOTES
  GRIMOIRE_REPO  GitHub repo to download releases from (default: aneesh-aparajit/grimoire)
#>
[CmdletBinding()]
param(
  [string]$Installer = "",
  [switch]$Build,
  [switch]$Open
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$AppName = "grimoire"
$Repo = if ($env:GRIMOIRE_REPO) { $env:GRIMOIRE_REPO } else { "aneesh-aparajit/grimoire" }
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$AppDir = Join-Path $RepoRoot "app"
$BundleDirs = @(
  (Join-Path $AppDir "src-tauri\target\release\bundle\nsis"),
  (Join-Path $AppDir "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis"),
  (Join-Path $AppDir "src-tauri\target\aarch64-pc-windows-msvc\release\bundle\nsis")
)

function Info($msg) { Write-Host "==> " -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Warn($msg) { Write-Host "warning: " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Die($msg) { Write-Host "error: " -ForegroundColor Red -NoNewline; Write-Host $msg; exit 1 }

if ($PSVersionTable.PSVersion.Major -ge 6 -and -not $IsWindows) {
  Die "this installer is for Windows. On macOS, use scripts/install.sh."
}

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Die "$cmd not found. $hint" }
}

function Newest-Installer($dirs) {
  $dirs | Where-Object { Test-Path $_ } |
    ForEach-Object { Get-ChildItem -Path $_ -Filter "*-setup.exe" -File } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

function Build-Installer {
  Need "pnpm" "Install Node.js 22+ and pnpm (see the install guide)."
  Need "cargo" "Install Rust with rustup (see the install guide)."
  Info "Installing frontend dependencies"
  Push-Location $AppDir
  try {
    pnpm install --frozen-lockfile | Out-Host
    if ($LASTEXITCODE -ne 0) { Die "pnpm install failed." }
    Info "Building the installer (the first build takes a few minutes)"
    pnpm tauri build --bundles nsis | Out-Host
    if ($LASTEXITCODE -ne 0) { Die "the build failed. Check that the Visual Studio C++ Build Tools are installed." }
  } finally {
    Pop-Location
  }
  $found = Newest-Installer $BundleDirs
  if (-not $found) { Die "the build finished but no installer was found in app\src-tauri\target." }
  return $found.FullName
}

function Download-Release {
  $work = Join-Path ([System.IO.Path]::GetTempPath()) ("grimoire-install-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $work | Out-Null
  Info "Downloading the latest release from github.com/$Repo"
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) { gh auth status *> $null }
  if ($gh -and $LASTEXITCODE -eq 0) {
    gh release download --repo $Repo --pattern "*-setup.exe" --dir $work | Out-Host
    if ($LASTEXITCODE -ne 0) { Die "could not download an installer from $Repo's latest release with gh." }
  } else {
    try {
      $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "grimoire-installer" }
    } catch {
      Die "no public release found for $Repo. Build from source with -Build, or pass -Installer."
    }
    $asset = $release.assets | Where-Object { $_.name -like "*-setup.exe" } | Select-Object -First 1
    if (-not $asset) { Die "the latest release of $Repo has no Windows installer." }
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile (Join-Path $work $asset.name) -UseBasicParsing
  }
  $found = Newest-Installer @($work)
  if (-not $found) { Die "the download didn't contain an installer." }
  # Downloaded files carry the Mark of the Web; clear it so SmartScreen doesn't stop the silent install.
  Unblock-File -Path $found.FullName
  return $found.FullName
}

# 1-4. Find the installer.
if (-not $Installer -and $Build) { $Installer = Build-Installer }
if (-not $Installer) {
  $local = Newest-Installer (@($ScriptDir) + $BundleDirs)
  if ($local) {
    $Installer = $local.FullName
    Info "Using local build: $Installer"
  }
}
if (-not $Installer) { $Installer = Download-Release }
if (-not (Test-Path $Installer)) { Die "installer not found: $Installer" }

# Quit a running copy so it can be replaced.
$running = Get-Process -Name $AppName -ErrorAction SilentlyContinue
if ($running) {
  Info "Quitting the running copy of Grimoire"
  $running | Stop-Process -Force
  Start-Sleep -Seconds 1
}

Info "Installing $(Split-Path -Leaf $Installer)"
$proc = Start-Process -FilePath $Installer -ArgumentList "/S" -Wait -PassThru
if ($proc.ExitCode -ne 0) { Die "the installer exited with code $($proc.ExitCode)." }

# The per-user NSIS installer puts the app under %LOCALAPPDATA%.
$exe = @(
  (Join-Path $env:LOCALAPPDATA "$AppName\$AppName.exe"),
  (Join-Path $env:LOCALAPPDATA "Programs\$AppName\$AppName.exe")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($exe) {
  Info "Grimoire is installed: $exe"
} else {
  Info "Grimoire is installed. Open it from the Start menu."
}

if ($Open) {
  if ($exe) { Start-Process -FilePath $exe } else { Warn "couldn't find grimoire.exe to open; use the Start menu." }
}
