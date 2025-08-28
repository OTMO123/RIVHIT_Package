/**
 * Jest Setup for Frontend Tests
 * Configures React Testing Library, Electron mocks, and global test utilities
 */

import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_URL = 'http://localhost:3001';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep error and warn for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Mock Electron APIs
const mockElectron = {
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
  app: {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getName: jest.fn().mockReturnValue('RIVHIT Packing System'),
  },
};

// Mock Electron preload API
global.electronAPI = {
  ...mockElectron.ipcRenderer,
  getVersion: mockElectron.app.getVersion,
  openExternal: mockElectron.shell.openExternal,
};

// Mock fetch for browser environment
global.fetch = jest.fn();

// Mock window APIs that might be used
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Global test utilities
global.testUtils = {
  createMockOrder: (overrides = {}) => ({
    orderId: '39641',
    orderNumber: '39641',
    customerName: 'Test Customer',
    customerCity: 'Tel Aviv',
    items: [
      {
        item_id: '1',
        item_name: 'Test Item',
        quantity: 10,
        packed_quantity: 0,
        price: 25.0,
      }
    ],
    totalAmount: 250.0,
    currency: 'NIS',
    orderDate: '2025-01-01',
    ...overrides
  }),
  
  createMockUser: (overrides = {}) => ({
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'packer',
    ...overrides
  }),
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockApiResponse: (data: any, options = {}) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
      ...options
    });
  },
  
  mockApiError: (message: string, status = 500) => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
  },
  
  mockDate: (date: string) => {
    const mockDate = new Date(date);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    (Date as any).now = jest.fn(() => mockDate.getTime());
    return mockDate;
  },
  
  restoreDate: () => {
    jest.restoreAllMocks();
  },
  
  // Hebrew/RTL testing utilities
  getHebrewText: () => 'שלום עולם',
  getRussianText: () => 'Привет мир',
  
  // Accessibility testing utilities
  expectToBeAccessible: (element: Element) => {
    // Check basic accessibility requirements
    if (element.tagName === 'BUTTON') {
      expect(element).not.toHaveAttribute('aria-label', '');
    }
    if (element.tagName === 'INPUT') {
      expect(element).toHaveAttribute('aria-label');
    }
  }
};

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
  
  // Clear localStorage
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  // Clean up timers
  jest.clearAllTimers();
  
  // Restore any spied methods
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log
});

export {};