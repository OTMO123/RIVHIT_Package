#!/bin/bash

echo "🚀 Building and running RIVHIT Packing System"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies${NC}"
    exit 1
fi

# Step 2: Build shared package first (required)
echo -e "${YELLOW}🔨 Building shared package...${NC}"
npx lerna run build --scope=@packing/shared
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build shared package${NC}"
    exit 1
fi

# Step 3: Build backend
echo -e "${YELLOW}🔨 Building backend...${NC}"
npx lerna run build --scope=@packing/backend
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build backend${NC}"
    exit 1
fi

# Step 4: Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npx lerna run build --scope=@packing/frontend
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build frontend${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo "============================================"
echo "To run the application:"
echo ""
echo "1. Start both servers (recommended):"
echo "   npm run dev"
echo ""
echo "2. Or start servers individually:"
echo "   - Backend only: npx lerna run dev --scope=@packing/backend"
echo "   - Frontend only: npx lerna run dev --scope=@packing/frontend"
echo ""
echo "3. Access the application:"
echo "   - Backend API: http://localhost:3001"
echo "   - Frontend App: Electron window will open automatically"
echo ""
echo "============================================"