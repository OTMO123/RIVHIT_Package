# GoLabel File Locations Documentation

## Overview
This document describes where EZPX files are saved in the GoLabel integration.

## File Saving Locations

### 1. **Generation Endpoint** (`/api/print/box-label/golabel`)
- **Method**: `generateBoxLabelGoLabel`
- **Directory**: `{PROJECT_ROOT}/packages/backend/temp/labels/`
- **Filename Pattern**: `box_label_{orderId}_{boxNumber}_{timestamp}.ezpx`
- **Full Path Example**: `/mnt/c/Users/aurik/Desktop/RivHit-Integration/RIVHIT_Package/packages/backend/temp/labels/box_label_39773_1_1756555123456.ezpx`

### 2. **Print Endpoint** (`/api/print/box-label/golabel/print`)
- **Method**: `printBoxLabelGoLabel`
- **Directory**: System temp directory + `golabel-labels`
  - On Windows: `C:\Users\{username}\AppData\Local\Temp\golabel-labels\`
  - On WSL: `/tmp/golabel-labels/`
- **Filename Pattern**: `box_{orderId}_{boxNumber}_{timestamp}.ezpx`
- **Full Path Example**: `/tmp/golabel-labels/box_39773_1_1756555123456.ezpx`

### 3. **Test Scripts**
- **Test Script**: `test-golabel-with-sample-data.ts`
- **Directory**: `/tmp/golabel-sample-test-{timestamp}/`
- **Filename Pattern**: `test_{orderId}_box{boxNumber}.ezpx`
- **Full Path Example**: `/tmp/golabel-sample-test-1756553294688/test_39773_box1.ezpx`

### 4. **Manual Copy Location** (from our scripts)
- **Script**: `copy-and-open-labels.sh`
- **Directory**: `C:\Temp\golabel-test-{timestamp}`
- **Purpose**: Copies files from WSL temp to Windows-accessible location

## Directory Creation

All methods ensure directories exist before saving files:

```typescript
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
```

## File Access from Windows

When running in WSL, files saved to `/tmp/` are not easily accessible from Windows. The files need to be:
1. Copied to a Windows-accessible location (like `C:\Temp\`)
2. Or saved directly to `/mnt/c/...` paths

## Current Workflow

1. **Generation**: Files are saved to `packages/backend/temp/labels/`
2. **Printing**: Files are saved to system temp directory
3. **Manual Access**: Use the `open-golabel-final.sh` script which:
   - Finds files in `/tmp/golabel-sample-test-*/`
   - Copies them to `C:\Temp\golabel-{timestamp}`
   - Opens them in GoLabel using VBScript

## Recommendations

For better Windows integration, consider:
1. Saving directly to Windows-accessible paths (e.g., `/mnt/c/Temp/golabel/`)
2. Using environment variable to configure save location
3. Providing both WSL and Windows paths in API responses

## Environment Variables

You can configure the save location using:
```bash
GOLABEL_SAVE_PATH=/mnt/c/Temp/golabel  # Windows-accessible path
```

## API Response Example

The API returns file locations:
```json
{
  "success": true,
  "results": [{
    "boxNumber": 1,
    "success": true,
    "filename": "box_39773_1_1756555123456.ezpx",
    "filepath": "/tmp/golabel-labels/box_39773_1_1756555123456.ezpx"
  }]
}
```

For Windows access, the filepath needs to be converted or files need to be saved to Windows-accessible locations initially.