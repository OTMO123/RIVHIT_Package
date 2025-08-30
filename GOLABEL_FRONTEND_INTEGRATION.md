# GoLabel Frontend Integration

## Overview
The frontend now automatically opens all generated box labels in GoLabel after clicking "Напечатать баркоды" (Print barcodes).

## How It Works

### 1. User Flow
1. User clicks "Напечатать баркоды" button
2. System generates EZPX files for all boxes
3. Files automatically open in GoLabel
4. User can print all labels at once

### 2. Technical Implementation

#### Frontend (BoxLabelPrint.tsx)
```typescript
// After successful label generation
if (response.data.success) {
  // Try to open files via backend API
  const openResponse = await apiService.post('/api/print/open-in-golabel', {
    orderId,
    files: successfulFiles
  });
  
  // If backend is in WSL, use Electron IPC
  if (openResponse.data.requiresManualOpen) {
    await window.electronAPI.golabel.openFiles(windowsPaths);
  }
}
```

#### Backend API Endpoint
- **Route**: `POST /api/print/open-in-golabel`
- **Purpose**: Opens EZPX files in GoLabel
- **Fallback**: Returns Windows paths if running in WSL

#### Electron Main Process (main.ts)
```typescript
ipcMain.handle('golabel:openFiles', async (event, files) => {
  // Find GoLabel installation
  // Open each file with delay
  // Return results
});
```

### 3. Multi-Environment Support

#### Windows Native
- Backend directly opens files using GoLabelCliService
- Uses VBScript or direct execution

#### WSL Environment
- Backend detects WSL and returns Windows paths
- Frontend uses Electron IPC to open files
- Automatic path conversion from WSL to Windows

#### Path Conversion Example
- WSL: `/tmp/golabel-labels/box_39773_1.ezpx`
- Windows: `C:\Temp\golabel-labels\box_39773_1.ezpx`

### 4. Features

#### Automatic Multi-File Opening
- All box labels open at once
- 1.5 second delay between files
- Prevents overwhelming GoLabel

#### Smart Detection
- Detects GoLabel installation location
- Checks multiple common paths
- Falls back gracefully if not found

#### User Feedback
- Success: "✅ Все 4 этикетки открыты в GoLabel!"
- Warning: Shows file paths if manual open needed
- Error handling without disrupting workflow

### 5. GoLabel Paths Checked
1. `C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe`
2. `C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe`
3. `C:\Program Files\Godex\GoLabel\GoLabel.exe`
4. `C:\GoLabel\GoLabel.exe`

### 6. Configuration

No additional configuration needed. The system automatically:
- Detects environment (Windows/WSL)
- Finds GoLabel installation
- Converts paths as needed
- Opens all files

### 7. Troubleshooting

#### "GoLabel not found"
- Install GoLabel from GoDEX
- Ensure installed in standard location

#### Files not opening
- Check Windows Defender / Antivirus
- Verify file paths are accessible
- Try manual open with provided paths

#### Only first file opens
- This is fixed - all files now open
- Check for GoLabel version compatibility

### 8. Benefits

1. **One-Click Operation**: Print button → All labels in GoLabel
2. **No Manual Steps**: No need to search for files
3. **Batch Printing**: All labels ready for batch print
4. **Cross-Environment**: Works in both Windows and WSL

### 9. Next Steps

After files open in GoLabel:
1. Review all labels (use Ctrl+Tab to switch)
2. Configure printer settings once
3. File → Print All (or Ctrl+P for current)
4. Labels print in correct order (1/4, 2/4, etc.)

### 10. Technical Stack

- **Frontend**: React + TypeScript + Ant Design
- **IPC**: Electron contextBridge
- **Backend**: Express + GoLabel CLI Service
- **File Format**: EZPX (GoLabel native format)