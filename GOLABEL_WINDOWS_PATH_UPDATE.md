# GoLabel Windows Path Update Recommendation

## Current Issue
Files are saved to Linux temp directories (`/tmp/`) when running in WSL, making them difficult to access from Windows applications like GoLabel.

## Recommended Solution

### 1. Update Environment Configuration
Add to `.env` or `.env.local`:
```env
# GoLabel file save path (Windows-accessible)
GOLABEL_OUTPUT_PATH=C:\Temp\golabel\output
GOLABEL_TEMP_PATH=C:\Temp\golabel\temp
```

### 2. Update Controller Methods

#### In `printBoxLabelGoLabel` method:
```typescript
// Replace lines 1745-1746
const tempDir = process.env.GOLABEL_TEMP_PATH 
  ? (process.platform === 'linux' && process.env.GOLABEL_TEMP_PATH.startsWith('C:')
    ? process.env.GOLABEL_TEMP_PATH.replace('C:', '/mnt/c').replace(/\\/g, '/')
    : process.env.GOLABEL_TEMP_PATH)
  : path.join(os.tmpdir(), 'golabel-labels');
```

#### In `generateBoxLabelGoLabel` method:
```typescript
// Replace line 1651
const outputDir = process.env.GOLABEL_OUTPUT_PATH 
  ? (process.platform === 'linux' && process.env.GOLABEL_OUTPUT_PATH.startsWith('C:')
    ? process.env.GOLABEL_OUTPUT_PATH.replace('C:', '/mnt/c').replace(/\\/g, '/')
    : process.env.GOLABEL_OUTPUT_PATH)
  : path.join(process.cwd(), 'temp', 'labels');

const filepath = path.join(outputDir, filename);
```

### 3. Update API Response
Include both WSL and Windows paths in response:

```typescript
// In response
const windowsPath = filepath.startsWith('/mnt/') 
  ? filepath.replace(/^\/mnt\/([a-z])/, '$1:').replace(/\//g, '\\')
  : filepath;

res.status(200).json({
  success: true,
  filename,
  filepath,        // WSL path
  windowsPath,     // Windows path
  format: 'ezpx'
});
```

### 4. Benefits
1. Files are immediately accessible from Windows
2. GoLabel can open files directly without copying
3. Users can easily find and manage generated files
4. Works seamlessly in both WSL and Windows environments

### 5. Directory Structure
```
C:\Temp\golabel\
├── output\         # Generated files for long-term storage
│   ├── box_label_39773_1_timestamp.ezpx
│   └── box_label_39773_2_timestamp.ezpx
└── temp\          # Temporary files for printing
    ├── box_39773_1_timestamp.ezpx
    └── box_39773_2_timestamp.ezpx
```

### 6. Implementation Priority
1. **High Priority**: Update `printBoxLabelGoLabel` - this is used for actual printing
2. **Medium Priority**: Update `generateBoxLabelGoLabel` - this is for preview/generation
3. **Low Priority**: Add cleanup routine for old files

### 7. Backward Compatibility
The solution maintains backward compatibility by:
- Using environment variables (optional)
- Falling back to original paths if not configured
- Working in both WSL and native Windows environments