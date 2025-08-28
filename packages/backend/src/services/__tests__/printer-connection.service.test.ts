/**
 * PrinterConnectionService Tests - TDD Implementation
 */

import { PrinterConnectionService, ConnectionResult } from '../printer-connection.service';
import * as net from 'net';

// Mock net module
const mockSocket = {
  connect: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  destroy: jest.fn(),
  setTimeout: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  destroyed: false
};

jest.mock('net', () => ({
  Socket: jest.fn(() => mockSocket)
}));

describe('PrinterConnectionService', () => {
  let service: PrinterConnectionService;

  beforeEach(() => {
    service = new PrinterConnectionService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should successfully connect to a responsive printer', async () => {
      // Arrange
      const ip = '192.168.1.100';
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        }
        return mockSocket;
      });

      // Act
      const result = await service.testConnection(ip, port);

      // Assert
      expect(result).toEqual({
        ip,
        port,
        status: 'connected',
        responseTime: expect.any(Number),
        model: 'GoDEX Label Printer'
      });
      expect(result.responseTime).toBeLessThan(100);
      expect(mockSocket.connect).toHaveBeenCalledWith(port, ip);
      expect(mockSocket.setTimeout).toHaveBeenCalledWith(3000);
    });

    it('should handle connection timeout gracefully', async () => {
      // Arrange
      const ip = '192.168.1.200';
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'timeout') {
          setTimeout(() => handler(), 3100); // Timeout after 3.1 seconds
        }
        return mockSocket;
      });

      // Act
      const result = await service.testConnection(ip, port);

      // Assert
      expect(result).toEqual({
        ip,
        port,
        status: 'error',
        responseTime: expect.any(Number),
        error: 'Connection timeout'
      });
      expect(result.responseTime).toBeGreaterThan(3000);
    });

    it('should handle connection refused error', async () => {
      // Arrange
      const ip = '192.168.1.200'; // Valid IP address
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          const error = new Error('ECONNREFUSED');
          (error as any).code = 'ECONNREFUSED';
          setTimeout(() => handler(error), 50);
        }
        return mockSocket;
      });

      // Act
      const result = await service.testConnection(ip, port);

      // Assert
      expect(result).toEqual({
        ip,
        port,
        status: 'error',
        responseTime: expect.any(Number),
        error: 'Connection refused'
      });
    });

    it('should handle network unreachable error', async () => {
      // Arrange
      const ip = '10.0.0.1';
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          const error = new Error('ENETUNREACH');
          (error as any).code = 'ENETUNREACH';
          setTimeout(() => handler(error), 50);
        }
        return mockSocket;
      });

      // Act
      const result = await service.testConnection(ip, port);

      // Assert
      expect(result).toEqual({
        ip,
        port,
        status: 'error',
        responseTime: expect.any(Number),
        error: 'Network unreachable'
      });
    });

    it('should properly clean up socket resources', async () => {
      // Arrange
      const ip = '192.168.1.100';
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        }
        return mockSocket;
      });

      // Act
      await service.testConnection(ip, port);

      // Assert
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('testMultipleConnections', () => {
    it('should test multiple IP:port combinations concurrently', async () => {
      // Arrange
      const targets = [
        { ip: '192.168.1.100', port: 9101 },
        { ip: '192.168.1.101', port: 9101 },
        { ip: '192.168.1.102', port: 9102 }
      ];

      // Mock successful connections
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        }
        return mockSocket;
      });

      // Act
      const startTime = Date.now();
      const results = await service.testMultipleConnections(targets);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'connected')).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be concurrent, not sequential
    });

    it('should limit concurrent connections to prevent overwhelming', async () => {
      // Arrange
      const targets = Array.from({ length: 50 }, (_, i) => ({
        ip: `192.168.1.${100 + i}`,
        port: 9101
      }));

      let connectionCount = 0;
      const maxConcurrent = 10;

      mockSocket.connect.mockImplementation(() => {
        connectionCount++;
        expect(connectionCount).toBeLessThanOrEqual(maxConcurrent);
        return mockSocket;
      });

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => {
            connectionCount--;
            handler();
          }, 100);
        }
        return mockSocket;
      });

      // Act
      await service.testMultipleConnections(targets, { maxConcurrent });

      // Assert - all connections should have been processed
      expect(connectionCount).toBe(0);
    });
  });

  describe('identifyPrinter', () => {
    it('should identify GoDEX printer via EZPL status command', async () => {
      // Arrange
      const ip = '192.168.1.100';
      const port = 9101;
      const mockResponse = '~STATUS,0,0,0,200,0,0,0,0';

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        } else if (event === 'data') {
          setTimeout(() => handler(Buffer.from(mockResponse)), 50);
        }
        return mockSocket;
      });

      // Act
      const result = await service.identifyPrinter(ip, port);

      // Assert
      expect(result).toEqual({
        ip,
        port,
        status: 'connected',
        responseTime: expect.any(Number),
        model: 'GoDEX ZX420i',
        firmware: expect.any(String),
        capabilities: expect.objectContaining({
          protocols: ['EZPL'],
          maxWidth: expect.any(Number),
          features: expect.arrayContaining(['barcode', 'text'])
        })
      });
      
      expect(mockSocket.write).toHaveBeenCalledWith('~!S\r\n');
    });

    it('should handle printer identification timeout', async () => {
      // Arrange
      const ip = '192.168.1.100';
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        }
        // No data response - will timeout
        return mockSocket;
      });

      // Act
      const result = await service.identifyPrinter(ip, port);

      // Assert
      expect(result).toEqual({
        ip,
        port,
        status: 'connected',
        responseTime: expect.any(Number),
        model: 'Unknown Printer',
        error: 'Identification timeout'
      });
    });

    it('should identify Zebra printer via ZPL commands', async () => {
      // Arrange
      const ip = '192.168.1.100';
      const port = 9101;
      const mockResponse = 'ZEBRA ZT230 STATUS RESPONSE'; // Mock Zebra response

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        } else if (event === 'data') {
          setTimeout(() => handler(Buffer.from(mockResponse)), 50);
        }
        return mockSocket;
      });

      // Act
      const result = await service.identifyPrinter(ip, port);

      // Assert
      expect(result.model).toMatch(/zebra|zpl/i);
      expect(mockSocket.write).toHaveBeenCalledWith('~!S\r\n');
    });
  });

  describe('performance tests', () => {
    it('should complete single connection test within 5 seconds', async () => {
      // Arrange
      const ip = '192.168.1.100';
      const port = 9101;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 10);
        }
        return mockSocket;
      });

      // Act
      const startTime = Date.now();
      await service.testConnection(ip, port);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000);
    });

    it('should handle 20 concurrent connections efficiently', async () => {
      // Arrange
      const targets = Array.from({ length: 20 }, (_, i) => ({
        ip: `192.168.1.${100 + i}`,
        port: 9101
      }));

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), Math.random() * 100);
        }
        return mockSocket;
      });

      // Act
      const startTime = Date.now();
      const results = await service.testMultipleConnections(targets);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('error handling', () => {
    it('should handle malformed IP addresses gracefully', async () => {
      // Act
      const result = await service.testConnection('invalid-ip', 9101);

      // Assert
      expect(result).toEqual({
        ip: 'invalid-ip',
        port: 9101,
        status: 'error',
        responseTime: expect.any(Number),
        error: 'Invalid IP address'
      });
    });

    it('should handle invalid port numbers', async () => {
      // Act
      const result = await service.testConnection('192.168.1.100', 99999);

      // Assert
      expect(result).toEqual({
        ip: '192.168.1.100',
        port: 99999,
        status: 'error',
        responseTime: 0,
        error: 'Invalid port number'
      });
    });

    it('should handle socket creation failures', async () => {
      // Arrange
      const net = require('net');
      const originalSocketImpl = net.Socket.getMockImplementation();
      
      net.Socket.mockImplementation(() => {
        throw new Error('Socket creation failed');
      });

      // Act
      const result = await service.testConnection('192.168.1.100', 9101);

      // Assert - Just check that we get an error result
      expect(result.ip).toBe('192.168.1.100');
      expect(result.port).toBe(9101);
      expect(result.status).toBe('error');
      expect(typeof result.responseTime).toBe('number');
      expect(result.error).toBeDefined();
      // The error message might vary based on how the mock behaves
      expect(typeof result.error).toBe('string');

      // Restore mock
      net.Socket.mockImplementation(originalSocketImpl || (() => mockSocket));
    });
  });
});