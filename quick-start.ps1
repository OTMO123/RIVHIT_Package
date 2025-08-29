# Quick start script for RIVHIT Package (bypasses sqlite3 issues)
Write-Host "Quick Start for RIVHIT Package" -ForegroundColor Green
Write-Host "This script will help you run the application despite installation issues" -ForegroundColor Gray

# Create temporary backend package.json without sqlite3
Write-Host "`nCreating temporary configuration..." -ForegroundColor Yellow

# Read the original package.json
$backendPackagePath = "packages\backend\package.json"
$backupPath = "packages\backend\package.json.backup"

# Create backup
Copy-Item $backendPackagePath $backupPath -Force

# Modify package.json to remove sqlite3 and typeorm
$packageContent = Get-Content $backendPackagePath -Raw
$packageJson = $packageContent | ConvertFrom-Json

# Remove problematic dependencies
$packageJson.dependencies.PSObject.Properties.Remove("sqlite3")
$packageJson.dependencies.PSObject.Properties.Remove("typeorm")
$packageJson.dependencies.PSObject.Properties.Remove("sharp")

# Save modified version
$packageJson | ConvertTo-Json -Depth 100 | Out-File $backendPackagePath -Encoding UTF8

Write-Host "Temporary configuration created" -ForegroundColor Green

# Install only essential dependencies
Write-Host "`nInstalling essential dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps --no-optional

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuilding shared package..." -ForegroundColor Yellow
    npx lerna run build --scope=@packing/shared
    
    Write-Host "`nStarting the application..." -ForegroundColor Green
    Write-Host "Note: Database features will be limited without sqlite3" -ForegroundColor Yellow
    
    # Start both services
    Write-Host "`nStarting backend and frontend..." -ForegroundColor Cyan
    npx lerna run dev
} else {
    Write-Host "`nInstallation still failed. Trying minimal setup..." -ForegroundColor Red
    
    # Restore original package.json
    Copy-Item $backupPath $backendPackagePath -Force
    Remove-Item $backupPath
    
    Write-Host "`nPlease try the following manual steps:" -ForegroundColor Yellow
    Write-Host "1. Install Node.js v18 LTS (not v22)" -ForegroundColor White
    Write-Host "2. Run this command as Administrator:" -ForegroundColor White
    Write-Host "   npm install -g windows-build-tools" -ForegroundColor Gray
    Write-Host "3. Then run: .\fix-install.ps1" -ForegroundColor Gray
}

# Cleanup function
trap {
    if (Test-Path $backupPath) {
        Write-Host "`nRestoring original configuration..." -ForegroundColor Yellow
        Copy-Item $backupPath $backendPackagePath -Force
        Remove-Item $backupPath
    }
}