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

# Build scripts
./scripts/build-and-run.sh     # Complete build and setup guide (Linux/macOS)
./scripts/start-test-environment.sh  # Start test environment
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
# Automated build and setup
./scripts/build-and-run.sh    # Complete build process with dependency checks
./scripts/start-test-environment.sh  # Setup testing environment

# Manual building
npm run build                  # Build all packages
npm run package               # Create Electron installer
npm run clean                 # Clean build artifacts

# Development diagnostics
npm run diagnose              # Run system diagnostics
npm run test:system           # System health checks
npm run test:api              # API endpoint testing
```

## Architecture Overview

### Project Structure
This is a **monorepo** focused on Electron desktop application:

- **`packages/backend/`** - Express.js API server with TypeScript
- **`packages/frontend/`** - Electron desktop application with React
- **`packages/shared/`** - Common TypeScript types and utilities
- **`scripts/`** - Build and setup automation scripts

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

### Frontend Architecture
- **Electron App**: Desktop application in `packages/frontend/` with React + Ant Design
- **Multi-language Support**: Hebrew RTL, English, Russian interfaces with i18n
- **Component System**: Modular React components with TypeScript
- **State Management**: Zustand for global state, React hooks for local state
- **UI Components**: Ant Design 5 with custom Hebrew RTL adaptations
- **IPC Communication**: Secure main-renderer process communication

### Key Frontend Components (Updated)
- **MaxPerBoxSettings.tsx**: Configurable packaging rules interface
- **PrinterDiscovery.tsx**: Network printer detection and management
- **PrinterSettings.tsx**: Printer configuration and diagnostics
- **AssemblyLineProgress.tsx**: Visual packing workflow progress
- **SimpleProgressSteps.tsx**: Minimalist step indicator
- **InvoiceModal.tsx**: Invoice creation and management
- **PackingWorkflowModal.tsx**: Multi-step packing process
- **LabelPreview.tsx**: Print preview and barcode generation
- **ConnectionCanvas.tsx**: Visual item connections in packing

### RIVHIT Integration & API Endpoints
- **SafeRivhitService**: Read-only RIVHIT API client with caching
- **Circuit Breaker**: API protection with retry logic
- **Offline Mode**: Local data caching with TTL
- **Backend API**: Express.js server in packages/backend with comprehensive endpoints
- **Document Type 7**: Always contains order items (פרטי הזמנה)

### API Routes (Updated)
- **orders.routes.ts**: Order management and processing
- **items.routes.ts**: Product and item management
- **customers.routes.ts**: Customer data handling
- **print.routes.ts**: Printing and label generation
- **printer-discovery.routes.ts**: Network printer detection
- **invoice.routes.ts**: Invoice creation and management
- **order-status.routes.ts**: Order state management
- **settings.routes.ts**: Application configuration
- **auth.routes.ts**: Authentication endpoints

### Printer System
- **Enhanced Printer Discovery**: Intelligent network printer detection with progressive scanning
- **GoDEX/Zebra Support**: EZPL and ZPL template-based printing with visualization
- **Image-to-ZPL Conversion**: Convert images to ZPL format for direct printing
- **Network Detection**: Automatic printer discovery on network subnets with caching
- **Parallel Discovery**: Concurrent printer scanning for faster detection
- **Printer Cache System**: Cache discovered printers for improved performance
- **Connection Management**: Robust printer connection handling with diagnostics
- **Template System**: Product-specific label templates in `packages/backend/printer-templates/`
- **EZPL Debug Tools**: Visualization and debugging of EZPL templates
- **WinLabel Integration**: Windows printer service support

### Advanced Services (Recently Added)
- **Enhanced Printer Discovery Service**: Multi-stage printer detection with caching and progress tracking
- **Image-to-ZPL Service**: Canvas-based image conversion for direct printer communication
- **Network Detection Service**: Automatic subnet scanning and network topology detection
- **Parallel Discovery Service**: Concurrent device scanning for improved performance
- **Printer Connection Service**: Connection management with health checks and diagnostics
- **Printer Cache Service**: Intelligent caching of printer information with TTL
- **EZPL Debug Service**: Template visualization and debugging tools
- **Invoice Creator Service**: Automated invoice generation and status management
- **MaxPerBox Settings Service**: Configurable packaging rules per product type

### Database Entities
- **OrderStatus**: Order processing states and metadata
- **OrderBoxes**: Box information and packing details
- **OrderPackingDetails**: Item-level packing information
- **MaxPerBoxSetting**: Product packaging configuration rules

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

### Testing Strategy (Updated)
- **Unit Tests**: 80%+ coverage threshold (jest.config.js)
- **Integration Tests**: API and service integration
- **E2E Tests**: Full workflow testing with Playwright
- **Test Files**: 21+ test files across all packages
- **TDD Approach**: Test-first development methodology

## Configuration

### Environment Setup
```bash
# Backend configuration (required)
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env with your settings:
# RIVHIT_API_TOKEN=YOUR_API_TOKEN_HERE
# RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
# RIVHIT_TEST_MODE=true
# RIVHIT_READ_ONLY=true
# PRINTER_CONNECTION_TYPE=usb
# PRINTER_PORT=COM1 (Windows) or USB001
# USE_WINLABEL=false

