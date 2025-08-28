# PowerShell script to send test print to USB printer
param(
    [string]$PrinterName = "GoDEX ZX420i"
)

Write-Host "🔌 Testing USB printer: $PrinterName" -ForegroundColor Green

try {
    # Check if printer exists
    $printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
    if (!$printer) {
        Write-Host "❌ Printer '$PrinterName' not found" -ForegroundColor Red
        Write-Host "Available printers:" -ForegroundColor Yellow
        Get-Printer | Select-Object Name, DriverName, PortName | Format-Table
        exit 1
    }

    Write-Host "✅ Printer found: $($printer.Name)" -ForegroundColor Green
    Write-Host "📍 Port: $($printer.PortName)" -ForegroundColor Cyan
    Write-Host "🖨️ Status: $($printer.PrinterStatus)" -ForegroundColor Cyan

    # Send EZPL test command directly to printer
    $ezplCommand = @"
N
q609
Q203,26
B5,26,0,1,3,6,152,B,"TEST USB"
A310,26,0,3,1,1,N,"USB Test Print"
A310,60,0,3,1,1,N,"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
A310,94,0,3,1,1,N,"Serial: 1930066B"
P1,1

"@

    # Create temporary file with EZPL commands
    $tempFile = [System.IO.Path]::GetTempFileName() + ".ezpl"
    $ezplCommand | Out-File -FilePath $tempFile -Encoding ASCII

    Write-Host "📄 Created temp file: $tempFile" -ForegroundColor Yellow
    Write-Host "🖨️ Sending EZPL commands to printer..." -ForegroundColor Green

    # Try different print methods
    try {
        # Method 1: Direct file print to printer port
        if ($printer.PortName -match "USB") {
            Write-Host "💫 Method 1: Direct USB print..." -ForegroundColor Cyan
            Copy-Item $tempFile -Destination $printer.PortName -ErrorAction Stop
            Write-Host "✅ Direct USB print successful" -ForegroundColor Green
        } else {
            throw "Not a USB port"
        }
    } catch {
        try {
            # Method 2: Use Print-TestPage
            Write-Host "💫 Method 2: Windows test page..." -ForegroundColor Cyan
            Print-TestPage -Name $PrinterName -ErrorAction Stop
            Write-Host "✅ Windows test page sent" -ForegroundColor Green
        } catch {
            # Method 3: Use Start-Process to open file
            Write-Host "💫 Method 3: Start-Process print..." -ForegroundColor Cyan
            Start-Process -FilePath $tempFile -Verb Print -Wait -ErrorAction Stop
            Write-Host "✅ Start-Process print successful" -ForegroundColor Green
        }
    }

    # Clean up
    Remove-Item $tempFile -ErrorAction SilentlyContinue

    Write-Host "🎉 Test print completed successfully!" -ForegroundColor Green
    return @{
        success = $true
        printer = $printer.Name
        port = $printer.PortName
        status = $printer.PrinterStatus
        message = "Test print sent successfully"
    } | ConvertTo-Json

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    return @{
        success = $false
        error = $_.Exception.Message
        printer = $PrinterName
    } | ConvertTo-Json
}