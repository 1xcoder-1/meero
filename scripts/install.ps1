#Requires -Version 5.0
$ErrorActionPreference = "Stop"

# TLS 1.2 is required for github.com on Windows PowerShell 5.1 (default ships with old protocols)
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {}

$repo = "1xcoder-1/meero"

Write-Host "Installing meero..."

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq "AMD64") {
    $arch = "x64"
} elseif ($arch -eq "ARM64") {
    Write-Host "ARM64 detected - using x64 build (runs via Windows emulation)."
    $arch = "x64"
} else {
    Write-Host "Unsupported architecture: $arch"
    exit 1
}

$filename = "meero-windows-$arch.exe"
$url = "https://github.com/$repo/releases/latest/download/$filename"

# Compatible with Windows PowerShell 5.1 (New-TemporaryFile only exists in PS 6+)
$tmp = [System.IO.Path]::GetTempFileName()
$installDir = Join-Path $env:USERPROFILE ".local\bin"
$dest = Join-Path $installDir "meero.exe"

try {
    Write-Host "Downloading $filename..."
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
} catch {
    Write-Host "X Download failed: $($_.Exception.Message)"
    Write-Host "  Expected release asset at: $url"
    Write-Host "  Check that a release exists: https://github.com/$repo/releases/latest"
    Remove-Item $tmp -ErrorAction SilentlyContinue
    exit 1
}

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

Move-Item $tmp $dest -Force
Write-Host "Installed to $dest"

$path = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($path -notlike "*$installDir*") {
    Write-Host "Adding to PATH..."
    [Environment]::SetEnvironmentVariable(
        "PATH",
        "$installDir;$path",
        "User"
    )
    Write-Host "Restart terminal to use meero"
}

Write-Host ""
Write-Host "OK meero installed successfully"
Write-Host "Run: meero setup"
