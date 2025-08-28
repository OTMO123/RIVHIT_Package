# PowerShell script to detect USB printers
# Проверяет USB принтеры подключенные к системе

param(
    [switch]$Detailed = $false
)

Write-Host "🔍 Checking USB printers..." -ForegroundColor Green

try {
    # 1. Проверка всех принтеров в системе
    Write-Host "`n📋 All System Printers:" -ForegroundColor Yellow
    $allPrinters = Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Published
    $allPrinters | Format-Table -AutoSize

    # 2. Проверка USB портов
    Write-Host "`n🔌 USB Printer Ports:" -ForegroundColor Yellow
    $usbPorts = Get-PrinterPort | Where-Object { $_.Name -match "USB|COM|LPT" }
    $usbPorts | Select-Object Name, Description, MonitorName | Format-Table -AutoSize

    # 3. Поиск GoDEX принтеров
    Write-Host "`n🎯 GoDEX Printers:" -ForegroundColor Green
    $godexPrinters = Get-Printer | Where-Object { $_.Name -match "GoDEX|ZX420" }
    
    if ($godexPrinters) {
        $godexPrinters | Select-Object Name, DriverName, PortName, PrinterStatus | Format-Table -AutoSize
        
        # Проверим статус каждого GoDEX принтера
        foreach ($printer in $godexPrinters) {
            Write-Host "🔍 Testing printer: $($printer.Name)" -ForegroundColor Cyan
            
            # Тестовая печать (без физической печати)
            try {
                $testJob = Print-TestPage -Name $printer.Name -WhatIf
                Write-Host "  ✅ Printer $($printer.Name) is ready" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Printer $($printer.Name) error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ No GoDEX printers found" -ForegroundColor Red
    }

    # 4. Проверка WMI для детальной информации о USB
    if ($Detailed) {
        Write-Host "`n💾 USB Device Details (WMI):" -ForegroundColor Yellow
        $usbDevices = Get-WmiObject -Class Win32_USBControllerDevice | 
            ForEach-Object { [wmi]$_.Dependent } |
            Where-Object { $_.Description -match "print|label" } |
            Select-Object Description, DeviceID, Manufacturer, Status
        
        $usbDevices | Format-Table -AutoSize
    }

    # 5. Проверка через System.Management
    Write-Host "`n📡 Printer Connections:" -ForegroundColor Yellow
    $printerConnections = Get-WmiObject -Class Win32_Printer |
        Where-Object { $_.PortName -match "USB|COM|LPT" } |
        Select-Object Name, PortName, DriverName, WorkOffline, PrinterStatus
    
    $printerConnections | Format-Table -AutoSize

    # 6. Итоговый статус
    Write-Host "`n📊 Summary:" -ForegroundColor Green
    Write-Host "Total printers: $($allPrinters.Count)"
    Write-Host "USB/COM/LPT ports: $($usbPorts.Count)"
    Write-Host "GoDEX printers: $($godexPrinters.Count)"
    Write-Host "USB-connected printers: $($printerConnections.Count)"

    # Return structured data for API
    $result = @{
        totalPrinters = $allPrinters.Count
        usbPorts = $usbPorts.Count
        godexPrinters = $godexPrinters.Count
        usbConnectedPrinters = $printerConnections.Count
        printers = $allPrinters
        godexFound = $godexPrinters
        usbConnections = $printerConnections
    }

    return $result | ConvertTo-Json -Depth 3

} catch {
    Write-Host "❌ Error checking USB printers: $($_.Exception.Message)" -ForegroundColor Red
    return @{ error = $_.Exception.Message } | ConvertTo-Json
}