# USB Printer Integration Guide

## Overview

This document describes the USB printer detection and printing functionality implemented for the RIVHIT Package system. The system now includes **GoLabel integration** for reliable Godex printer communication.

## Update: GoLabel Integration 🆕

As of version 3.0, the system uses GoLabel integration as the primary method for USB printing on Godex printers, with automatic fallback to direct USB methods.

### GoLabel Print Methods (Priority Order)
1. **GoLabel.exe CLI** - Official Godex tool with full feature support
2. **EZio32.dll SDK** - Direct DLL integration via FFI
3. **Direct USB** - Legacy fallback method

## Features

### USB Printer Discovery
- **Cross-platform detection**: Windows (PowerShell) and macOS (bash/CUPS)
- **Automatic platform detection**: System automatically chooses appropriate method
- **GODEX printer support**: Enhanced with GoLabel integration
- **Real-time status**: Live USB connection monitoring

### USB Printing
- **GoLabel integration** 🆕: Official Godex printing methods
- **EZPX format support** 🆕: Modern XML-based label format
- **Direct USB printing**: Platform-specific printing methods (fallback)
- **EZPL command support**: Native GODEX label printer commands
- **Test printing**: Automated test print functionality with method detection
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

## GoLabel Configuration 🆕

### Prerequisites

1. **GoLabel II Software**
   - Download from [Godex website](https://www.godex.com)
   - Install to default location: `C:\Program Files (x86)\Godex\GoLabel`
   - Version 2.x or higher recommended

2. **Godex SDK (Optional)**
   - Download Godex SDK package
   - Extract to: `C:\Program Files (x86)\Godex\SDK`
   - Contains EZio32.dll and QLabelSDK.DLL

### Environment Variables

Add to your `.env` file:
```bash
# GoLabel Integration
USE_GOLABEL=true
GOLABEL_PATH=C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe
GODEX_SDK_PATH=C:\Program Files (x86)\Godex\SDK
GOLABEL_INTERFACE=USB
GOLABEL_DEFAULT_DARKNESS=10
GOLABEL_DEFAULT_SPEED=4
GOLABEL_CLI_TIMEOUT=30000
```

### Testing GoLabel Integration

Run the test script:
```bash
npm run test:golabel
# or
npx ts-node test-golabel-integration.ts
```

## Setup Instructions

### Windows Setup
1. **Install GoLabel II** (required for GoLabel integration)
2. Connect GODEX ZX420i via USB
3. Install GODEX drivers (included with GoLabel)
4. Verify printer appears in Windows Settings > Printers & Scanners
5. Configure GoLabel settings (see above)
6. Test detection: `GET /api/printers/usb-check`
7. Test printing: `POST /api/print/test-usb`

### macOS Setup
1. Connect GODEX ZX420i via USB
2. Open System Preferences > Printers & Scanners
3. Click "+" to add printer
4. Select GODEX ZX420i from USB devices
5. Test detection: `GET /api/printers/usb-check`
6. Test printing: `POST /api/print/test-usb`
   - Note: GoLabel integration is Windows-only; uses fallback methods on macOS

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