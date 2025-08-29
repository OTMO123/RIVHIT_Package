# Script to safely restart GoLabel

Write-Host "Restarting GoLabel..." -ForegroundColor Green
Write-Host ""

# Step 1: Terminate existing processes
Write-Host "Step 1: Terminating existing processes" -ForegroundColor Yellow
& "$PSScriptRoot\kill-golabel.ps1"

# Wait a bit
Start-Sleep -Seconds 2

# Step 2: Clean locks and cache
Write-Host ""
Write-Host "Step 2: Cleaning locks" -ForegroundColor Yellow

$lockFiles = @(
    "$env:LOCALAPPDATA\Godex\GoLabel\*.lock",
    "$env:APPDATA\Godex\GoLabel\*.lock",
    "$env:TEMP\GoLabel*.tmp"
)

foreach ($pattern in $lockFiles) {
    Remove-Item -Path $pattern -Force -ErrorAction SilentlyContinue
}

# Check GoLabel path
$golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
if (!(Test-Path $golabelPath)) {
    $golabelPath = "C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe"
}

if (Test-Path $golabelPath) {
    Write-Host ""
    Write-Host "Step 3: Starting GoLabel" -ForegroundColor Yellow
    Write-Host "Path: $golabelPath" -ForegroundColor Gray
    
    try {
        # Try to start in safe mode if possible
        Start-Process -FilePath $golabelPath -ArgumentList "/safe" -ErrorAction SilentlyContinue
    }
    catch {
        # If no safe mode support - start normally
        Start-Process -FilePath $golabelPath
    }
    
    Write-Host ""
    Write-Host "GoLabel started successfully" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "GoLabel not found!" -ForegroundColor Red
    Write-Host "Check installation path" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Tips if GoLabel keeps crashing:" -ForegroundColor Yellow
Write-Host "1. Try reinstalling GoLabel" -ForegroundColor White
Write-Host "2. Delete config files in %APPDATA%\Godex" -ForegroundColor White
Write-Host "3. Run GoLabel as administrator" -ForegroundColor White