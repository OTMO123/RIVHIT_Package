# Script to force close GoLabel and all its processes

Write-Host "Terminating GoLabel processes..." -ForegroundColor Yellow
Write-Host ""

# List of possible GoLabel process names
$processNames = @(
    "GoLabel",
    "GoLabel II",
    "GCL",
    "QLabelSDK"
)

$killed = $false

foreach ($processName in $processNames) {
    # Find processes
    $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
    
    if ($processes) {
        foreach ($process in $processes) {
            try {
                Write-Host "Found process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Cyan
                
                # Try to close normally
                $process.CloseMainWindow() | Out-Null
                Start-Sleep -Milliseconds 500
                
                # Force kill if not closed
                if (!$process.HasExited) {
                    Write-Host "  Force terminating..." -ForegroundColor Red
                    Stop-Process -Id $process.Id -Force
                    $killed = $true
                } else {
                    Write-Host "  Closed normally" -ForegroundColor Green
                    $killed = $true
                }
            }
            catch {
                Write-Host "  Error terminating: $_" -ForegroundColor Red
                
                # Try taskkill
                try {
                    & taskkill /F /PID $process.Id /T 2>$null
                    $killed = $true
                }
                catch {
                    Write-Host "  Could not terminate process" -ForegroundColor Red
                }
            }
        }
    }
}

# Additional search by partial name
$allProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*GoLabel*" -or 
    $_.ProcessName -like "*Godex*" -or
    $_.ProcessName -like "*GCL*" -or
    $_.MainWindowTitle -like "*GoLabel*"
}

if ($allProcesses) {
    Write-Host ""
    Write-Host "Additional Godex processes:" -ForegroundColor Yellow
    
    foreach ($process in $allProcesses) {
        try {
            Write-Host "Terminating: $($process.ProcessName) - $($process.MainWindowTitle)" -ForegroundColor Cyan
            Stop-Process -Id $process.Id -Force
            $killed = $true
        }
        catch {
            Write-Host "  Error: $_" -ForegroundColor Red
        }
    }
}

# Check for hung windows
Write-Host ""
Write-Host "Checking for hung windows..." -ForegroundColor Yellow

# Kill JIT debugger processes if any
$debuggers = Get-Process -Name "vsjitdebugger", "WerFault" -ErrorAction SilentlyContinue
if ($debuggers) {
    foreach ($debugger in $debuggers) {
        Write-Host "Closing debugger: $($debugger.ProcessName)" -ForegroundColor Cyan
        Stop-Process -Id $debugger.Id -Force
    }
}

# Clean GoLabel temp files
Write-Host ""
Write-Host "Cleaning temporary files..." -ForegroundColor Yellow

$tempPaths = @(
    "$env:TEMP\GoLabel*",
    "$env:TEMP\Godex*",
    "$env:LOCALAPPDATA\Temp\GoLabel*"
)

foreach ($path in $tempPaths) {
    if (Test-Path $path) {
        Write-Host "Removing temp files: $path" -ForegroundColor Gray
        Remove-Item -Path $path -Force -Recurse -ErrorAction SilentlyContinue
    }
}

# Result
Write-Host ""
if ($killed) {
    Write-Host "GoLabel processes terminated successfully" -ForegroundColor Green
} else {
    Write-Host "No GoLabel processes found" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green