# Root .env.local (optional for additional settings)
# PRINTER_NAME=GoDEX ZX420i
# PRINTER_TYPE=godex
# PRINTER_ENABLED=true
# LOG_LEVEL=info
```

### Quick Start Options
```bash
# Option 1: Automated build and setup (Linux/macOS)
./scripts/build-and-run.sh     # Complete setup with dependencies and build

# Option 2: Manual step-by-step
npm install                    # Install dependencies
npx lerna run build --scope=@packing/shared  # Build shared package first
npx lerna run dev             # Start both backend and frontend

# Option 3: Individual services
npx lerna run dev --scope=@packing/backend   # Backend only
npx lerna run dev --scope=@packing/frontend  # Frontend only
```

### Printer Configuration
- **Default**: GoDEX ZX420i on USB001 or network IP
- **Templates**: Located in `packages/backend/printer-templates/` (EZPL format)
- **Supported Formats**: EZPL, ZPL, WinLabel integration
- **Network Support**: Automatic discovery on port 9101
- **Debug Tools**: EZPL visualization in `packages/backend/visualize-ezpl.html`
- **Test Files**: Multiple test utilities in backend root directory

## Important Notes

- **Electron Only**: This is a desktop-focused application - no web interface available
- **Windows Only**: Printer integration requires Windows 10+
- **Hebrew RTL**: Electron frontend supports Hebrew interface with RTL layout
- **Cache Duration**: 5 minutes for RIVHIT API responses
- **API Rate Limiting**: Circuit breaker protects RIVHIT API
- **Test Coverage**: Minimum 80% required for all packages (jest.config.js)
- **Monorepo Structure**: Lerna-managed packages with shared dependencies
- **Network Printing**: Enhanced printer discovery supports network printers

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
- Test with printer diagnostic scripts in backend directory
- Use Enhanced Printer Discovery for network detection
- Check `packages/backend/printer-config.json` for saved settings

### API Issues
- Validate RIVHIT_API_TOKEN in .env
- Check network connectivity
- Clear cache with `/api/cache/clear`

### Build and Setup Issues
- **Build Failures**: Use `./scripts/build-and-run.sh` for automated setup
- **API Token**: Ensure .env.local exists with valid RIVHIT_API_TOKEN
- **Environment Setup**: Use `./scripts/start-test-environment.sh` for testing

### Development Setup Checklist
1. Ensure Node.js 18+ is installed
2. Run `npm install` after cloning
3. **CRITICAL**: Run `npx lerna run build --scope=@packing/shared` before starting services
4. Create .env.local for additional configuration (optional)
5. Use `npx lerna` commands for monorepo operations
6. Start with `npm run test:watch` for TDD workflow