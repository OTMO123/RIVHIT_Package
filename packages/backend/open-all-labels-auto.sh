#!/bin/bash

# Script to automatically open ALL EZPX files for an order in GoLabel

echo "🚀 Opening ALL box labels in GoLabel"
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
WINDOWS_TEMP="/mnt/c/Temp/golabel-$(date +%s)"
mkdir -p "$WINDOWS_TEMP"

# Copy EZPX files
echo "📋 Copying files to Windows temp directory..."
cp $LATEST_DIR/*.ezpx "$WINDOWS_TEMP/"

# Get list of copied files sorted by name to ensure correct order
EZPX_FILES=($(ls $WINDOWS_TEMP/*.ezpx | sort))

echo "✅ Found ${#EZPX_FILES[@]} box labels for this order"
echo ""
echo "📄 Box labels to open:"
for i in "${!EZPX_FILES[@]}"; do
    echo "   Box $((i+1)): $(basename "${EZPX_FILES[$i]}")"
done

# Convert VBS script path
VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')

echo ""
echo "🖨️ Opening all ${#EZPX_FILES[@]} labels in GoLabel..."

# Open all files automatically
for i in "${!EZPX_FILES[@]}"; do
    FILE="${EZPX_FILES[$i]}"
    WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
    echo ""
    echo "📦 Opening box $((i+1)) of ${#EZPX_FILES[@]}: $(basename "$FILE")"
    cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "$WINDOWS_PATH"
    
    # Wait between files to ensure GoLabel can handle them
    if [ $i -lt $((${#EZPX_FILES[@]} - 1)) ]; then
        echo "   ⏱️  Waiting 3 seconds before next file..."
        sleep 3
    fi
done

echo ""
echo "✅ All ${#EZPX_FILES[@]} box labels have been opened in GoLabel!"
echo ""
echo "💡 Files location: $(echo $WINDOWS_TEMP | sed 's|/mnt/c|C:|')"
echo ""
echo "📋 Next steps:"
echo "   1. Check all labels in GoLabel"
echo "   2. Verify box numbers (1/${#EZPX_FILES[@]}, 2/${#EZPX_FILES[@]}, etc.)"
echo "   3. Print labels as needed"
echo ""
echo "✅ Done!"