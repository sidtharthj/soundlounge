<#
.SYNOPSIS
    Download FFmpeg essentials build for Windows (x64) for bundling with SoundLounge.

.DESCRIPTION
    Downloads ffmpeg-release-essentials.zip from Gyan.dev, extracts ffmpeg.exe
    and ffprobe.exe, and places them in dist_tools\ffmpeg\.

.NOTES
    Source: https://www.gyan.dev/ffmpeg/builds/
    License: FFmpeg is LGPL-licensed. See https://ffmpeg.org/legal.html
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$FfmpegDir   = Join-Path $ProjectRoot "dist_tools\ffmpeg"
$TmpZip      = Join-Path $env:TEMP "ffmpeg-essentials.zip"
$TmpExtract  = Join-Path $env:TEMP "ffmpeg-extract"

function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }

# Check if already downloaded
if ((Test-Path (Join-Path $FfmpegDir "ffmpeg.exe")) -and (Test-Path (Join-Path $FfmpegDir "ffprobe.exe"))) {
    Write-OK "FFmpeg already present in dist_tools\ffmpeg\ — nothing to do."
    exit 0
}

Write-Step "Downloading FFmpeg essentials (Windows x64)..."
Write-Host "  Source: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
Write-Host "  Destination: $TmpZip"
Write-Host "  (This is ~80MB - please wait...)"

$ProgressPreference = 'SilentlyContinue'  # Faster downloads in PowerShell
Invoke-WebRequest `
    -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" `
    -OutFile $TmpZip `
    -UseBasicParsing

Write-OK "Download complete: $TmpZip"

Write-Step "Extracting archive..."
if (Test-Path $TmpExtract) { Remove-Item $TmpExtract -Recurse -Force }
Expand-Archive -Path $TmpZip -DestinationPath $TmpExtract -Force
Write-OK "Extraction complete"

# The zip contains a folder like ffmpeg-7.x.x-essentials_build\bin\
$BinDir = Get-ChildItem -Path $TmpExtract -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1 -ExpandProperty DirectoryName

if (-not $BinDir) {
    Write-Host "ERROR: Could not find ffmpeg.exe in the extracted archive." -ForegroundColor Red
    exit 1
}

Write-Step "Copying binaries to dist_tools\ffmpeg\"
New-Item -ItemType Directory -Force -Path $FfmpegDir | Out-Null

Copy-Item (Join-Path $BinDir "ffmpeg.exe")  -Destination $FfmpegDir -Force
Copy-Item (Join-Path $BinDir "ffprobe.exe") -Destination $FfmpegDir -Force

Write-OK "ffmpeg.exe  → $FfmpegDir"
Write-OK "ffprobe.exe → $FfmpegDir"

# Clean up
Remove-Item $TmpZip     -Force -ErrorAction SilentlyContinue
Remove-Item $TmpExtract -Recurse -Force -ErrorAction SilentlyContinue
Write-OK "Temp files cleaned up"

Write-Host ""
Write-Host "FFmpeg is ready for bundling." -ForegroundColor Green
Write-Host "Now run: .\build.ps1" -ForegroundColor Green
Write-Host ""
