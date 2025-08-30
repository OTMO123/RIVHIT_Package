# GoLabel Multi-Box Printing Guide

## Problem Solved
Previously, only the first box label was opening in GoLabel. Now all box labels for an order open automatically.

## Quick Start

### 1. Open All Test Labels
```bash
cd packages/backend
./open-all-boxes.sh
```
This opens all labels from the latest test run.

### 2. Open Labels for Specific Order
```bash
./open-all-boxes.sh 39773
```
Replace `39773` with your order ID.

## Available Scripts

### `open-all-boxes.sh` (Recommended)
- **Purpose**: Main script for opening all box labels
- **Features**:
  - Automatically finds all labels for an order
  - Opens all labels at once in GoLabel
  - Sorts labels by box number
  - Works with both test and real orders

### `open-all-labels-auto.sh`
- **Purpose**: Opens all labels from test directory
- **Usage**: For test data only
- **Behavior**: Automatically opens all files without prompting

### `open-order-labels.sh`
- **Purpose**: Opens labels for a specific order ID
- **Usage**: `./open-order-labels.sh <orderId>`
- **Features**: Searches multiple directories for order files

## How It Works

1. **File Discovery**:
   - Finds all EZPX files for the order
   - Searches in temp directories and test folders
   
2. **File Organization**:
   - Copies files to Windows-accessible location
   - Sorts files by box number
   
3. **GoLabel Integration**:
   - Opens GoLabel if not running
   - Loads all box labels
   - Each box appears as separate label/tab

## Expected Result

When you run the script for an order with 4 boxes:
```
✅ All 4 labels have been sent to GoLabel!

📋 In GoLabel you should see:
   □ Box 1/4
   □ Box 2/4
   □ Box 3/4
   □ Box 4/4
```

## Printing Options in GoLabel

1. **Print All Labels**:
   - File → Print All
   - Prints all open labels sequentially

2. **Print Individual Labels**:
   - Select each label tab
   - File → Print (or Ctrl+P)

3. **Batch Printing**:
   - Configure printer settings once
   - Apply to all labels

## Troubleshooting

### "No files found"
- Generate labels first using the application
- Or run test data generator: `npx ts-node test-golabel-with-sample-data.ts`

### "GoLabel not found"
- Install GoLabel from GoDEX
- Check installation path in VBS scripts

### Labels Not Opening
- Check if GoLabel is already running
- Close GoLabel and try again
- Verify Windows paths are correct

## Technical Details

- **VBScript**: `open-multiple-in-golabel.vbs` handles multiple files
- **Path Conversion**: WSL paths converted to Windows format
- **File Sorting**: Natural sort ensures correct box order (1, 2, 3... not 1, 10, 2...)
- **Timing**: Delays between files prevent overwhelming GoLabel

## Best Practices

1. **Always verify box count**: Ensure all boxes are loaded
2. **Check box numbers**: Verify sequence (1/4, 2/4, 3/4, 4/4)
3. **Preview before printing**: Review each label in GoLabel
4. **Save printer settings**: Configure once for consistent printing