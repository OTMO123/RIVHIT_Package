#!/bin/bash

# Final working script to open EZPX files in GoLabel from WSL

echo "🚀 Opening EZPX files in GoLabel"
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

# Get list of copied files
EZPX_FILES=($WINDOWS_TEMP/*.ezpx)

echo "✅ Copied ${#EZPX_FILES[@]} files"
echo ""
echo "📄 Files:"
for i in "${!EZPX_FILES[@]}"; do
    echo "   $((i+1)). $(basename "${EZPX_FILES[$i]}")"
done

echo ""
echo "Select option:"
echo "  1. Open first file"
echo "  2. Open all files"
echo "  3. Select specific file"
read -p "Choice (1-3): " choice

# Convert VBS script path
VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')

case $choice in
    1)
        # Open first file
        FILE="${EZPX_FILES[0]}"
        WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
        echo ""
        echo "🖨️ Opening: $(basename "$FILE")"
        cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "$WINDOWS_PATH"
        ;;
    2)
        # Open all files
        for FILE in "${EZPX_FILES[@]}"; do
            WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
            echo ""
            echo "🖨️ Opening: $(basename "$FILE")"
            cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "$WINDOWS_PATH"
            sleep 2
        done
        ;;
    3)
        # Select specific file
        read -p "Enter file number (1-${#EZPX_FILES[@]}): " filenum
        if [ $filenum -ge 1 ] && [ $filenum -le ${#EZPX_FILES[@]} ]; then
            FILE="${EZPX_FILES[$((filenum-1))]}"
            WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
            echo ""
            echo "🖨️ Opening: $(basename "$FILE")"
            cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "$WINDOWS_PATH"
        else
            echo "❌ Invalid file number"
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        ;;
esac

echo ""
echo "💡 Files are saved in: $(echo $WINDOWS_TEMP | sed 's|/mnt/c|C:|')"
echo "✅ Done!"