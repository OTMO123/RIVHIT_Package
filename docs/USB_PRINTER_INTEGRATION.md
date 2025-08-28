# USB Printer Integration Guide

## Overview

This document describes the USB printer detection and printing functionality implemented for the RIVHIT Package system. The system supports automatic USB printer discovery and testing on both Windows and macOS platforms.

## Features

### USB Printer Discovery
- **Cross-platform detection**: Windows (PowerShell) and macOS (bash/CUPS)
- **Automatic platform detection**: System automatically chooses appropriate method
- **GODEX printer support**: Specialized detection for GODEX ZX420i printers
- **Real-time status**: Live USB connection monitoring

### USB Printing
- **Direct USB printing**: Platform-specific printing methods
- **EZPL command support**: Native GODEX label printer commands
- **Test printing**: Automated test print functionality
- **Error handling**: Comprehensive error reporting and diagnostics

## API Endpoints

### USB Printer Detection
```http
GET /api/printers/usb-check
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "platform": "macOS",
    "output": "...",
    "message": "USB printer detection on macOS requires CUPS configuration",
    "instructions": [
      "Open System Preferences > Printers & Scanners",
      "Connect USB printer and click '+' to add",
      "For GoDEX printers, consider Ethernet connection"
    ]
  },
  "method": "macos-bash",
  "platform": "darwin",
  "timestamp": "2025-08-28T22:42:27.100Z"
}
```

### USB Test Print
```http
POST /api/print/test-usb
Content-Type: application/json

{
  "printerName": "GODEX_ZX420i"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "platform": "macOS",
    "output": "request id is GODEX_ZX420i-1 (0 file(s))",
    "printerName": "GODEX_ZX420i",
    "method": "cups-lp-command"
  },
  "message": "Test print sent to GODEX_ZX420i via CUPS",
  "timestamp": "2025-08-28T22:47:51.793Z"
}
```

## Platform-Specific Implementation

### Windows (PowerShell)
- **Detection Script**: `packages/backend/scripts/check-usb-printers.ps1`
- **Print Script**: `packages/backend/scripts/print-test-usb.ps1`
- **Features**:
  - System printer enumeration via Get-Printer
  - USB port detection via Get-PrinterPort
  - WMI USB device detection
  - EZPL command direct printing
  - Test page printing

### macOS (bash/CUPS)
- **Detection Script**: `packages/backend/scripts/check-macos-printers.sh`
- **Features**:
  - CUPS printer enumeration via lpstat
  - USB device detection via system_profiler
  - IO Registry USB scanning
  - CUPS-based printing via lp command
  - Network port monitoring

## Setup Instructions

### Windows Setup
1. Connect GODEX ZX420i via USB
2. Install GODEX drivers
3. Verify printer appears in Windows Settings > Printers & Scanners
4. Test detection: `GET /api/printers/usb-check`
5. Test printing: `POST /api/print/test-usb`

### macOS Setup
1. Connect GODEX ZX420i via USB
2. Open System Preferences > Printers & Scanners
3. Click "+" to add printer
4. Select GODEX ZX420i from USB devices
5. Test detection: `GET /api/printers/usb-check`
6. Test printing: `POST /api/print/test-usb`

## Technical Details

### Detection Output
The USB detection provides detailed information:
- **Physical USB connection**: Device enumeration and hardware IDs
- **Driver status**: Whether printer drivers are installed
- **CUPS configuration**: Printer setup in print system
- **Connection type**: USB port identification
- **Serial number**: Hardware identification (e.g., 1930066B)

### EZPL Support
The system supports GODEX EZPL printer language:
- **Command set**: Native EZPL command generation
- **Template system**: Pre-built label templates
- **Direct communication**: Raw EZPL command transmission
- **Error handling**: EZPL syntax validation

### Error Handling
- **Connection failures**: USB disconnection detection
- **Driver issues**: Missing driver diagnostics
- **Platform limitations**: Unsupported OS handling
- **Print errors**: Command transmission failures

## Troubleshooting

### Common Issues

#### "No USB printers detected"
- **Windows**: Check driver installation and USB connection
- **macOS**: Add printer in System Preferences first

#### "Print failed"
- **Windows**: Verify printer is default and online
- **macOS**: Check CUPS service status: `sudo launchctl load /System/Library/LaunchDaemons/org.cups.cupsd.plist`

#### "Platform not supported"
- Currently supports Windows (win32) and macOS (darwin) only
- Linux support can be added with CUPS integration

### Debug Commands

```bash
# Check USB detection
curl http://localhost:3001/api/printers/usb-check

# Test USB printing
curl -X POST -H "Content-Type: application/json" \
  -d '{"printerName": "GODEX_ZX420i"}' \
  http://localhost:3001/api/print/test-usb

# Check system printers (macOS)
lpstat -p

# Check system printers (Windows)
powershell "Get-Printer | Format-Table"
```

## Integration with Main System

The USB printer functionality integrates with the main RIVHIT packing system:
- **Automatic discovery**: USB printers detected during system startup
- **Fallback option**: If network printers unavailable, use USB
- **Multi-format support**: EZPL, Windows printing, CUPS printing
- **Real-time status**: USB connection monitoring during packing workflow

## Files Modified/Created

### Backend Routes
- `packages/backend/src/routes/printer-discovery.routes.ts` - USB detection endpoint
- `packages/backend/src/routes/print.routes.ts` - USB test print endpoint

### Detection Scripts
- `packages/backend/scripts/check-usb-printers.ps1` - Windows USB detection
- `packages/backend/scripts/check-macos-printers.sh` - macOS USB detection
- `packages/backend/scripts/print-test-usb.ps1` - Windows USB test print

### Integration Points
- Cross-platform automatic detection
- EZPL command generation
- CUPS/Windows printer integration
- Error reporting and diagnostics