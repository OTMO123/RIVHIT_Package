# Test direct printing to Godex ZX420i
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Testing Direct Print to Godex" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$printerName = "Godex ZX420i"
$printerPort = "USB002"

# Test 1: Simple EZPL test
Write-Host "`n[1] Testing EZPL format (Godex native)..." -ForegroundColor Yellow

$ezplTest = @"
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
AB,10,10,1,1,0,0E,TEST EZPL
AB,10,50,1,1,0,0E,This is a test
AB,10,90,1,1,0,0E,Godex ZX420i
AB,10,130,1,1,0,0E,USB Print Test
E
"@

$tempFile1 = "$env:TEMP\test_ezpl.prn"
$ezplTest | Out-File -FilePath $tempFile1 -Encoding ASCII -NoNewline

Write-Host "Sending EZPL test to printer..."
$result1 = & cmd /c "copy /B `"$tempFile1`" `"\\%COMPUTERNAME%\$printerName`"" 2>&1
Write-Host "Result: $result1" -ForegroundColor $(if($LASTEXITCODE -eq 0){"Green"}else{"Red"})
Remove-Item $tempFile1 -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Test 2: Simple ZPL test (for comparison)
Write-Host "`n[2] Testing ZPL format (Zebra emulation)..." -ForegroundColor Yellow

$zplTest = @"
^XA
^FO50,50^A0N,50,50^FDTest ZPL^FS
^FO50,120^A0N,30,30^FDThis is a test^FS
^FO50,170^A0N,30,30^FDGodex ZX420i^FS
^FO50,220^A0N,30,30^FDUSB Print Test^FS
^XZ
"@

$tempFile2 = "$env:TEMP\test_zpl.prn"
$zplTest | Out-File -FilePath $tempFile2 -Encoding ASCII -NoNewline

Write-Host "Sending ZPL test to printer..."
$result2 = & cmd /c "copy /B `"$tempFile2`" `"\\%COMPUTERNAME%\$printerName`"" 2>&1
Write-Host "Result: $result2" -ForegroundColor $(if($LASTEXITCODE -eq 0){"Green"}else{"Red"})
Remove-Item $tempFile2 -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Test 3: EZPL with barcode
Write-Host "`n[3] Testing EZPL with barcode..." -ForegroundColor Yellow

$ezplBarcode = @"
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
AB,10,10,1,1,0,0E,Product Label
AB,10,50,1,1,0,0E,Item: Test Product
AB,10,90,1,1,0,0E,Qty: 1
BA,10,130,2,5,80,0,1,1234567890123
AB,10,220,1,1,0,0E,1234567890123
E
"@

$tempFile3 = "$env:TEMP\test_ezpl_barcode.prn"
$ezplBarcode | Out-File -FilePath $tempFile3 -Encoding ASCII -NoNewline

Write-Host "Sending EZPL with barcode to printer..."
$result3 = & cmd /c "copy /B `"$tempFile3`" `"\\%COMPUTERNAME%\$printerName`"" 2>&1
Write-Host "Result: $result3" -ForegroundColor $(if($LASTEXITCODE -eq 0){"Green"}else{"Red"})
Remove-Item $tempFile3 -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Test 4: Direct to port test
Write-Host "`n[4] Testing direct to port ($printerPort)..." -ForegroundColor Yellow

$directTest = @"
^Q50,3
^W80
^H10
^P1
^S2
^L
AB,10,10,1,1,0,0E,Direct Port Test
AB,10,50,1,1,0,0E,$printerPort
E
"@

$tempFile4 = "$env:TEMP\test_direct.prn"
$directTest | Out-File -FilePath $tempFile4 -Encoding ASCII -NoNewline

Write-Host "Sending directly to port $printerPort..."
try {
    $result4 = & cmd /c "copy /B `"$tempFile4`" `"$printerPort`"" 2>&1
    Write-Host "Result: $result4" -ForegroundColor $(if($LASTEXITCODE -eq 0){"Green"}else{"Red"})
} catch {
    Write-Host "Direct port access failed: $_" -ForegroundColor Red
}
Remove-Item $tempFile4 -Force -ErrorAction SilentlyContinue

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host " Test Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`nCheck your printer output to see which format worked!" -ForegroundColor Yellow
Write-Host "- EZPL should work natively on Godex" -ForegroundColor White
Write-Host "- ZPL might work if Godex is in ZPL emulation mode" -ForegroundColor White