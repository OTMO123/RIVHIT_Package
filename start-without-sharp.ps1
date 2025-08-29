# Start application without sharp module
Write-Host "Starting RIVHIT Package without image processing..." -ForegroundColor Green

# Set environment variable to skip sharp
$env:SKIP_SHARP = "true"

# Start frontend in new window
Write-Host "`nStarting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx lerna run dev --scope=@packing/frontend"

# Give frontend time to start
Start-Sleep -Seconds 5

# Start backend without sharp
Write-Host "`nStarting backend (without image processing)..." -ForegroundColor Yellow

# Create a temporary start script that skips sharp
$tempScript = @'
const path = require('path');

// Mock sharp module
require.cache[require.resolve('sharp')] = {
  exports: {
    __esModule: true,
    default: () => ({
      resize: () => ({ toBuffer: async () => Buffer.from('') }),
      metadata: async () => ({ width: 100, height: 100 })
    })
  }
};

// Now start the server
require('./packages/backend/dist/src/server.js');
'@

$tempScript | Out-File -FilePath "start-backend-temp.js" -Encoding UTF8

# Build backend first
Write-Host "Building backend..." -ForegroundColor Gray
npx lerna run build --scope=@packing/backend

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Gray
node start-backend-temp.js

# Cleanup
Remove-Item "start-backend-temp.js" -ErrorAction SilentlyContinue