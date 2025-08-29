# Test printing through API
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Testing Print through API" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test 1: Test simple endpoint
Write-Host "`n[1] Testing /api/print/test-simple endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/print/test-simple" -Method POST -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Test 2: Test with custom EZPL
Write-Host "`n[2] Testing custom EZPL command..." -ForegroundColor Yellow

$ezplCommand = @"
^Q50,3
^W80
^H10
^P1
^S2
^AD
^C1
^R0
~Q+0
^O0
^D0
^E12
~R200
^L
Dy2-me-dd
Th:m:s
AB,10,10,1,1,0,0E,API Test Print
AB,10,50,1,1,0,0E,Backend Service Test
AB,10,90,1,1,0,0E,Time: $(Get-Date -Format "HH:mm:ss")
BA,10,130,2,5,80,0,1,9876543210123
AB,10,220,1,1,0,0E,9876543210123
E
"@

$body = @{
    command = $ezplCommand
    format = "ezpl"
} | ConvertTo-Json

try {
    # First check if we have a raw command endpoint
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/print/raw" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Green
    $response.Content
} catch {
    Write-Host "Raw endpoint not available, trying test endpoint..." -ForegroundColor Yellow
    
    # Try the test endpoint with content
    $testBody = @{
        printerName = "Auto"
        testMode = $true
        content = @{
            orderNumber = "API-TEST-001"
            customerName = "API Test Customer"
            items = @(
                @{
                    name = "Test Item via API"
                    quantity = 1
                    barcode = "1234567890123"
                }
            )
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/print/test" -Method POST -Body $testBody -ContentType "application/json"
        Write-Host "Response:" -ForegroundColor Green
        $response.Content
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host " Test Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan