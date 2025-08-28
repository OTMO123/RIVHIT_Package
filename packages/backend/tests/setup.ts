/**
 * Jest Setup for Backend Tests
 * Configures test environment, mocks, and global test utilities
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_RIVHIT = 'true';
process.env.RIVHIT_API_TOKEN = 'test-token';
process.env.RIVHIT_API_URL = 'https://test.api.rivhit.com';
process.env.CACHE_TYPE = 'memory';

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

// Mock TypeORM DataSource for tests
jest.mock('../src/config/database.config', () => {
  const mockDataSource = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn(),
    transaction: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    }
  };

  return {
    AppDataSource: mockDataSource
  };
});

// Global test utilities
(global as any).testUtils = {
  createMockRequest: (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides
  }),
  
  createMockResponse: () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
    };
    
    // Chain methods
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    
    return res;
  },
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockDate: (date: string) => {
    const mockDate = new Date(date);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    (Date as any).now = jest.fn(() => mockDate.getTime());
    return mockDate;
  },
  
  restoreDate: () => {
    jest.restoreAllMocks();
  }
};

// Mock fetch for Node.js environment
(global as any).fetch = jest.fn();

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset modules to ensure clean state
  jest.resetModules();
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