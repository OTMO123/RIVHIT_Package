/**
 * ParallelDiscoveryService Tests - TDD Implementation
 */

import { ParallelDiscoveryService, DiscoveryTarget, DiscoveryResult } from '../parallel-discovery.service';
import { NetworkDetectionService } from '../network-detection.service';
import { PrinterConnectionService } from '../printer-connection.service';

// Mock dependencies
jest.mock('../network-detection.service');
jest.mock('../printer-connection.service');

describe('ParallelDiscoveryService', () => {
  let service: ParallelDiscoveryService;
  let mockNetworkService: jest.Mocked<NetworkDetectionService>;
  let mockConnectionService: jest.Mocked<PrinterConnectionService>;

  beforeEach(() => {
    mockNetworkService = new NetworkDetectionService() as jest.Mocked<NetworkDetectionService>;
    mockConnectionService = new PrinterConnectionService() as jest.Mocked<PrinterConnectionService>;
    
    // Setup mock implementations
    mockNetworkService.suggestPrinterIPs = jest.fn();
    mockNetworkService.detectNetworkInfo = jest.fn();
    mockConnectionService.testMultipleConnections = jest.fn();
    mockConnectionService.testConnection = jest.fn();
    
    service = new ParallelDiscoveryService(mockNetworkService, mockConnectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('quickScan', () => {
    it('should perform quick scan of popular IP addresses', async () => {
      // Arrange
      const mockSuggestions = ['192.168.1.200', '192.168.14.200', '192.168.1.100'];
      const mockResults = [
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const, responseTime: 50 },
        { ip: '192.168.14.200', port: 9101, status: 'connected' as const, responseTime: 75 }
      ];

      mockNetworkService.suggestPrinterIPs.mockResolvedValue(mockSuggestions);
      mockConnectionService.testMultipleConnections.mockResolvedValue(mockResults);

      // Act
      const result = await service.quickScan();

      // Assert
      expect(result).toEqual({
        method: 'quick',
        duration: expect.any(Number),
        found: mockResults,
        scannedCount: expect.any(Number),
        successRate: expect.any(Number)
      });
      expect(mockNetworkService.suggestPrinterIPs).toHaveBeenCalled();
      expect(mockConnectionService.testMultipleConnections).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ ip: '192.168.1.200', port: 9101 }),
          expect.objectContaining({ ip: '192.168.14.200', port: 9101 })
        ]),
        expect.objectContaining({ maxConcurrent: 20 })
      );
    });

    it('should complete within 3 seconds', async () => {
      // Arrange
      mockNetworkService.suggestPrinterIPs.mockResolvedValue(['192.168.1.200']);
      mockConnectionService.testMultipleConnections.mockResolvedValue([]);

      // Act
      const startTime = Date.now();
      const result = await service.quickScan();
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(3000);
      expect(result.duration).toBeLessThan(3000);
    });

    it('should scan multiple ports for each IP', async () => {
      // Arrange
      const mockSuggestions = ['192.168.1.200'];
      mockNetworkService.suggestPrinterIPs.mockResolvedValue(mockSuggestions);
      mockConnectionService.testMultipleConnections.mockResolvedValue([]);

      // Act
      await service.quickScan();

      // Assert
      expect(mockConnectionService.testMultipleConnections).toHaveBeenCalledWith(
        expect.arrayContaining([
          { ip: '192.168.1.200', port: 9100 },
          { ip: '192.168.1.200', port: 9101 },
          { ip: '192.168.1.200', port: 9102 }
        ]),
        expect.any(Object)
      );
    });
  });

  describe('smartScan', () => {
    it('should perform smart scan based on network detection', async () => {
      // Arrange
      const mockNetworkInfo = {
        currentNetwork: '192.168.1',
        gateway: '192.168.1.1',
        subnet: '255.255.255.0',
        interfaces: [],
        suggestedRanges: ['192.168.1', '192.168.14']
      };

      const mockConnections = [
        { ip: '192.168.1.100', port: 9101, status: 'connected' as const, responseTime: 80 }
      ];

      mockNetworkService.detectNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockConnectionService.testMultipleConnections.mockResolvedValue(mockConnections);

      // Act
      const result = await service.smartScan();

      // Assert
      expect(result).toEqual({
        method: 'smart',
        duration: expect.any(Number),
        found: mockConnections,
        scannedCount: expect.any(Number),
        successRate: expect.any(Number),
        networks: ['192.168.1', '192.168.14']
      });
      expect(mockNetworkService.detectNetworkInfo).toHaveBeenCalled();
    });

    it('should prioritize current network first', async () => {
      // Arrange
      const mockNetworkInfo = {
        currentNetwork: '10.0.0',
        gateway: '10.0.0.1',
        subnet: '255.255.255.0',
        interfaces: [],
        suggestedRanges: ['10.0.0', '192.168.1']
      };

      mockNetworkService.detectNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockConnectionService.testMultipleConnections.mockResolvedValue([]);

      // Act
      await service.smartScan();

      // Assert
      const callArgs = mockConnectionService.testMultipleConnections.mock.calls[0][0];
      const firstBatch = callArgs.slice(0, 10); // First few IPs should be from current network
      expect(firstBatch.every((target: any) => target.ip.startsWith('10.0.0'))).toBe(true);
    });

    it('should complete within 8 seconds', async () => {
      // Arrange
      const mockNetworkInfo = {
        currentNetwork: '192.168.1',
        gateway: '192.168.1.1',
        subnet: '255.255.255.0',
        interfaces: [],
        suggestedRanges: ['192.168.1']
      };

      mockNetworkService.detectNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockConnectionService.testMultipleConnections.mockResolvedValue([]);

      // Act
      const startTime = Date.now();
      const result = await service.smartScan();
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(8000);
      expect(result.duration).toBeLessThan(8000);
    });
  });

  describe('comprehensiveScan', () => {
    it('should perform full network scan with all discovery methods', async () => {
      // Arrange
      const mockNetworkInfo = {
        currentNetwork: '192.168.1',
        gateway: '192.168.1.1',
        subnet: '255.255.255.0',
        interfaces: [],
        suggestedRanges: ['192.168.1']
      };

      const mockConnections = [
        { ip: '192.168.1.50', port: 9101, status: 'connected' as const, responseTime: 120 },
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const, responseTime: 95 }
      ];

      mockNetworkService.detectNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockConnectionService.testMultipleConnections.mockResolvedValue(mockConnections);

      // Act
      const result = await service.comprehensiveScan();

      // Assert
      expect(result).toEqual({
        method: 'comprehensive',
        duration: expect.any(Number),
        found: expect.arrayContaining([
          expect.objectContaining({ ip: '192.168.1.200', status: 'connected' }),
          expect.objectContaining({ ip: '192.168.1.50', status: 'connected' })
        ]),
        scannedCount: expect.any(Number),
        successRate: expect.any(Number),
        networks: ['192.168.1'],
        coverage: expect.objectContaining({
          totalIPs: expect.any(Number),
          scannedIPs: expect.any(Number),
          coveragePercent: expect.any(Number)
        })
      });
      expect(result.found).toHaveLength(2);
    });

    it('should scan comprehensive IP range in current network', async () => {
      // Arrange
      const mockNetworkInfo = {
        currentNetwork: '192.168.1',
        gateway: '192.168.1.1',
        subnet: '255.255.255.0',
        interfaces: [],
        suggestedRanges: ['192.168.1']
      };

      mockNetworkService.detectNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockConnectionService.testMultipleConnections.mockResolvedValue([]);

      // Act
      await service.comprehensiveScan();

      // Assert
      const callArgs = mockConnectionService.testMultipleConnections.mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThan(100); // Should scan many IPs
      
      // Should include a wide range of IPs (1-254)
      const ipEndings = callArgs.map((target: any) => parseInt(target.ip.split('.')[3]));
      expect(Math.min(...ipEndings)).toBeLessThan(10);
      expect(Math.max(...ipEndings)).toBeGreaterThan(200);
    });

    it('should handle large scan efficiently with batching', async () => {
      // Arrange
      const mockNetworkInfo = {
        currentNetwork: '192.168.1',
        gateway: '192.168.1.1',
        subnet: '255.255.255.0',
        interfaces: [],
        suggestedRanges: ['192.168.1', '192.168.0', '10.0.0'] // Multiple networks
      };

      mockNetworkService.detectNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockConnectionService.testMultipleConnections.mockResolvedValue([]);

      // Act
      const startTime = Date.now();
      await service.comprehensiveScan();
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds even for large scan
      expect(mockConnectionService.testMultipleConnections).toHaveBeenCalled();
    });
  });

  describe('scanCustomRange', () => {
    it('should scan custom IP range with specified parameters', async () => {
      // Arrange
      const targets = [
        { ip: '10.0.0.100', port: 9101 },
        { ip: '10.0.0.101', port: 9101 },
        { ip: '10.0.0.102', port: 9102 }
      ];

      const mockResults = [
        { ip: '10.0.0.100', port: 9101, status: 'connected' as const, responseTime: 60 }
      ];

      mockConnectionService.testMultipleConnections.mockResolvedValue(mockResults);

      // Act
      const result = await service.scanCustomRange(targets, { timeout: 2000, maxConcurrent: 5 });

      // Assert
      expect(result).toEqual({
        method: 'custom',
        duration: expect.any(Number),
        found: mockResults,
        scannedCount: targets.length,
        successRate: expect.any(Number),
        targets: targets
      });
      expect(mockConnectionService.testMultipleConnections).toHaveBeenCalledWith(
        targets,
        expect.objectContaining({ timeout: 2000, maxConcurrent: 5 })
      );
    });

    it('should handle empty target list gracefully', async () => {
      // Act
      const result = await service.scanCustomRange([]);

      // Assert
      expect(result).toEqual({
        method: 'custom',
        duration: expect.any(Number),
        found: [],
        scannedCount: 0,
        successRate: 0,
        targets: []
      });
      expect(mockConnectionService.testMultipleConnections).not.toHaveBeenCalled();
    });
  });

  describe('generateIPRange', () => {
    it('should generate smart IP range for network', () => {
      // Act
      const result = service.generateIPRange('192.168.1', 'smart');

      // Assert
      expect(result).toEqual(expect.arrayContaining([
        '192.168.1.1',
        '192.168.1.100',
        '192.168.1.200',
        '192.168.1.254'
      ]));
      expect(result.length).toBeGreaterThan(10);
      expect(result.length).toBeLessThan(50);
    });

    it('should generate comprehensive IP range for network', () => {
      // Act
      const result = service.generateIPRange('10.0.0', 'comprehensive');

      // Assert
      expect(result.length).toBeGreaterThan(200);
      expect(result).toContain('10.0.0.1');
      expect(result).toContain('10.0.0.254');
      expect(result.every(ip => ip.startsWith('10.0.0.'))).toBe(true);
    });

    it('should generate quick IP range with popular addresses', () => {
      // Act
      const result = service.generateIPRange('172.16.0', 'quick');

      // Assert
      expect(result).toEqual(expect.arrayContaining([
        '172.16.0.1',
        '172.16.0.100',
        '172.16.0.200'
      ]));
      expect(result.length).toBeLessThan(20);
    });
  });

  describe('performance and reliability', () => {
    it('should handle network timeout gracefully', async () => {
      // Arrange
      mockNetworkService.suggestPrinterIPs.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 50))
      );

      // Act
      const result = await service.quickScan();

      // Assert
      expect(result.found).toEqual([]);
      expect(result.method).toBe('quick');
      expect(result.duration).toBeGreaterThan(40); // Should be at least 50ms due to timeout
    });

    it('should calculate success rate correctly', async () => {
      // Arrange
      const mockResults = [
        { ip: '192.168.1.100', port: 9101, status: 'connected' as const, responseTime: 50 },
        { ip: '192.168.1.101', port: 9101, status: 'error' as const, responseTime: 3000 },
        { ip: '192.168.1.102', port: 9101, status: 'connected' as const, responseTime: 75 }
      ];

      mockNetworkService.suggestPrinterIPs.mockResolvedValue(['192.168.1.100']);
      mockConnectionService.testMultipleConnections.mockResolvedValue(mockResults);

      // Act
      const result = await service.quickScan();

      // Assert
      expect(result.successRate).toBeCloseTo(66.67, 1); // 2 out of 3 successful
      expect(result.found).toHaveLength(2); // Only connected printers
    });

    it('should sort results by response time', async () => {
      // Arrange
      const mockResults = [
        { ip: '192.168.1.102', port: 9101, status: 'connected' as const, responseTime: 150 },
        { ip: '192.168.1.100', port: 9101, status: 'connected' as const, responseTime: 50 },
        { ip: '192.168.1.101', port: 9101, status: 'connected' as const, responseTime: 100 }
      ];

      mockNetworkService.suggestPrinterIPs.mockResolvedValue(['192.168.1.100']);
      mockConnectionService.testMultipleConnections.mockResolvedValue(mockResults);

      // Act
      const result = await service.quickScan();

      // Assert
      expect(result.found[0].responseTime).toBeLessThanOrEqual(result.found[1].responseTime);
      expect(result.found[1].responseTime).toBeLessThanOrEqual(result.found[2].responseTime);
    });
  });
});