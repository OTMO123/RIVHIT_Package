#!/bin/bash

echo "🧪 Starting Test Environment for RIVHIT Packing System"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null
}

# Check if ports are available
echo -e "${YELLOW}🔍 Checking port availability...${NC}"
if check_port 3001; then
    echo -e "${RED}Port 3001 is already in use. Please stop the existing backend server.${NC}"
    exit 1
fi

# Start backend in background
echo -e "${YELLOW}🚀 Starting backend server on port 3001...${NC}"
npx lerna run dev --scope=@packing/backend &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 5

# Check if backend is running
if ! check_port 3001; then
    echo -e "${RED}Backend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Backend is running on http://localhost:3001${NC}"

# Start frontend
echo -e "${YELLOW}🚀 Starting frontend Electron app...${NC}"
npx lerna run dev --scope=@packing/frontend &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}✨ Test environment is running!${NC}"
echo ""
echo -e "${BLUE}📍 Access points:${NC}"
echo "   - Backend API: http://localhost:3001"
echo "   - API Docs: http://localhost:3001/api-docs"
echo "   - Frontend: Electron app window"
echo ""
echo -e "${BLUE}📝 Test the new packing workflow:${NC}"
echo "   1. Open the Orders page"
echo "   2. Select an order to pack"
echo "   3. Click 'Подтвердить' button"
echo "   4. Select delivery region (Юг 1/2, Север 1/2)"
echo "   5. Preview generated labels"
echo "   6. Click 'Напечатать баркоды' to print"
echo ""
echo -e "${YELLOW}⚠️  Press Ctrl+C to stop all servers${NC}"
echo -e "${GREEN}=======================================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Servers stopped${NC}"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup INT

# Wait for processes
wait