# Fix installation issues for RIVHIT Package
Write-Host "Fixing RIVHIT Package installation issues..." -ForegroundColor Green

# 1. Check Node.js version
Write-Host "`nChecking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan

if ($nodeVersion -match "v22") {
    Write-Host "Warning: Node.js v22 detected. This project works best with Node.js v18 or v20" -ForegroundColor Yellow
}

# 2. Clean all node_modules and lock files
Write-Host "`nCleaning old installations..." -ForegroundColor Yellow
$foldersToDelete = @(
    "node_modules",
    "package-lock.json",
    "packages\backend\node_modules",
    "packages\backend\package-lock.json",
    "packages\frontend\node_modules",
    "packages\frontend\package-lock.json",
    "packages\shared\node_modules",
    "packages\shared\package-lock.json"
)

foreach ($folder in $foldersToDelete) {
    if (Test-Path $folder) {
        Write-Host "Removing $folder..." -ForegroundColor Gray
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. Clear npm cache
Write-Host "`nClearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# 4. Configure npm for Windows
Write-Host "`nConfiguring npm for Windows..." -ForegroundColor Yellow
npm config set msvs_version 2022
npm config set python python3

# 5. Create .npmrc file with proper settings
Write-Host "`nCreating .npmrc configuration..." -ForegroundColor Yellow
$npmrcContent = @"
legacy-peer-deps=true
force=true
fetch-timeout=600000
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
"@
$npmrcContent | Out-File -FilePath ".npmrc" -Encoding UTF8

# 6. Install dependencies with proper flags
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray

# Try installing without optional dependencies first
$env:npm_config_optional = "false"
npm install --legacy-peer-deps --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nInitial installation failed, trying alternative approach..." -ForegroundColor Yellow
    
    # Install without sqlite3 first
    Write-Host "Installing without problematic dependencies..." -ForegroundColor Gray
    
    # Create a temporary package.json without sqlite3
    $packageJson = Get-Content "packages\backend\package.json" | ConvertFrom-Json
    $packageJson.dependencies.PSObject.Properties.Remove("sqlite3")
    $packageJson | ConvertTo-Json -Depth 100 | Out-File "packages\backend\package.json" -Encoding UTF8
    
    # Try again
    npm install --legacy-peer-deps --force
    
    # Restore original package.json
    git checkout packages\backend\package.json
}

# 7. Build shared package
Write-Host "`nBuilding shared package..." -ForegroundColor Yellow
npx lerna run build --scope=@packing/shared

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nInstallation fixed successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Run 'npx lerna run dev' to start both backend and frontend" -ForegroundColor White
    Write-Host "2. Or run them separately:" -ForegroundColor White
    Write-Host "   - Backend: npx lerna run dev --scope=@packing/backend" -ForegroundColor Gray
    Write-Host "   - Frontend: npx lerna run dev --scope=@packing/frontend" -ForegroundColor Gray
} else {
    Write-Host "`nBuild failed. Additional troubleshooting needed." -ForegroundColor Red
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Install Node.js v18 or v20 instead of v22" -ForegroundColor White
    Write-Host "2. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "3. Disable Windows Defender temporarily during installation" -ForegroundColor White
    Write-Host "4. Install Visual Studio Build Tools:" -ForegroundColor White
    Write-Host "   npm install --global windows-build-tools" -ForegroundColor Gray
}