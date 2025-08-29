# Test GoLabel Integration from Windows
# Run this script in PowerShell on Windows

Write-Host "Starting GoLabel Windows Test..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location "C:\Users\aurik\Desktop\RivHit-Integration\RIVHIT_Package\packages\backend"

# Set environment variables
$env:USE_GOLABEL = "true"
$env:GOLABEL_PATH = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
$env:GODEX_SDK_PATH = "C:\Program Files (x86)\Godex\GoLabel II"
$env:GOLABEL_INTERFACE = "USB"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   GOLABEL_PATH: $env:GOLABEL_PATH"
Write-Host "   GODEX_SDK_PATH: $env:GODEX_SDK_PATH"
Write-Host "   GOLABEL_INTERFACE: $env:GOLABEL_INTERFACE"
Write-Host ""

# Test 1: Check GoLabel existence
Write-Host "Test 1: Checking GoLabel installation..." -ForegroundColor Cyan
if (Test-Path $env:GOLABEL_PATH) {
    Write-Host "GoLabel found!" -ForegroundColor Green
    
    # Get GoLabel version
    try {
        $versionInfo = (Get-Item $env:GOLABEL_PATH).VersionInfo
        Write-Host "   Version: $($versionInfo.FileVersion)" -ForegroundColor Gray
    } catch {
        Write-Host "   Could not get version info" -ForegroundColor Yellow
    }
} else {
    Write-Host "GoLabel not found!" -ForegroundColor Red
    exit 1
}

# Test 2: Check SDK DLL
Write-Host ""
Write-Host "Test 2: Checking SDK DLL..." -ForegroundColor Cyan
$dllPath = Join-Path $env:GODEX_SDK_PATH "EZio32.dll"
if (Test-Path $dllPath) {
    Write-Host "EZio32.dll found!" -ForegroundColor Green
} else {
    Write-Host "EZio32.dll not found!" -ForegroundColor Red
}

# Test 3: Run the simple test
Write-Host ""
Write-Host "Test 3: Running JavaScript test..." -ForegroundColor Cyan
node test-golabel-simple.js

# Test 4: Create and print a test label
Write-Host ""
Write-Host "Test 4: Creating test label..." -ForegroundColor Cyan

# Create test print script content
$testPrintContent = @"
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

console.log('Creating test label...');

// Create EZPX content
const ezpxContent = `<?xml version="1.0" encoding="utf-8"?>
<labels _FORMAT="godex">
  <label _WIDTH="50" _HEIGHT="30" _QUANTITY="1" _SPEED="2" _DENSITY="8">
    <barcode>
      <x>50</x>
      <y>50</y>
      <type>Code128</type>
      <data>TEST123456</data>
      <height>100</height>
      <textEnabled>true</textEnabled>
      <textAbove>false</textAbove>
    </barcode>
    <text>
      <x>50</x>
      <y>200</y>
      <data>GoLabel Test Print</data>
      <fontName>Arial</fontName>
      <fontSize>24</fontSize>
    </text>
  </label>
</labels>`;

// Save EZPX file
const ezpxPath = path.join(__dirname, 'test_print.ezpx');
fs.writeFileSync(ezpxPath, ezpxContent, 'utf8');
console.log('EZPX file created:', ezpxPath);

// Try to print using GoLabel
const golabelPath = process.env.GOLABEL_PATH || 'C:\\Program Files (x86)\\Godex\\GoLabel II\\GoLabel.exe';

console.log('Attempting to print with GoLabel...');
console.log('GoLabel path:', golabelPath);

const golabel = spawn(golabelPath, ['/OPEN', ezpxPath, '/PRINT'], {
    shell: true
});

golabel.on('close', (code) => {
    console.log(`GoLabel exited with code \${code}`);
    if (code === 0) {
        console.log('Print command sent successfully!');
    } else {
        console.log('Print command failed');
    }
    
    // Clean up
    setTimeout(() => {
        try {
            fs.unlinkSync(ezpxPath);
            console.log('Cleaned up temporary file');
        } catch (e) {}
    }, 2000);
});
"@

# Save and run the test print script
$testPrintContent | Out-File -FilePath "test-print-label.js" -Encoding UTF8
Write-Host "Running print test..." -ForegroundColor Yellow
node test-print-label.js

# Cleanup
Start-Sleep -Seconds 5
if (Test-Path "test-print-label.js") {
    Remove-Item "test-print-label.js"
}

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "If no label printed, check:" -ForegroundColor Yellow
Write-Host "   1. Printer is connected and powered on"
Write-Host "   2. Printer is selected as default in Windows"
Write-Host "   3. GoLabel has the correct printer configured"
Write-Host ""
Write-Host "To configure printer in GoLabel:" -ForegroundColor Yellow
Write-Host "   1. Open GoLabel manually"
Write-Host "   2. Go to File -> Printer Setup"
Write-Host "   3. Select your Godex printer"
Write-Host "   4. Click OK and close GoLabel"