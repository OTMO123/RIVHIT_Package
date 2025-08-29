# GoLabel Integration for Godex Printers

This directory contains the complete GoLabel integration architecture for Godex ZX420i printer support.

## Architecture Overview

The GoLabel integration consists of three main layers:

### 1. GoLabel Integration Layer
- **GoLabel CLI Service** (`cli/golabel-cli.service.ts`): Wraps GoLabel.exe command-line interface
- **GoLabel SDK Service** (`sdk/golabel-sdk.service.ts`): Direct integration with EZio32.dll and QLabelSDK.DLL

### 2. Label Generation Layer
- **EZPX Generator** (`generators/ezpx-generator.service.ts`): Generates EZPX XML format for GoLabel
- **EZPL Generator** (planned): Direct EZPL command generation

### 3. Unified Interface Layer
- **Godex Printer Service** (`godex-printer.service.ts`): Automatic method selection with fallback support

## Quick Start

### Environment Variables

```bash
# Enable GoLabel integration (default: true for Godex printers)
USE_GOLABEL=true

# GoLabel.exe installation path
GOLABEL_PATH=C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe

# Godex SDK path
GODEX_SDK_PATH=C:\Program Files (x86)\Godex\SDK

# Default interface (USB, LPT, COM, NET)
GOLABEL_INTERFACE=USB

# Default print settings
GOLABEL_DEFAULT_DARKNESS=10
GOLABEL_DEFAULT_SPEED=4

# CLI timeout (milliseconds)
GOLABEL_CLI_TIMEOUT=30000
```

### Basic Usage

```typescript
import { GodexPrinterService } from './services/golabel/godex-printer.service';

// Create service
const printer = new GodexPrinterService();

// Initialize
await printer.initialize();

// Print with LabelData
const label: LabelData = {
  size: { width: 100, height: 50 },
  elements: [
    {
      type: 'text',
      position: { x: 10, y: 10 },
      properties: { text: 'Hello GoLabel', size: 24 }
    },
    {
      type: 'barcode',
      position: { x: 10, y: 30 },
      properties: { data: '123456', barcodeType: 'Code128', height: 50 }
    }
  ]
};

const result = await printer.print(label);
```

### IPrinterService Compatibility

The GodexPrinterService implements the standard IPrinterService interface:

```typescript
// Print multiple items
await printer.printLabels(items, options);

// Print single label
await printer.printSingleLabel(item, options);

// Test print
await printer.testPrint();

// Get status
const status = await printer.getStatus();
```

## Features

### Supported Elements
- **Text**: Multiple fonts, sizes, styles, rotation
- **Barcode**: Code128, Code39, EAN13, QRCode, DataMatrix, PDF417
- **Shapes**: Rectangle, Line, Circle
- **Images**: File path or Base64 data
- **Variables**: Dynamic content support

### Print Methods (Priority Order)
1. **GoLabel CLI**: Uses GoLabel.exe for maximum compatibility
2. **SDK Direct**: Uses EZio32.dll for direct printer communication
3. **Direct USB**: Fallback method using raw command sending

### Automatic Fallback
If one method fails, the service automatically tries the next available method.

## Testing

Run the integration test suite:

```bash
npm run test:golabel
# or
npx ts-node test-golabel-integration.ts
```

## Troubleshooting

### GoLabel Not Found
- Install GoLabel II from Godex website
- Set GOLABEL_PATH environment variable
- Check file permissions

### SDK Not Available
- Install Godex SDK
- Set GODEX_SDK_PATH environment variable
- Ensure EZio32.dll is present

### Printer Not Detected
- Check USB connection
- Install Godex drivers
- Try different interface (USB, LPT, NET)

### Print Failed
- Check printer status (paper, ribbon)
- Verify label size settings
- Check EZPL command compatibility

## Development

### Adding New Features

1. **New Element Types**: Add to `types/golabel.types.ts` and implement in generators
2. **New Print Methods**: Implement IGodexPrinter interface and add to GodexPrinterService
3. **New Formats**: Create new generator implementing ILabelGenerator

### File Structure
```
golabel/
├── cli/                  # GoLabel CLI integration
├── sdk/                  # Native SDK integration
├── generators/           # Label format generators
├── interfaces/           # TypeScript interfaces
├── types/               # Type definitions
├── godex-printer.service.ts  # Main service
└── README.md            # This file
```

## License

Part of RIVHIT Package - Proprietary Software