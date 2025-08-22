# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Development setup
npm install                    # Install dependencies for all packages

# IMPORTANT: Build shared package first (required before starting services)
npx lerna run build --scope=@packing/shared

# Start development servers (use npx lerna, not npm run)
npx lerna run dev              # Start both backend and frontend
npx lerna run dev --scope=@packing/backend    # Backend server only (port 3001)
npx lerna run dev --scope=@packing/frontend   # Frontend Electron app only

# Web frontend server
npm run server                 # Start the root server.js (port 3000)
npm run start                  # Alias for server
npm run serve                  # Alias for server

# PowerShell scripts (Windows)
.\start-server.ps1             # Start web server with dependency check
.\load-token.ps1               # Load RIVHIT API token
```

### Testing (TDD Approach)
```bash
# Test execution
npm run test                   # Run all tests
npm run test:watch             # TDD watch mode (recommended for development)
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e               # End-to-end tests (requires server running)
npm run test:coverage          # Test coverage report

# Package-specific tests
npm run test --scope=@packing/backend
npm run test --scope=@packing/frontend
```

### Code Quality
```bash
# Linting and formatting
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix ESLint issues
npm run type-check             # TypeScript type checking
npm run format                 # Prettier formatting
npm run validate               # Full validation: type-check + lint + unit tests
```

### Build and Packaging
```bash
# Building
npm run build                  # Build all packages
npm run package               # Create Electron installer
npm run clean                 # Clean build artifacts
```

## Architecture Overview

### Project Structure
This is a **monorepo** with multiple frontend options:

- **`packages/backend/`** - Express.js API server with TypeScript
- **`packages/frontend/`** - Electron desktop application with React
- **`packages/shared/`** - Common TypeScript types and utilities
- **Root HTML files** - Standalone web frontend demos and production interfaces

### Key Design Patterns
- **SOLID Principles**: All services follow single responsibility, dependency inversion
- **Factory Pattern**: `ApplicationServiceFactory` creates all services
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Container manages all dependencies
- **TDD Methodology**: Test-first development approach

### Technology Stack
- **Backend**: Node.js 18+, Express.js, TypeScript, Winston logging, SQLite + TypeORM
- **Electron Frontend**: Electron 37, React 18, TypeScript, Ant Design 5, Zustand state management
- **Web Frontend**: Vanilla HTML/CSS/JS, Hebrew RTL support, RIVHIT API integration
- **Testing**: Jest (unit/integration), Playwright (E2E), 85%+ coverage target
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

## Key Components

### Frontend Options
- **Electron App**: Desktop application in `packages/frontend/` with React + Ant Design
- **Web Interface**: HTML demos in root directory for browser-based access
- **Multi-language Support**: Hebrew RTL, English, Russian interfaces
- **Demo Variants**: Mock data, real API integration, CORS solutions

### Web Frontend Files
- `multilingual-orders-demo.html` - Production interface with real API
- `real-orders-demo.html` - Complete packing system with printer integration
- `full-orders-demo.html` - Order management with dual-tab interface
- `standalone-packing-demo.html` - Interactive packing demonstration
- `quick-start-guide.html` - Getting started launcher
- `cors-solution-demo.html` - CORS workaround solutions

### RIVHIT Integration
- **SafeRivhitService**: Read-only RIVHIT API client with caching
- **Circuit Breaker**: API protection with retry logic
- **Offline Mode**: Local data caching with TTL
- **Web Server**: Root server.js provides API proxy with CORS support
- **Document Type 7**: Always contains order items (פרטי הזמנה)

### Printer System
- **GoDEX/Zebra Support**: EZPL template-based printing
- **WinLabel Integration**: Windows printer service
- **Template System**: Product-specific label templates in `packages/backend/printer-templates/`
- **PowerShell Scripts**: print*.ps1 files for direct printer commands

### Security Features
- **SSL/TLS**: Certificate management in `packages/backend/certs/`
- **API Token**: RIVHIT authentication via .env.local
- **Input Validation**: Zod schemas for API endpoints

## Development Workflow

### TDD Approach
1. **Red**: Write failing test first
2. **Green**: Implement minimal solution
3. **Refactor**: Improve code while maintaining tests

### Pre-commit Hooks
- ESLint auto-fix
- TypeScript type checking
- Unit tests execution
- Prettier formatting

### Testing Strategy
- **Unit Tests**: 85%+ coverage requirement
- **Integration Tests**: API and service integration
- **E2E Tests**: Full workflow testing with Playwright

## Configuration

### Environment Setup
```bash
# Backend configuration
cp packages/backend/.env.example packages/backend/.env
# Configure RIVHIT_API_TOKEN in .env file

# Web server configuration (required for HTML frontends)
# Create .env.local in root directory with:
# RIVHIT_API_TOKEN=your_token_here
# RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
```

### Quick Start Options
```bash
# Option 1: PowerShell launcher (Windows)
.\start-server.ps1             # Auto-installs deps and starts server

# Option 2: Manual web server
node server.js                # Requires .env.local with API token

# Option 3: Direct HTML access (requires CORS handling)
# Open any .html file directly in browser
```

### Printer Configuration
- Default: GoDEX ZX420 on USB001
- Templates: Located in `packages/backend/printer-templates/`
- Supported formats: EZPL, WinLabel integration

## Important Notes

- **Windows Only**: Printer integration requires Windows 10+
- **Hebrew RTL**: Both Electron and web frontends support Hebrew interface with RTL layout
- **Cache Duration**: 5 minutes for RIVHIT API responses
- **API Rate Limiting**: Circuit breaker protects RIVHIT API
- **Test Coverage**: Minimum 85% required for all packages
- **Dual Frontend**: Choose between Electron app (packages/frontend) or web interface (HTML files)
- **CORS Solutions**: Web frontend includes multiple CORS workaround options

## Common Issues

### Development Startup Issues
- **`lerna: command not found`**: Always use `npx lerna` instead of `lerna` directly
- **`Cannot find module '@packing/shared'`**: Build shared package first with `npx lerna run build --scope=@packing/shared`
- **Permission/directory errors**: Ensure you're in the correct project root directory
- **`npm run dev:backend` fails**: Use `npx lerna run dev --scope=@packing/backend` instead

### Printer Problems (Windows Only)
- **macOS/Linux warnings are normal**: Printer features only work on Windows
- Check USB connection and printer status
- Verify EZPL template compatibility
- Test with `npm run test:printer`

### API Issues
- Validate RIVHIT_API_TOKEN in .env
- Check network connectivity
- Clear cache with `/api/cache/clear`

### Web Frontend Issues
- **CORS Errors**: Use `cors-solution-demo.html` for workarounds
- **API Token**: Ensure .env.local exists with valid RIVHIT_API_TOKEN
- **Server Not Starting**: Run `.\start-server.ps1` for dependency checks

### Development Setup Checklist
1. Ensure Node.js 18+ is installed
2. Run `npm install` after cloning
3. **CRITICAL**: Run `npx lerna run build --scope=@packing/shared` before starting services
4. Create .env.local for web frontend
5. Use `npx lerna` commands for monorepo operations
6. Start with `npm run test:watch` for TDD workflow