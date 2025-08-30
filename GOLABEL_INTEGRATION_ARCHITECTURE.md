# GoLabel Integration Architecture for Box Label Printing

## Overview

This document describes the complete architecture and data flow for the GoLabel integration system, which generates and prints box labels for the RIVHIT packing application. The system respects database-configured maxPerBox limits and generates labels in EZPX format compatible with GoDEX printers.

## Architecture Components

### 1. Frontend Components

#### BoxLabelPrint Component (`packages/frontend/src/renderer/components/BoxLabelPrint.tsx`)
- **Purpose**: Main UI component for box label printing
- **Key Features**:
  - Fetches saved draft boxes from the database (respecting maxPerBox limits from packing stage)
  - Falls back to standard assignment only if no saved boxes exist
  - Sends data to GoLabel print endpoint
  - Displays print progress and results

#### Data Flow in Frontend:
```typescript
1. User clicks "Напечатать баркоды" button
2. BoxLabelPrint component opens
3. Fetches draft boxes: GET /api/order-status/{orderId}/draft-boxes
4. Displays boxes with their items (already split according to maxPerBox)
5. User confirms and prints
6. Sends to: POST /api/print/box-label/golabel/print
```

### 2. Backend Services

#### Order Status Service (`packages/backend/src/services/order-status.service.ts`)
- **Purpose**: Manages order packing state and box data
- **Key Methods**:
  - `saveDraftBoxes()`: Saves boxes created during packing with proper maxPerBox splits
  - `getDraftBoxes()`: Retrieves saved boxes for printing

#### Box Label Template Service (`packages/backend/src/services/golabel/generators/box-label-template-service.ts`)
- **Purpose**: Uses the `box_label_example.ezpx` template with variable substitution
- **Template Location**: `/docs/box_label_example.ezpx`
- **Substitutions**:
  - Order ID
  - Customer name (Hebrew only, no Russian)
  - Box number (X/Y format)
  - Region (Hebrew)
  - Items (up to 3 per label)
  - Barcodes
  - Date

#### GoLabel CLI Service (`packages/backend/src/services/golabel/cli/golabel-cli.service.ts`)
- **Purpose**: Interfaces with GoLabel application
- **Print Methods** (in order of preference):
  1. **Hot Folder**: Drops EZPX file in monitored folder
  2. **Windows Automation**: Uses VBScript to control GoLabel
  3. **Direct CLI**: Opens file directly (may cause crashes)

### 3. Database Schema

#### MaxPerBoxSetting Entity
```typescript
{
  catalogNumber: string;  // Product catalog number
  maxQuantity: number;    // Maximum items per box
  description?: string;
  isActive: boolean;
}
```

#### OrderBoxes Entity
```typescript
{
  orderId: string;
  boxNumber: number;
  itemsJson: string;  // JSON array of items
  isDraft: boolean;   // true for unpacked, false for finalized
  totalWeight?: number;
}
```

## Complete Data Flow

### Phase 1: Packing (Respects MaxPerBox)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User Starts     │     │ Load Order       │     │ Fetch MaxPerBox │
│ Packing         │ ──> │ Items            │ ──> │ for Each Item   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Save Draft      │ <── │ Generate Box     │ <── │ Split Items by  │
│ Boxes to DB     │     │ Assignments      │     │ MaxPerBox       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Example**: If item has maxPerBox=5 and user packs 12:
- Box 1: 5 items
- Box 2: 5 items  
- Box 3: 2 items (partial)

### Phase 2: Label Generation

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User Clicks     │     │ Fetch Draft      │     │ BoxLabelPrint   │
│ Print Labels    │ ──> │ Boxes from DB    │ ──> │ Component       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Print Labels    │ <── │ Send to GoLabel  │ <── │ Generate EZPX   │
│                 │     │ Application      │     │ for Each Box    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## API Endpoints

