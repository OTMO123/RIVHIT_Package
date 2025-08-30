#!/bin/bash

# Optimized script to open all box labels at once in GoLabel

echo "🚀 GoLabel Multi-Box Label Opener"
echo "================================="
echo ""

# Function to show usage
show_usage() {
    echo "Usage:"
    echo "  ./open-all-boxes.sh              # Open latest test files"
    echo "  ./open-all-boxes.sh <orderId>    # Open files for specific order"
    echo ""
    echo "Examples:"
    echo "  ./open-all-boxes.sh"
    echo "  ./open-all-boxes.sh 39773"
}

# Determine mode based on arguments
if [ -z "$1" ]; then
    # No argument - use latest test directory
    MODE="test"
    LATEST_DIR=$(ls -dt /tmp/golabel-sample-test-* 2>/dev/null | head -1)
    
    if [ -z "$LATEST_DIR" ]; then
        echo "❌ No test files found"
        echo "   Run test-golabel-with-sample-data.ts first"
        echo ""
        show_usage
        exit 1
    fi
    
    SOURCE_DIR="$LATEST_DIR"
    ORDER_DESC="test order from $(basename $LATEST_DIR)"
else
    # Order ID provided
    MODE="order"
    ORDER_ID=$1
    ORDER_DESC="order $ORDER_ID"
    
    # Find files for this order
    echo "🔍 Searching for order $ORDER_ID files..."
    TEMP_SEARCH_DIR="/tmp/order-search-$$"
    mkdir -p "$TEMP_SEARCH_DIR"
    
    # Search in multiple locations
    find temp/labels /tmp/golabel-labels /tmp -name "*${ORDER_ID}*.ezpx" 2>/dev/null | while read file; do
        cp "$file" "$TEMP_SEARCH_DIR/" 2>/dev/null
    done
    
    if [ $(ls -1 $TEMP_SEARCH_DIR/*.ezpx 2>/dev/null | wc -l) -eq 0 ]; then
        echo "❌ No files found for order $ORDER_ID"
        rm -rf "$TEMP_SEARCH_DIR"
        exit 1
    fi
    
    SOURCE_DIR="$TEMP_SEARCH_DIR"
fi

echo "📦 Processing $ORDER_DESC"

# Create Windows temp directory
WINDOWS_TEMP="/mnt/c/Temp/golabel-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$WINDOWS_TEMP"

# Copy and sort files
echo "📋 Copying files..."
cp $SOURCE_DIR/*.ezpx "$WINDOWS_TEMP/"

# Get sorted list of files
EZPX_FILES=($(ls $WINDOWS_TEMP/*.ezpx | sort -V))
FILE_COUNT=${#EZPX_FILES[@]}

if [ $FILE_COUNT -eq 0 ]; then
    echo "❌ No EZPX files found"
    exit 1
fi

echo "✅ Found $FILE_COUNT box label(s)"
echo ""
echo "📄 Labels to open:"
for i in "${!EZPX_FILES[@]}"; do
    filename=$(basename "${EZPX_FILES[$i]}")
    # Extract box number if possible
    if [[ $filename =~ box[_-]?([0-9]+) ]]; then
        box_num="${BASH_REMATCH[1]}"
        echo "   Box $box_num/$FILE_COUNT: $filename"
    else
        echo "   Label $((i+1))/$FILE_COUNT: $filename"
    fi
done

# Convert paths
VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
WINDOWS_FILES=()
for file in "${EZPX_FILES[@]}"; do
    WINDOWS_FILES+=($(echo "$file" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g'))
done

echo ""
echo "🖨️ Opening all $FILE_COUNT labels in GoLabel..."
echo ""

# Method 1: Try opening all files at once with multi-file VBS
if [ -f "open-multiple-in-golabel.vbs" ]; then
    echo "Using multi-file opener..."
    cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-multiple-in-golabel.vbs" "${WINDOWS_FILES[@]}"
else
    # Method 2: Fall back to opening one by one
    echo "Opening files individually..."
    for i in "${!WINDOWS_FILES[@]}"; do
        echo "📦 Opening label $((i+1))/$FILE_COUNT..."
        cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "${WINDOWS_FILES[$i]}"
        
        if [ $i -eq 0 ]; then
            # Longer wait after first file for GoLabel to start
            sleep 3
        elif [ $i -lt $((FILE_COUNT - 1)) ]; then
            # Shorter wait between subsequent files
            sleep 1
        fi
    done
fi

# Cleanup if needed
if [ "$MODE" == "order" ] && [ -d "$TEMP_SEARCH_DIR" ]; then
    rm -rf "$TEMP_SEARCH_DIR"
fi

echo ""
echo "✅ All $FILE_COUNT labels have been sent to GoLabel!"
echo ""
echo "💾 Files saved in: $(echo $WINDOWS_TEMP | sed 's|/mnt/c|C:|')"
echo ""
echo "📋 In GoLabel you should see:"
for i in $(seq 1 $FILE_COUNT); do
    echo "   □ Box $i/$FILE_COUNT"
done
echo ""
echo "💡 Tips:"
echo "   - Use Ctrl+Tab to switch between labels in GoLabel"
echo "   - Print all labels using File → Print All"
echo "   - Or print individually as needed"
echo ""
echo "✅ Done!"

