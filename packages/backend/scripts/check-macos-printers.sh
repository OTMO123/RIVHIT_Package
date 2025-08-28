#!/bin/bash
# macOS USB Printer Detection Script
# Проверяет USB принтеры подключенные к macOS системе

echo "🍎 macOS USB Printer Detection"
echo "================================="

# 1. Проверка всех принтеров в системе
echo ""
echo "📋 All System Printers (lpstat):"
lpstat -p 2>/dev/null || echo "No printers configured via CUPS"

echo ""
echo "📋 Detailed printer info (lpstat -v):"
lpstat -v 2>/dev/null || echo "No detailed printer info available"

# 2. Проверка USB устройств
echo ""
echo "🔌 USB Devices (system_profiler):"
system_profiler SPUSBDataType 2>/dev/null | grep -i -A5 -B5 "print\|label\|godex\|zebra" || echo "No USB printers detected"

# 3. Проверка через ioreg (более детально)
echo ""
echo "💾 IO Registry USB devices:"
ioreg -p IOUSB -w0 | grep -i "print\|label\|godex\|zebra" || echo "No USB printing devices in IO registry"

# 4. Поиск активных TCP портов (для сетевых принтеров)
echo ""
echo "📡 Active network connections (для сетевых принтеров):"
netstat -an | grep ":910[0-9]" || echo "No printer ports (9100-9109) active"

# 5. Проверка доступности CUPS
echo ""
echo "☕ CUPS Status:"
if command -v cupsd &> /dev/null; then
    echo "✅ CUPS daemon available"
    lpstat -t 2>/dev/null | head -10 || echo "CUPS не отвечает"
else
    echo "❌ CUPS daemon not available"
fi

# 6. Проверка lsusb если доступен (через Homebrew)
echo ""
echo "🔍 USB devices (lsusb if available):"
if command -v lsusb &> /dev/null; then
    lsusb | grep -i "print\|label" || echo "No USB printers found via lsusb"
else
    echo "lsusb not available (install via 'brew install usbutils')"
fi

# 7. Создание JSON результата
echo ""
echo "📊 JSON Result:"
cat << EOF
{
  "platform": "darwin",
  "cupsPrinters": $(lpstat -p 2>/dev/null | wc -l),
  "usbDevicesFound": $(system_profiler SPUSBDataType 2>/dev/null | grep -i "print\|label\|godex" | wc -l),
  "activePrinterPorts": $(netstat -an | grep ":910[0-9]" | wc -l),
  "cupsAvailable": $(command -v cupsd &> /dev/null && echo "true" || echo "false"),
  "recommendations": [
    "Для USB принтеров на macOS нужна настройка через CUPS",
    "Проверьте System Preferences > Printers & Scanners",
    "Для GoDEX лучше использовать Ethernet подключение"
  ]
}
EOF