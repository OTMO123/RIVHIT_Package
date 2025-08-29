# GoLabel Auto-Configuration Script
# This script configures GoLabel without needing hot folder feature

Write-Host "GoLabel Alternative Configuration" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check GoLabel installation
$golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
if (!(Test-Path $golabelPath)) {
    Write-Host "ERROR: GoLabel not found at $golabelPath" -ForegroundColor Red
    exit 1
}

# Check for GoLabel config files
$configPaths = @(
    "$env:APPDATA\Godex\GoLabel",
    "$env:LOCALAPPDATA\Godex\GoLabel", 
    "$env:ProgramData\Godex\GoLabel",
    "C:\Program Files (x86)\Godex\GoLabel II\Config"
)

Write-Host "Searching for GoLabel configuration..." -ForegroundColor Yellow

$foundConfig = $false
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        Write-Host "Found config directory: $path" -ForegroundColor Green
        Get-ChildItem $path -Recurse | Where-Object { $_.Extension -in @('.ini', '.xml', '.config') } | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Gray
        }
        $foundConfig = $true
    }
}

if (!$foundConfig) {
    Write-Host "No config directories found" -ForegroundColor Yellow
}

# Alternative: Create a Windows automation script
Write-Host ""
Write-Host "Creating automation script..." -ForegroundColor Yellow

$automationScript = @'
' GoLabel Automation Script
' This opens GoLabel and sends an EZPX file for printing

Set WshShell = CreateObject("WScript.Shell")
Set objArgs = WScript.Arguments

If objArgs.Count = 0 Then
    WScript.Echo "Usage: cscript print-with-golabel.vbs <ezpx-file-path>"
    WScript.Quit 1
End If

ezpxFile = objArgs(0)

' Start GoLabel with the file
WshShell.Run """C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"" """ & ezpxFile & """", 1, False

' Wait for GoLabel to open
WScript.Sleep 3000

' Send Ctrl+P to print
WshShell.SendKeys "^p"
WScript.Sleep 1000

' Send Enter to confirm
WshShell.SendKeys "{ENTER}"
WScript.Sleep 2000

' Optional: Close GoLabel after printing
' WshShell.SendKeys "%{F4}"

WScript.Echo "Print command sent"
'@

$automationScript | Out-File -FilePath "print-with-golabel.vbs" -Encoding ASCII
Write-Host "Created: print-with-golabel.vbs" -ForegroundColor Green

# Create a direct printing PowerShell script
$directPrintScript = @'
param(
    [Parameter(Mandatory=$true)]
    [string]$EzpxFile
)

# Method 1: Try opening with default print action
try {
    Start-Process -FilePath $EzpxFile -Verb Print -Wait
    Write-Host "Print command sent via Windows" -ForegroundColor Green
} catch {
    Write-Host "Direct print failed, opening GoLabel..." -ForegroundColor Yellow
    
    # Method 2: Open with GoLabel
    $golabel = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
    Start-Process -FilePath $golabel -ArgumentList """$EzpxFile""" -Wait
}
'@

$directPrintScript | Out-File -FilePath "direct-print.ps1" -Encoding UTF8
Write-Host "Created: direct-print.ps1" -ForegroundColor Green

# Create a Registry-based association script
Write-Host ""
Write-Host "Creating registry association script..." -ForegroundColor Yellow

$regScript = @'
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Classes\.ezpx]
@="GoLabel.Document"

[HKEY_CURRENT_USER\Software\Classes\GoLabel.Document]
@="GoLabel Document"

[HKEY_CURRENT_USER\Software\Classes\GoLabel.Document\shell\print\command]
@="\"C:\\Program Files (x86)\\Godex\\GoLabel II\\GoLabel.exe\" \"%1\" /PRINT"
'@

$regScript | Out-File -FilePath "golabel-print-association.reg" -Encoding Unicode
Write-Host "Created: golabel-print-association.reg" -ForegroundColor Green

Write-Host ""
Write-Host "Alternative Solutions Created:" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""
Write-Host "Option 1: Windows Automation (Recommended)" -ForegroundColor Yellow
Write-Host "  Usage: cscript print-with-golabel.vbs <your-file.ezpx>" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: PowerShell Direct Print" -ForegroundColor Yellow  
Write-Host "  Usage: .\direct-print.ps1 -EzpxFile <your-file.ezpx>" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Registry Association (One-time setup)" -ForegroundColor Yellow
Write-Host "  1. Double-click golabel-print-association.reg" -ForegroundColor White
Write-Host "  2. Accept the registry change" -ForegroundColor White
Write-Host "  3. Right-click any .ezpx file -> Print" -ForegroundColor White
Write-Host ""

# Test if we can find printer settings
Write-Host "Checking for printer settings..." -ForegroundColor Yellow

$printerFiles = @(
    "$env:APPDATA\Godex\*.ini",
    "$env:LOCALAPPDATA\Godex\*.xml",
    "C:\Program Files (x86)\Godex\GoLabel II\*.ini"
)

foreach ($pattern in $printerFiles) {
    Get-ChildItem $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Found: $($_.FullName)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Try the automation script with a test file" -ForegroundColor White
Write-Host "2. Configure your default printer in Windows" -ForegroundColor White
Write-Host "3. Test the integration with: node test-golabel-alternative.js" -ForegroundColor White