# GoLabel EZPX File Upload Methods

This document describes all available methods for programmatically uploading/opening EZPX files in GoLabel.

## Overview

There are several ways to open EZPX files in GoLabel programmatically:

1. **GoLabelCliService.openInGoLabel()** - Recommended method
2. **Windows File Association** - Uses OS file associations
3. **Direct Execution** - Launches GoLabel.exe with file argument
4. **Hot Folder** - Automated folder monitoring
5. **Direct Printing** - Sends to printer without GUI
6. **PowerShell** - Alternative Windows method
7. **File Association Setup** - Ensure proper file associations

## Method Details

### Method 1: GoLabelCliService.openInGoLabel() (Recommended)

The most reliable method that handles multiple fallback approaches:

```typescript
import { GoLabelCliService } from '../src/services/golabel/cli/golabel-cli.service';

const goLabelService = new GoLabelCliService();
await goLabelService.initialize();

const result = await goLabelService.openInGoLabel('path/to/file.ezpx');
if (result.success) {
  console.log('File opened successfully');
}
```

**Advantages:**
- Built-in error handling
- Multiple fallback methods
- Cross-platform compatible (with limitations)
- Proper logging and diagnostics

### Method 2: Windows File Association

Uses Windows shell to open files with their associated application:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
await execAsync(`start "" "${ezpxFilePath}"`);
```

**Advantages:**
- Simple and straightforward
- Uses OS-level associations
- Works if .ezpx is properly associated

**Limitations:**
- Windows only
- Requires proper file associations

### Method 3: Direct GoLabel.exe Execution

Launches GoLabel directly with the file as an argument:

```typescript
import { spawn } from 'child_process';

const goLabelPath = 'C:\\Program Files (x86)\\Godex\\GoLabel\\GoLabel.exe';
const child = spawn(goLabelPath, [ezpxFilePath], {
  detached: true,
  stdio: 'ignore'
});
child.unref();
```

**Advantages:**
- Direct control over GoLabel process
- Doesn't rely on file associations
- Can pass additional command line arguments

**Limitations:**
- Need to know exact GoLabel installation path
- Windows specific paths

### Method 4: Hot Folder Monitoring

Copies files to a monitored folder where GoLabel picks them up automatically:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

const hotFolderPath = 'C:\\GoLabelHotFolder';
const destPath = path.join(hotFolderPath, 'print_' + Date.now() + '.ezpx');
await fs.copyFile(sourcePath, destPath);
```

**Advantages:**
- Asynchronous processing
- Good for batch operations
- Can be used with multiple printers
- Supports automated workflows

**Limitations:**
- Requires GoLabel hot folder configuration
- No immediate feedback
- Files need to be cleaned up

### Method 5: Direct Printing (No GUI)

Sends the file directly to the printer without opening GoLabel GUI:

```typescript
const goLabelService = new GoLabelCliService();
await goLabelService.initialize();

const result = await goLabelService.print('path/to/file.ezpx');
```

**Advantages:**
- Fully automated printing
- No user interaction required
- Faster for production use

**Limitations:**
- No preview before printing
- Requires printer to be configured

### Method 6: PowerShell Method

Alternative Windows method using PowerShell:

```typescript
await execAsync(`powershell -Command "Start-Process '${ezpxFilePath}'"`);
```

**Advantages:**
- PowerShell provides additional options
- Can be combined with other PS commands

**Limitations:**
- Windows only
- Requires PowerShell

## Usage Examples

### Running the Demo Script

```bash
# Install dependencies first
npm install

# Run with specific method
npx ts-node examples/golabel-upload-methods.ts 1

# Test all methods
npx ts-node examples/golabel-upload-methods.ts 8
```

### Integration Test Example

From the test file:

```typescript
// In your test
const goLabelService = new GoLabelCliService(logger);
const isAvailable = await goLabelService.initialize();

if (isAvailable) {
  const testFile = 'path/to/test.ezpx';
  const result = await goLabelService.openInGoLabel(testFile);
  expect(result.success).toBeDefined();
}
```

## Configuration

### Environment Variables

```bash
# GoLabel executable path
GOLABEL_PATH=C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe

# Hot folder path (if using hot folder method)
GOLABEL_HOT_FOLDER=C:\GoLabelHotFolder

# Enable hot folder method
GOLABEL_USE_HOT_FOLDER=true

# Enable Windows automation
GOLABEL_USE_AUTOMATION=true
```

### File Association Setup

To ensure .ezpx files open with GoLabel:

1. Right-click any .ezpx file
2. Select "Open with" > "Choose another app"
3. Browse to GoLabel.exe
4. Check "Always use this app"

Or use command line (requires admin):
```cmd
assoc .ezpx=GoLabel.Document
ftype GoLabel.Document="C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe" "%1"
```

## Best Practices

1. **Use Method 1** (openInGoLabel) for most use cases
2. **Configure hot folders** for high-volume automated printing
3. **Test file associations** before deployment
4. **Handle errors gracefully** - GoLabel might not be installed
5. **Clean up temporary files** when using hot folders
6. **Log all operations** for debugging

## Troubleshooting

### GoLabel Not Found
- Check installation path in environment variables
- Verify GoLabel is installed
- Try different GoLabel paths (GoLabel vs GoLabel II)

### File Association Issues
- Run file association commands as administrator
- Check Windows default apps settings
- Verify .ezpx extension is not blocked

### Hot Folder Not Working
- Ensure folder exists and has write permissions
- Check GoLabel hot folder configuration
- Monitor folder for file pickup
- Check GoLabel is running and monitoring

### Permission Errors
- Run application with appropriate permissions
- Check file/folder access rights
- Ensure antivirus isn't blocking operations

## See Also

- [GoLabel CLI Service](../src/services/golabel/cli/golabel-cli.service.ts)
- [Integration Tests](../src/tests/integration/golabel-box-printing.test.ts)
- [GoLabel Documentation](https://www.godexintl.com/downloads)