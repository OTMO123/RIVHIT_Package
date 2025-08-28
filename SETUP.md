# RIVHIT BRAVO Packing System - Setup Guide

## 🚀 Quick Start

This repository contains the RIVHIT BRAVO Packing System - a complete Electron-based application for warehouse packing operations.

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Windows 10+ (for printer features)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OTMO123/RIVHIT_Package.git
   cd RIVHIT_Package
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build shared package (required):**
   ```bash
   npx lerna run build --scope=@packing/shared
   ```

4. **Configure API token:**
   - Copy `packages/backend/.env.example` to `packages/backend/.env`
   - Add your RIVHIT API token:
     ```
     RIVHIT_API_TOKEN=your_token_here
     ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start both backend and frontend
npx lerna run dev

# Or separately:
npx lerna run dev --scope=@packing/backend    # Backend only (port 3001)
npx lerna run dev --scope=@packing/frontend   # Frontend Electron app only
```

### Web Frontend (Alternative)
```bash
# Root web server (requires .env.local with API token)
npm run server     # Port 3000
```

## 📦 Building for Production

### Development Build
```bash
npm run build
```

### Windows Installer (.exe)
**Note: Requires Windows machine or VM**
```bash
cd packages/frontend
npm run build:all
```

See `WINDOWS_BUILD_INSTRUCTIONS.md` for detailed build instructions.

## 🎯 Current Features

- ✅ **Russian Interface** - Default language set to Russian
- ✅ **Orders Management** - Complete order viewing and filtering
- ✅ **RIVHIT API Integration** - Safe read-only API client with caching
- ✅ **BRAVO Branding** - Custom icons and branding
- ✅ **Production Ready** - Backend embedded in Electron for single-file distribution
- ⏸️ **Packing Workflow** - Temporarily disabled (in development)
- ⏸️ **Print System** - Temporarily disabled (in development) 
- ⏸️ **Dashboard** - Temporarily disabled (in development)

## 🔧 Development Commands

```bash
# Testing
npm run test              # All tests
npm run test:watch        # TDD mode

# Code Quality  
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix issues
npm run type-check        # TypeScript validation

# Build Commands
npm run build             # Build all packages
npm run clean             # Clean build artifacts
```

## 📂 Project Structure

```
├── packages/
│   ├── backend/          # Express.js API server
│   ├── frontend/         # Electron React app  
│   └── shared/           # Common TypeScript types
├── docs/                 # Documentation
└── *.html               # Web frontend demos
```

## 🔒 Security

- API tokens are never committed to Git
- All sensitive files are in `.gitignore`
- Production builds use environment-based configuration

## 📚 Documentation

- `CLAUDE.md` - Development guidelines
- `INSTALLATION_GUIDE.md` - User installation guide
- `WINDOWS_BUILD_INSTRUCTIONS.md` - Windows build process
- `docs/` - Technical documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the TDD approach
4. Run tests and linting
5. Submit a pull request

## 📄 License

© RIVHIT - All Rights Reserved