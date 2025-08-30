#!/bin/bash

# Open generated EZPX files in GoLabel from WSL

echo "🚀 Opening EZPX files in GoLabel (via PowerShell)"
echo ""

# Find the latest test directory
LATEST_DIR=$(ls -dt /tmp/golabel-sample-test-* 2>/dev/null | head -1)

if [ -z "$LATEST_DIR" ]; then
    echo "❌ No test files found"
    echo "   Run test-golabel-with-sample-data.ts first"
    exit 1
fi

echo "📁 Found test directory: $(basename $LATEST_DIR)"

# Convert WSL path to Windows path
WINDOWS_DIR=$(echo $LATEST_DIR | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')

echo "📂 Windows path: $WINDOWS_DIR"
echo ""

# Run PowerShell script
echo "🖨️ Opening GoLabel..."
powershell.exe -ExecutionPolicy Bypass -File "$(pwd)/open-generated-labels.ps1" -Directory "$WINDOWS_DIR"