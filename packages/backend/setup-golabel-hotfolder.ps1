# GoLabel Hot Folder Setup Script
# This script configures GoLabel to watch a folder for automatic printing

Write-Host "GoLabel Hot Folder Setup" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""

# Create hot folder directory
$hotFolderPath = "C:\GoLabelHotFolder"
$processedPath = "$hotFolderPath\Processed"
$errorPath = "$hotFolderPath\Error"

Write-Host "Creating hot folder directories..." -ForegroundColor Yellow

# Create directories
New-Item -Path $hotFolderPath -ItemType Directory -Force | Out-Null
New-Item -Path $processedPath -ItemType Directory -Force | Out-Null
New-Item -Path $errorPath -ItemType Directory -Force | Out-Null

Write-Host "Created directories:" -ForegroundColor Green
Write-Host "  Hot Folder: $hotFolderPath" -ForegroundColor White
Write-Host "  Processed: $processedPath" -ForegroundColor White
Write-Host "  Error: $errorPath" -ForegroundColor White
Write-Host ""

# Create README file
$readme = @"
GoLabel Hot Folder
==================

This folder is monitored by GoLabel for automatic printing.

How to use:
1. Copy EZPX files to this folder
2. GoLabel will automatically process and print them
3. Successfully printed files move to: Processed\
4. Failed files move to: Error\

Setup in GoLabel:
1. Open GoLabel
2. Go to Tools -> Options -> Hot Folder
3. Enable Hot Folder
4. Set folder path to: $hotFolderPath
5. Set processed folder to: $processedPath
6. Set error folder to: $errorPath
7. Select your printer
8. Click OK

Test:
Copy any .ezpx file to this folder to test printing.
"@

$readme | Out-File -FilePath "$hotFolderPath\README.txt" -Encoding UTF8

# Create test EZPX file
$testEzpx = @"
<?xml version="1.0" encoding="utf-8"?>
<labels _FORMAT="godex" _QUANTITY="1">
  <label _WIDTH="50" _HEIGHT="30" _SPEED="2" _DENSITY="8">
    <text>
      <x>10</x>
      <y>10</y>
      <data>Hot Folder Test</data>
      <fontName>Arial</fontName>
      <fontSize>18</fontSize>
    </text>
    <text>
      <x>10</x>
      <y>40</y>
      <data>Setup Complete!</data>
      <fontName>Arial</fontName>
      <fontSize>14</fontSize>
    </text>
    <text>
      <x>10</x>
      <y>70</y>
      <data>$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</data>
      <fontName>Arial</fontName>
      <fontSize>12</fontSize>
    </text>
    <barcode>
      <x>10</x>
      <y>90</y>
      <type>Code128</type>
      <data>HOT-FOLDER-TEST</data>
      <height>50</height>
    </barcode>
  </label>
</labels>
"@

$testEzpx | Out-File -FilePath "$hotFolderPath\test_setup.ezpx.ready" -Encoding UTF8

Write-Host "Manual Configuration Required:" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open GoLabel" -ForegroundColor White
Write-Host "2. Go to: Tools -> Options -> Hot Folder" -ForegroundColor White
Write-Host "3. Enable 'Use Hot Folder'" -ForegroundColor White
Write-Host "4. Set Hot Folder Path to: $hotFolderPath" -ForegroundColor White
Write-Host "5. Set Processed Folder to: $processedPath" -ForegroundColor White
Write-Host "6. Set Error Folder to: $errorPath" -ForegroundColor White
Write-Host "7. Select your printer (GoDEX ZX420i)" -ForegroundColor White
Write-Host "8. Set file filter to: *.ezpx" -ForegroundColor White
Write-Host "9. Click OK" -ForegroundColor White
Write-Host ""
Write-Host "Test file created: test_setup.ezpx.ready" -ForegroundColor Green
Write-Host "Rename it to test_setup.ezpx to trigger printing" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to open GoLabel..."
Read-Host

# Try to open GoLabel
$golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
if (Test-Path $golabelPath) {
    Start-Process $golabelPath
} else {
    Write-Host "Could not find GoLabel at: $golabelPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green