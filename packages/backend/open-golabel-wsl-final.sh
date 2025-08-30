#!/bin/bash

# Final script to open EZPX files in GoLabel from WSL using VBScript

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

# Find EZPX files
EZPX_FILES=($LATEST_DIR/*.ezpx)

if [ ${#EZPX_FILES[@]} -eq 0 ]; then
    echo "❌ No EZPX files found"
    exit 1
fi

echo "📄 Found ${#EZPX_FILES[@]} EZPX files:"
for i in "${!EZPX_FILES[@]}"; do
    echo "   $((i+1)). $(basename "${EZPX_FILES[$i]}")"
done

echo ""
echo "Select option:"
echo "  1. Open first file"
echo "  2. Open all files"
echo "  3. Select specific file"
read -p "Choice (1-3): " choice

case $choice in
    1)
        # Open first file
        FILE="${EZPX_FILES[0]}"
        WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
        echo ""
        echo "🖨️ Opening: $(basename "$FILE")"
        VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
        cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "$WINDOWS_PATH"
        ;;
    2)
        # Open all files
        for FILE in "${EZPX_FILES[@]}"; do
            WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
            echo ""
            echo "🖨️ Opening: $(basename "$FILE")"
            VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
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
            VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
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
echo "✅ Done!"