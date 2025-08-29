# Start backend without database temporarily
Write-Host "Starting backend without database..." -ForegroundColor Yellow

# Set environment variable to skip database
$env:SKIP_DB = "true"
$env:NODE_ENV = "development"

# Navigate to backend directory
Set-Location -Path "packages\backend"

# Build TypeScript files first
Write-Host "`nBuilding backend..." -ForegroundColor Gray
npx tsc --build

# Start the backend
Write-Host "`nStarting backend server on port 3001..." -ForegroundColor Green
Write-Host "Note: Database features are disabled" -ForegroundColor Yellow

# Start with ts-node-dev
npx ts-node-dev --respawn --transpile-only src/server.ts