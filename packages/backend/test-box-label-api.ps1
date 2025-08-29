# Test Box Label GoLabel API
Write-Host "Testing Box Label GoLabel API" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001/api/print/box-label/golabel"

# Test data matching the screenshot
$boxData = @{
    orderId = "39798"
    boxNumber = 2
    totalBoxes = 2
    customerName = "מעדני לאון יוליה"
    customerCity = ""
    region = "north2"
    items = @(
        @{
            nameHebrew = "בלינצ'ס במילוי בשר"
            nameRussian = "блинчики с мясом"
            quantity = 5
            barcode = "7290011505853"
        },
        @{
            nameHebrew = "בלינצ'ס במילוי חזרתן"
            nameRussian = "блинчики с хреном"
            quantity = 5
            barcode = "7290011505891"
        },
        @{
            nameHebrew = "בלינצ'ס במילוי תפו`"א עם פטריות"
            nameRussian = "блинчики с карт. с грибами"
            quantity = 5
            barcode = "7290011505877"
        }
    )
}

# Convert to JSON
$jsonBody = $boxData | ConvertTo-Json -Depth 10

Write-Host "`nRequest body:" -ForegroundColor Yellow
Write-Host $jsonBody

Write-Host "`nSending request to: $baseUrl" -ForegroundColor Yellow

try {
    # Send POST request
    $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $jsonBody -ContentType "application/json"
    
    Write-Host "`nResponse:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
    if ($response.success) {
        Write-Host "`nSuccess! Label generated:" -ForegroundColor Green
        Write-Host "Filename: $($response.filename)" -ForegroundColor White
        Write-Host "Path: $($response.filepath)" -ForegroundColor White
        
        # Try to open in GoLabel
        if ($response.filepath -and (Test-Path $response.filepath)) {
            Write-Host "`nOpening in GoLabel..." -ForegroundColor Cyan
            $golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
            
            if (Test-Path $golabelPath) {
                Start-Process -FilePath $golabelPath -ArgumentList "`"$($response.filepath)`""
                Write-Host "GoLabel started with label file" -ForegroundColor Green
            } else {
                Write-Host "GoLabel not found at: $golabelPath" -ForegroundColor Yellow
            }
        }
        
        # Save content to file if returned
        if ($response.content) {
            $backupFile = "box_label_api_test_$(Get-Date -Format 'yyyyMMdd_HHmmss').ezpx"
            $response.content | Out-File -FilePath $backupFile -Encoding UTF8
            Write-Host "`nLabel content saved to: $backupFile" -ForegroundColor Green
        }
    }
    else {
        Write-Host "`nFailed to generate label" -ForegroundColor Red
    }
}
catch {
    Write-Host "`nError calling API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Check if server is running
    Write-Host "`nIs the backend server running? (npm run dev --scope=@packing/backend)" -ForegroundColor Yellow
}