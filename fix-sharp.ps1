# Fix sharp module issue
Write-Host "Fixing sharp module issue..." -ForegroundColor Green

# Install sharp for Windows x64
Write-Host "`nInstalling sharp for Windows x64..." -ForegroundColor Yellow
npm install --os=win32 --cpu=x64 sharp --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nTrying alternative installation method..." -ForegroundColor Yellow
    
    # Remove sharp and reinstall
    npm uninstall sharp
    npm install sharp@latest --force
}

Write-Host "`nRebuilding sharp module..." -ForegroundColor Yellow
cd node_modules\sharp
npm rebuild
cd ..\..

Write-Host "`nSharp module fix completed!" -ForegroundColor Green
Write-Host "`nNow you can run the application:" -ForegroundColor Cyan
Write-Host "npx lerna run dev" -ForegroundColor White