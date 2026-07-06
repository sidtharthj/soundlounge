<#
.SYNOPSIS
    SoundLounge full release build script.

.DESCRIPTION
    Orchestrates the entire build pipeline:
      1. Set up Python virtual environment and install backend dependencies
      2. Build the React frontend (npm install + npm run build)
      3. Run PyInstaller to produce dist\SoundLounge\SoundLounge.exe
      4. Run Inno Setup Compiler to produce releases\SoundLounge-Setup.exe

.EXAMPLE
    .\build.ps1                    # Full build
    .\build.ps1 -SkipFrontend      # Skip npm build (use existing static/)
    .\build.ps1 -SkipPyInstaller   # Skip PyInstaller (use existing dist/)

.NOTES
    Prerequisites:
      - Python 3.10+ in PATH
      - Node.js 18+ in PATH
      - Inno Setup 6+ installed (ISCC.exe in PATH or default location)
      - dist_tools\ffmpeg\ffmpeg.exe and ffprobe.exe present
#>

param(
    [switch]$SkipFrontend,
    [switch]$SkipPyInstaller,
    [switch]$SkipInnoSetup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$BackendDir  = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$VenvDir     = Join-Path $BackendDir  ".venv"
$ReleasesDir = Join-Path $ProjectRoot "releases"
$FfmpegExe   = Join-Path $ProjectRoot "dist_tools\ffmpeg\ffmpeg.exe"

# ── Color helpers ──────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }

# ── Pre-flight checks ──────────────────────────────────────────────────────────
Write-Step "Pre-flight checks"

if (-not (Test-Path $FfmpegExe)) {
    Write-Warn "FFmpeg not found at dist_tools\ffmpeg\ffmpeg.exe"
    Write-Warn "Run: .\download_ffmpeg.ps1  (or download manually from https://www.gyan.dev/ffmpeg/builds/)"
    Write-Warn "Continuing — installer will lack bundled FFmpeg."
} else {
    Write-OK "FFmpeg found"
}

# Ensure Python exists
try { $null = python --version } catch {
    Write-Fail "Python not found in PATH. Install Python 3.10+ first."
    exit 1
}
Write-OK "Python: $(python --version)"

# Ensure Node exists (only needed if building frontend)
if (-not $SkipFrontend) {
    try { $null = node --version } catch {
        Write-Fail "Node.js not found in PATH. Install Node.js 18+ first."
        exit 1
    }
    Write-OK "Node: $(node --version)"
}

# ── Step 1: Python virtual environment ────────────────────────────────────────
Write-Step "Setting up Python virtual environment"

if (-not (Test-Path $VenvDir)) {
    python -m venv $VenvDir
    Write-OK "Created venv at backend\.venv"
} else {
    Write-OK "venv already exists"
}

$PipExe    = Join-Path $VenvDir "Scripts\pip.exe"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

Write-Step "Installing backend Python dependencies"
& $PipExe install --upgrade pip --quiet
& $PipExe install -r (Join-Path $BackendDir "requirements.txt") --quiet
Write-OK "Backend deps installed"

Write-Step "Installing build dependencies (PyInstaller)"
& $PipExe install -r (Join-Path $ProjectRoot "requirements-build.txt") --quiet
Write-OK "PyInstaller installed"

# ── Step 2: Build React frontend ──────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Step "Installing frontend npm packages"
    Push-Location $FrontendDir
    npm install --silent
    Write-OK "npm install complete"

    Write-Step "Building React frontend (Vite)"
    npm run build
    Write-OK "Frontend built → backend\static\"
    Pop-Location
} else {
    Write-Warn "Skipping frontend build (-SkipFrontend)"
}

# Verify static output exists
$StaticIndex = Join-Path $BackendDir "static\index.html"
if (-not (Test-Path $StaticIndex)) {
    Write-Fail "backend\static\index.html not found! Run 'npm run build' in frontend/ first."
    exit 1
}

# ── Step 3: PyInstaller ───────────────────────────────────────────────────────
if (-not $SkipPyInstaller) {
    Write-Step "Running PyInstaller"
    $PyInstallerExe = Join-Path $VenvDir "Scripts\pyinstaller.exe"
    & $PyInstallerExe (Join-Path $ProjectRoot "SoundLounge.spec") `
        --distpath (Join-Path $ProjectRoot "dist") `
        --workpath (Join-Path $ProjectRoot "build") `
        --noconfirm
    Write-OK "PyInstaller complete → dist\SoundLounge\SoundLounge.exe"
} else {
    Write-Warn "Skipping PyInstaller (-SkipPyInstaller)"
}

# Verify exe
$ExePath = Join-Path $ProjectRoot "dist\SoundLounge\SoundLounge.exe"
if (-not (Test-Path $ExePath)) {
    Write-Fail "dist\SoundLounge\SoundLounge.exe not found! PyInstaller may have failed."
    exit 1
}

# ── Step 4: Inno Setup ────────────────────────────────────────────────────────
if (-not $SkipInnoSetup) {
    Write-Step "Running Inno Setup Compiler"

    $IsccCandidates = @(
        "ISCC.exe",  # In PATH
        "$env:SystemDrive\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "$env:SystemDrive\Program Files (x86)\Inno Setup 5\ISCC.exe"
    )
    $IsccExe = $null
    foreach ($c in $IsccCandidates) {
        if (Test-Path $c) { $IsccExe = $c; break }
        try { $null = Get-Command $c -ErrorAction Stop; $IsccExe = $c; break } catch {}
    }

    if (-not $IsccExe) {
        Write-Warn "Inno Setup (ISCC.exe) not found."
        Write-Warn "Download from: https://jrsoftware.org/isdl.php"
        Write-Warn "Install it and re-run: .\build.ps1 -SkipFrontend -SkipPyInstaller"
    } else {
        New-Item -ItemType Directory -Force -Path $ReleasesDir | Out-Null
        & $IsccExe (Join-Path $ProjectRoot "SoundLounge.iss")
        $SetupExe = Join-Path $ReleasesDir "SoundLounge-Setup.exe"
        if (Test-Path $SetupExe) {
            Write-OK "Installer created: releases\SoundLounge-Setup.exe"
        } else {
            Write-Fail "Inno Setup did not produce releases\SoundLounge-Setup.exe"
        }
    }
} else {
    Write-Warn "Skipping Inno Setup (-SkipInnoSetup)"
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Sound Lounge build complete!" -ForegroundColor Magenta
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Executable  : dist\SoundLounge\SoundLounge.exe"
Write-Host "  Installer   : releases\SoundLounge-Setup.exe"
Write-Host ""
