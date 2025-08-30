#!/bin/bash

# Script to open all EZPX labels for a specific order from API

echo "🚀 Opening order labels in GoLabel"
echo ""

# Check if order ID provided
if [ -z "$1" ]; then
    echo "Usage: ./open-order-labels.sh <orderId>"
    echo "Example: ./open-order-labels.sh 39773"
    exit 1
fi

ORDER_ID=$1
echo "📦 Order ID: $ORDER_ID"

# Function to find EZPX files for order
find_order_files() {
    local order_id=$1
    local files=()
    
    # Check in temp/labels directory
    if [ -d "temp/labels" ]; then
        files+=($(find temp/labels -name "*${order_id}*.ezpx" 2>/dev/null | sort))
    fi
    
    # Check in /tmp/golabel-labels
    if [ -d "/tmp/golabel-labels" ]; then
        files+=($(find /tmp/golabel-labels -name "*${order_id}*.ezpx" 2>/dev/null | sort))
    fi
    
    # Check in test directories
    files+=($(find /tmp -name "*${order_id}*.ezpx" 2>/dev/null | sort))
    
    # Remove duplicates and return
    printf '%s\n' "${files[@]}" | sort -u
}

# Find all EZPX files for this order
echo "🔍 Searching for order files..."
EZPX_FILES=($(find_order_files $ORDER_ID))

if [ ${#EZPX_FILES[@]} -eq 0 ]; then
    echo "❌ No EZPX files found for order $ORDER_ID"
    echo ""
    echo "💡 Try generating labels first using:"
    echo "   - The application's print function"
    echo "   - Or run: npm run test:golabel"
    exit 1
fi

echo "✅ Found ${#EZPX_FILES[@]} files for order $ORDER_ID"

# Create Windows temp directory
WINDOWS_TEMP="/mnt/c/Temp/golabel-order-$ORDER_ID-$(date +%s)"
mkdir -p "$WINDOWS_TEMP"

# Copy files and sort by box number
echo "📋 Organizing files by box number..."
for file in "${EZPX_FILES[@]}"; do
    cp "$file" "$WINDOWS_TEMP/"
done

# Get sorted list from Windows temp
SORTED_FILES=($(ls $WINDOWS_TEMP/*.ezpx | sort -V))

echo ""
echo "📄 Box labels found:"
for i in "${!SORTED_FILES[@]}"; do
    filename=$(basename "${SORTED_FILES[$i]}")
    # Try to extract box number from filename
    if [[ $filename =~ box[_-]?([0-9]+)[_-] ]]; then
        box_num="${BASH_REMATCH[1]}"
        echo "   Box $box_num: $filename"
    else
        echo "   File $((i+1)): $filename"
    fi
done

# Convert VBS script path
VBS_PATH=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')

echo ""
echo "🖨️ Opening all labels in GoLabel..."

# Open all files
for i in "${!SORTED_FILES[@]}"; do
    FILE="${SORTED_FILES[$i]}"
    WINDOWS_PATH=$(echo "$FILE" | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
    filename=$(basename "$FILE")
    
    echo ""
    if [[ $filename =~ box[_-]?([0-9]+)[_-] ]]; then
        box_num="${BASH_REMATCH[1]}"
        echo "📦 Opening box $box_num: $filename"
    else
        echo "📦 Opening file $((i+1)): $filename"
    fi
    
    cmd.exe /c cscript //NoLogo "${VBS_PATH}\\open-in-golabel.vbs" "$WINDOWS_PATH"
    
    # Wait between files
    if [ $i -lt $((${#SORTED_FILES[@]} - 1)) ]; then
        sleep 2
    fi
done

echo ""
echo "✅ All labels for order $ORDER_ID have been opened!"
echo ""
echo "💡 Files saved in: $(echo $WINDOWS_TEMP | sed 's|/mnt/c|C:|')"
echo ""
echo "📋 In GoLabel:"
echo "   - Review each label"
echo "   - Check box numbers match order"
echo "   - Print labels as needed"
echo ""
echo "✅ Done!"