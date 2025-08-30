# Open generated EZPX files in GoLabel
# This script opens the generated test files from WSL in GoLabel

param(
    [string]$FilePath,
    [string]$Directory
)

# GoLabel executable paths
$golabelPaths = @(
    "C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe",
    "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe",
    "C:\Program Files\Godex\GoLabel\GoLabel.exe",
    "C:\GoLabel\GoLabel.exe"
)

# Find GoLabel
$golabelPath = $null
foreach ($path in $golabelPaths) {
    if (Test-Path $path) {
        $golabelPath = $path
        Write-Host "Found GoLabel at: $golabelPath" -ForegroundColor Green
        break
    }
}

if (-not $golabelPath) {
    Write-Host "GoLabel not found!" -ForegroundColor Red
    Write-Host "Searched locations:" -ForegroundColor Yellow
    $golabelPaths | ForEach-Object { Write-Host "  $_" }
    exit 1
}

# If specific file provided
if ($FilePath) {
    if (Test-Path $FilePath) {
        Write-Host "Opening file: $FilePath" -ForegroundColor Yellow
        Start-Process -FilePath $golabelPath -ArgumentList "`"$FilePath`""
        Write-Host "File opened in GoLabel" -ForegroundColor Green
    } else {
        Write-Host "File not found: $FilePath" -ForegroundColor Red
    }
    exit
}

# If directory provided
if ($Directory) {
    if (Test-Path $Directory) {
        $ezpxFiles = Get-ChildItem -Path $Directory -Filter "*.ezpx" | Sort-Object Name
        if ($ezpxFiles.Count -eq 0) {
            Write-Host "No EZPX files found in: $Directory" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Found $($ezpxFiles.Count) EZPX files:" -ForegroundColor Yellow
        $i = 1
        $ezpxFiles | ForEach-Object {
            Write-Host "  $i. $($_.Name)" -ForegroundColor White
            $i++
        }
        
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  1. Open first file" -ForegroundColor White
        Write-Host "  2. Open all files (one by one)" -ForegroundColor White
        Write-Host "  3. Select specific file" -ForegroundColor White
        
        $choice = Read-Host "Select option (1-3)"
        
        switch ($choice) {
            "1" {
                $file = $ezpxFiles[0]
                Write-Host "Opening: $($file.Name)" -ForegroundColor Yellow
                Start-Process -FilePath $golabelPath -ArgumentList "`"$($file.FullName)`""
                Write-Host "File opened in GoLabel" -ForegroundColor Green
            }
            "2" {
                foreach ($file in $ezpxFiles) {
                    Write-Host "Opening: $($file.Name)" -ForegroundColor Yellow
                    Start-Process -FilePath $golabelPath -ArgumentList "`"$($file.FullName)`""
                    Start-Sleep -Seconds 2
                }
                Write-Host "All files opened in GoLabel" -ForegroundColor Green
            }
            "3" {
                $fileNum = Read-Host "Enter file number (1-$($ezpxFiles.Count))"
                $fileIndex = [int]$fileNum - 1
                if ($fileIndex -ge 0 -and $fileIndex -lt $ezpxFiles.Count) {
                    $file = $ezpxFiles[$fileIndex]
                    Write-Host "Opening: $($file.Name)" -ForegroundColor Yellow
                    Start-Process -FilePath $golabelPath -ArgumentList "`"$($file.FullName)`""
                    Write-Host "File opened in GoLabel" -ForegroundColor Green
                } else {
                    Write-Host "Invalid file number" -ForegroundColor Red
                }
            }
            default {
                Write-Host "Invalid option" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Directory not found: $Directory" -ForegroundColor Red
    }
    exit
}

# No parameters - show usage
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\open-generated-labels.ps1 -FilePath <path to EZPX file>" -ForegroundColor White
Write-Host "  .\open-generated-labels.ps1 -Directory <path to directory with EZPX files>" -ForegroundColor White
Write-Host ""
Write-Host "Example:" -ForegroundColor Yellow
Write-Host "  .\open-generated-labels.ps1 -Directory C:\Temp\golabel-test" -ForegroundColor White