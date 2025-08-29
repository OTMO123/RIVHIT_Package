# Fix native modules for Windows
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Fixing Native Modules for Windows" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Clean all node_modules completely
Write-Host "`n[1/6] Cleaning all node_modules..." -ForegroundColor Yellow
$dirsToClean = @(
    "node_modules",
    "packages\backend\node_modules",
    "packages\frontend\node_modules",
    "packages\shared\node_modules",
    "package-lock.json",
    "packages\backend\package-lock.json",
    "packages\frontend\package-lock.json",
    "packages\shared\package-lock.json"
)

foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Write-Host "   Removing $dir..." -ForegroundColor Gray
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 2. Clear npm cache
Write-Host "`n[2/6] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# 3. Install Windows build tools if needed
Write-Host "`n[3/6] Checking for Windows build tools..." -ForegroundColor Yellow
$hasVSBuildTools = Get-Command "msbuild.exe" -ErrorAction SilentlyContinue
if (-not $hasVSBuildTools) {
    Write-Host "   Installing Windows build tools..." -ForegroundColor Red
    Write-Host "   This may require administrator privileges" -ForegroundColor Red
    npm install --global windows-build-tools@5.2.2
} else {
    Write-Host "   Build tools already installed" -ForegroundColor Green
}

# 4. Install base dependencies
Write-Host "`n[4/6] Installing base dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "   Base installation failed, continuing anyway..." -ForegroundColor Red
}

# 5. Fix native modules specifically for Windows
Write-Host "`n[5/6] Installing native modules for Windows..." -ForegroundColor Yellow

# Install canvas for Windows
Write-Host "   Installing canvas..." -ForegroundColor Gray
Set-Location -Path "packages\backend"
npm install canvas@latest --force
Set-Location -Path "..\.."

# Install sharp for Windows
Write-Host "   Installing sharp..." -ForegroundColor Gray
npm install sharp@latest --platform=win32 --arch=x64 --force

# Install sqlite3 for Windows
Write-Host "   Installing sqlite3..." -ForegroundColor Gray
Set-Location -Path "packages\backend"
npm uninstall sqlite3
npm install sqlite3@5.1.6 --build-from-source --force
Set-Location -Path "..\.."

# Install typeorm dependencies
Write-Host "   Installing TypeORM dependencies..." -ForegroundColor Gray
Set-Location -Path "packages\backend"
npm install reflect-metadata --save
Set-Location -Path "..\.."

# 6. Build shared package
Write-Host "`n[6/6] Building shared package..." -ForegroundColor Yellow
npx lerna run build --scope=@packing/shared

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=====================================" -ForegroundColor Green
    Write-Host " Installation Complete!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Create a .env file in packages\backend\ with your RIVHIT API token" -ForegroundColor White
    Write-Host "2. Run the application:" -ForegroundColor White
    Write-Host "   npx lerna run dev" -ForegroundColor Yellow
    Write-Host "`nOr run services separately:" -ForegroundColor White
    Write-Host "   Backend:  npx lerna run dev --scope=@packing/backend" -ForegroundColor Gray
    Write-Host "   Frontend: npx lerna run dev --scope=@packing/frontend" -ForegroundColor Gray
} else {
    Write-Host "`n=====================================" -ForegroundColor Red
    Write-Host " Build failed, but modules installed" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "`nTry running the services anyway:" -ForegroundColor Yellow
    Write-Host "   npx lerna run dev" -ForegroundColor White
}

# Create .env file if it doesn't exist
$envPath = "packages\backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "`nCreating default .env file..." -ForegroundColor Yellow
    $envContent = @"
# Backend Configuration
NODE_ENV=development
PORT=3001

# RIVHIT API Configuration
RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
RIVHIT_API_TOKEN=YOUR_API_TOKEN_HERE
RIVHIT_TEST_MODE=true
RIVHIT_READ_ONLY=true

# Database Configuration
DB_TYPE=sqlite
DB_DATABASE=./data.sqlite

# Printer Configuration
PRINTER_CONNECTION_TYPE=usb
PRINTER_PORT=USB001
USE_WINLABEL=false

# Logging
LOG_LEVEL=info
"@
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "   Created $envPath - Please add your RIVHIT API token!" -ForegroundColor Yellow
}