### 1. Get Draft Boxes
```
GET /api/order-status/{orderId}/draft-boxes
Response: {
  success: true,
  data: [{
    boxNumber: 1,
    items: [{
      itemId: "ITEM_001",
      name: "Product Name",
      nameHebrew: "שם המוצר",
      quantity: 5,
      catalogNumber: "CAT001",
      barcode: "7290000000001"
    }]
  }]
}
```

### 2. Print Box Labels via GoLabel
```
POST /api/print/box-label/golabel/print
Body: {
  orderId: "12345",
  customerName: "Customer Name",
  region: "north1",
  boxes: [{
    boxNumber: 1,
    totalBoxes: 3,
    items: [...]
  }]
}
Response: {
  success: true,
  message: "Printed 3 of 3 labels",
  results: [{
    boxNumber: 1,
    success: true,
    filename: "box_12345_1.ezpx"
  }]
}
```

## EZPX Template Structure

The `box_label_example.ezpx` template includes:

```xml
<PrintJob>
  <Label>
    <!-- Order Number (Large, Centered) -->
    <GraphicShape xsi:type="Text">
      <Data>38987</Data> <!-- Replaced with actual order ID -->
    </GraphicShape>
    
    <!-- Box Number (X / Y format) -->
    <GraphicShape xsi:type="Text">
      <Data>X / Y</Data> <!-- Replaced with "1 / 3" -->
    </GraphicShape>
    
    <!-- Customer Name -->
    <GraphicShape xsi:type="Text">
      <Data>Name of the client</Data>
    </GraphicShape>
    
    <!-- Items (up to 3) -->
    <!-- Each item has quantity, barcode, and name fields -->
  </Label>
  
  <Setup>
    <LabelWidth>100</LabelWidth>
    <LabelLength>100</LabelLength>
    <PrinterModel>ZX420i</PrinterModel>
  </Setup>
</PrintJob>
```

## Key Features

### 1. MaxPerBox Compliance
- Items are split during packing phase based on database settings
- Each product can have different maxPerBox limits
- Partial boxes are clearly marked

### 2. Multi-Language Support
- Hebrew text for customer names and items
- Region names in Hebrew
- No Russian text as per requirements

### 3. Robust Printing
- Multiple fallback methods for GoLabel integration
- Temp file generation for manual printing if needed
- Error handling and status reporting

### 4. Data Persistence
- Draft boxes saved during packing
- Restored when printing labels
- Maintains box assignments and connections

## Testing

### Integration Test
```bash
npm run test:integration
```

### Manual Testing
```bash
# Test with real order data
npm run test:golabel

# Test with sample data
npm run test:golabel:sample
```

## Configuration

### Environment Variables
```env
# GoLabel Configuration
GOLABEL_HOT_FOLDER=C:\GoLabel\HotFolder
GOLABEL_PATH=C:\Program Files\Godex\GoLabel
USE_WINLABEL=false
```

### Printer Settings
- Default printer: GoDEX ZX420i
- Label size: 100mm x 100mm
- Print method: EZPL

## Troubleshooting

### Common Issues

1. **GoLabel Not Found**
   - Install GoLabel from GoDEX
   - Set GOLABEL_PATH environment variable

2. **Template Not Found**
   - Ensure `box_label_example.ezpx` exists in `/docs/`
   - Falls back to dynamic generator if missing

3. **No Draft Boxes**
   - Pack items first using the packing workflow
   - Check database for draft boxes

4. **Print Failures**
   - Check GoLabel is running
   - Verify hot folder permissions
   - Try manual file opening as fallback

## Future Enhancements

1. **Batch Printing Optimization**
   - Queue management for large orders
   - Progress tracking for multiple labels

2. **Template Customization**
   - User-defined label templates
   - Dynamic field mapping

3. **Advanced Error Recovery**
   - Automatic retry on failures
   - Partial print recovery

4. **Analytics**
   - Print success rates
   - Label usage statistics
   - Performance metrics