# GoLabel Print Test PowerShell Script

Write-Host "GoLabel Print Test" -ForegroundColor Green
Write-Host ""

# GoLabel path
$golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"

# Check if GoLabel exists
if (!(Test-Path $golabelPath)) {
    Write-Host "ERROR: GoLabel not found at: $golabelPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found GoLabel at: $golabelPath" -ForegroundColor Green

# Create test EZPX
$ezpx = @'
<?xml version="1.0" encoding="utf-8"?>
<labels _FORMAT="godex">
  <label _WIDTH="50" _HEIGHT="30" _QUANTITY="1" _SPEED="2" _DENSITY="8">
    <text>
      <x>10</x>
      <y>10</y>
      <data>PowerShell Test Label</data>
      <fontName>Arial</fontName>
      <fontSize>20</fontSize>
    </text>
    <barcode>
      <x>10</x>
      <y>50</y>
      <type>Code128</type>
      <data>PS-TEST-123</data>
      <height>80</height>
    </barcode>
  </label>
</labels>
'@

# Save EZPX file
$ezpxFile = Join-Path $PSScriptRoot "ps_test_$(Get-Date -Format 'HHmmss').ezpx"
$ezpx | Out-File -FilePath $ezpxFile -Encoding UTF8
Write-Host "Created EZPX file: $ezpxFile" -ForegroundColor Yellow

# Method 1: Open GoLabel with file
Write-Host ""
Write-Host "Method 1: Opening GoLabel with file..." -ForegroundColor Cyan
& $golabelPath $ezpxFile

Write-Host ""
Write-Host "If GoLabel opened:" -ForegroundColor Yellow
Write-Host "  1. You should see your label" -ForegroundColor White
Write-Host "  2. Press Ctrl+P or File->Print to print" -ForegroundColor White
Write-Host "  3. Close GoLabel when done" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to try Method 2..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Method 2: Try with print parameter
Write-Host ""
Write-Host "Method 2: Trying with /PRINT parameter..." -ForegroundColor Cyan
& $golabelPath $ezpxFile /PRINT

Write-Host ""
Write-Host "Files created:" -ForegroundColor Green
Write-Host "  - $ezpxFile" -ForegroundColor White

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Green