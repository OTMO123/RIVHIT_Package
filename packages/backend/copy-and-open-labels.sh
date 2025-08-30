#!/bin/bash

# Copy EZPX files and open in GoLabel

echo "🚀 Copying EZPX files and opening in GoLabel"
echo ""

# Find the latest test directory
LATEST_DIR=$(ls -dt /tmp/golabel-sample-test-* 2>/dev/null | head -1)

if [ -z "$LATEST_DIR" ]; then
    echo "❌ No test files found"
    echo "   Run test-golabel-with-sample-data.ts first"
    exit 1
fi

echo "📁 Found test directory: $(basename $LATEST_DIR)"

# Create Windows temp directory
WINDOWS_TEMP="/mnt/c/Temp/golabel-test-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$WINDOWS_TEMP"

# Copy EZPX files
echo "📋 Copying EZPX files..."
cp $LATEST_DIR/*.ezpx "$WINDOWS_TEMP/" 2>/dev/null

# Count files
FILE_COUNT=$(ls -1 $WINDOWS_TEMP/*.ezpx 2>/dev/null | wc -l)

if [ $FILE_COUNT -eq 0 ]; then
    echo "❌ No EZPX files found to copy"
    exit 1
fi

echo "✅ Copied $FILE_COUNT files to: C:\\Temp\\$(basename $WINDOWS_TEMP)"
echo ""

# List files
echo "📄 Files:"
ls -1 $WINDOWS_TEMP/*.ezpx | xargs -n1 basename | nl -w2 -s'. '

# Convert path for PowerShell
WINDOWS_PATH=$(echo "$WINDOWS_TEMP" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')

echo ""
echo "🖨️ Opening in GoLabel..."
echo ""

# Run PowerShell directly with the correct path
powershell.exe -ExecutionPolicy Bypass -Command "& { 
    \$golabelPath = 'C:\\Program Files (x86)\\Godex\\GoLabel\\GoLabel.exe'
    if (-not (Test-Path \$golabelPath)) {
        \$golabelPath = 'C:\\Program Files (x86)\\Godex\\GoLabel II\\GoLabel.exe'
    }
    
    if (Test-Path \$golabelPath) {
        Write-Host 'Found GoLabel at:' \$golabelPath -ForegroundColor Green
        
        \$firstFile = Get-ChildItem -Path '$WINDOWS_PATH' -Filter '*.ezpx' | Select-Object -First 1
        if (\$firstFile) {
            Write-Host 'Opening:' \$firstFile.Name -ForegroundColor Yellow
            Start-Process -FilePath \$golabelPath -ArgumentList \"\`\$(\$firstFile.FullName)\`\"
            Write-Host 'File opened in GoLabel!' -ForegroundColor Green
        }
    } else {
        Write-Host 'GoLabel not found!' -ForegroundColor Red
    }
}"

echo ""
echo "💡 All files are in: $WINDOWS_PATH"
echo "   You can open them manually in GoLabel if needed"