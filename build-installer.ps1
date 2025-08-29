# Build RIVHIT installer for distribution
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Building RIVHIT Installer" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Build all packages
Write-Host "`n[1/4] Building all packages..." -ForegroundColor Yellow
npm run build

# 2. Package Electron app
Write-Host "`n[2/4] Packaging Electron application..." -ForegroundColor Yellow
cd packages/frontend

# Create electron-builder config if not exists
$builderConfig = @{
    "appId" = "com.rivhit.packingsystem"
    "productName" = "RIVHIT Packing System"
    "directories" = @{
        "output" = "dist-installer"
    }
    "files" = @(
        "dist/**/*",
        "node_modules/**/*",
        "!node_modules/**/test/**",
        "!**/*.map"
    )
    "extraResources" = @(
        @{
            "from" = "../backend/dist"
            "to" = "backend"
        },
        @{
            "from" = "../backend/node_modules/sqlite3/lib/binding"
            "to" = "backend/sqlite3-binding"
        }
    )
    "win" = @{
        "target" = @("nsis", "portable")
        "icon" = "assets/icons/icon.ico"
    }
    "nsis" = @{
        "oneClick" = $false
        "allowToChangeInstallationDirectory" = $true
        "createDesktopShortcut" = $true
        "createStartMenuShortcut" = $true
        "shortcutName" = "RIVHIT Packing System"
    }
}

$builderConfig | ConvertTo-Json -Depth 10 | Out-File "electron-builder.json" -Encoding UTF8

# Build installer
Write-Host "`n[3/4] Creating installer..." -ForegroundColor Yellow
npx electron-builder --win

# 3. Create portable version
Write-Host "`n[4/4] Creating portable version..." -ForegroundColor Yellow
npx electron-builder --win portable

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`nOutput files:" -ForegroundColor Cyan
Write-Host "- Installer: packages\frontend\dist-installer\RIVHIT Packing System Setup.exe" -ForegroundColor White
Write-Host "- Portable: packages\frontend\dist-installer\RIVHIT Packing System.exe" -ForegroundColor White

Write-Host "`nThese files include everything needed to run on any Windows PC!" -ForegroundColor Green
Write-Host "No Visual Studio or other tools required for end users." -ForegroundColor Yellow

cd ../..