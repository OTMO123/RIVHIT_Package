# Print with GoLabel PowerShell Script

# Create test EZPX content
$ezpx = @'
<?xml version="1.0" encoding="utf-8"?>
<labels _FORMAT="godex" _QUANTITY="1" _PRINTNAME="GoDEX">
  <label _WIDTH="50" _HEIGHT="30" _SPEED="2" _DENSITY="8">
    <text>
      <x>10</x>
      <y>10</y>
      <data>RIVHIT GoLabel Test</data>
      <fontName>Arial</fontName>
      <fontSize>24</fontSize>
      <bold>true</bold>
    </text>
    <barcode>
      <x>10</x>
      <y>60</y>
      <type>Code128</type>
      <data>123456789</data>
      <height>100</height>
      <textEnabled>true</textEnabled>
    </barcode>
  </label>
</labels>
'@

# Save to temp file
$tempFile = "$env:TEMP\golabel_test_$(Get-Date -Format 'yyyyMMdd_HHmmss').ezpx"
$ezpx | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Created EZPX file: $tempFile" -ForegroundColor Green

# Open with GoLabel
$golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"

Write-Host "Opening in GoLabel..." -ForegroundColor Yellow
Start-Process -FilePath $golabelPath -ArgumentList "`"$tempFile`"" -Wait

Write-Host "GoLabel closed" -ForegroundColor Green

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue
Write-Host "Cleaned up temp file" -ForegroundColor Gray