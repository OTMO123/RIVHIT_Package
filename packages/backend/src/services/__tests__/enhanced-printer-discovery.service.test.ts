/**
 * EnhancedPrinterDiscoveryService Tests - TDD Integration Test
 */

import { EnhancedPrinterDiscoveryService, DiscoveryProgress } from '../enhanced-printer-discovery.service';
import { NetworkDetectionService } from '../network-detection.service';
import { PrinterConnectionService } from '../printer-connection.service';
import { ParallelDiscoveryService } from '../parallel-discovery.service';
import { PrinterCacheService } from '../printer-cache.service';

// Mock all dependencies
jest.mock('../network-detection.service');
jest.mock('../printer-connection.service');
jest.mock('../parallel-discovery.service');
jest.mock('../printer-cache.service');

describe('EnhancedPrinterDiscoveryService', () => {
  let service: EnhancedPrinterDiscoveryService;
  let mockNetworkService: jest.Mocked<NetworkDetectionService>;
  let mockConnectionService: jest.Mocked<PrinterConnectionService>;
  let mockParallelService: jest.Mocked<ParallelDiscoveryService>;
  let mockCacheService: jest.Mocked<PrinterCacheService>;

  beforeEach(() => {
    mockNetworkService = new NetworkDetectionService() as jest.Mocked<NetworkDetectionService>;
    mockConnectionService = new PrinterConnectionService() as jest.Mocked<PrinterConnectionService>;
    mockParallelService = new ParallelDiscoveryService(mockNetworkService, mockConnectionService) as jest.Mocked<ParallelDiscoveryService>;
    mockCacheService = new PrinterCacheService() as jest.Mocked<PrinterCacheService>;

    // Setup mock implementations
    mockParallelService.quickScan = jest.fn();
    mockParallelService.smartScan = jest.fn();
    mockParallelService.comprehensiveScan = jest.fn();
    mockCacheService.getCachedPrinters = jest.fn();
    mockCacheService.addPrinter = jest.fn();
    
    service = new EnhancedPrinterDiscoveryService(
      mockNetworkService,
      mockConnectionService, 
      mockParallelService,
      mockCacheService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('progressiveDiscovery', () => {
    it('should perform progressive discovery with cache first, then quick scan', async () => {
      // Arrange
      const mockCachedPrinters = [
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const, reliability: 0.9 }
      ];

      const mockQuickResults = {
        method: 'quick' as const,
        duration: 1500,
        found: [
          { ip: '192.168.1.201', port: 9101, status: 'connected' as const, responseTime: 75 }
        ],
        scannedCount: 15,
        successRate: 25.5
      };

      mockCacheService.getCachedPrinters.mockReturnValue(mockCachedPrinters as any);
      mockParallelService.quickScan.mockResolvedValue(mockQuickResults);

      // Act
      const result = await service.progressiveDiscovery();

      // Assert
      expect(result).toEqual({
        stages: expect.objectContaining({
          cache: expect.objectContaining({
            completed: true,
            found: 1,
            duration: expect.any(Number)
          }),
          quick: expect.objectContaining({
            completed: true,
            found: 1,
            duration: 1500
          })
        }),
        totalFound: 2,
        totalDuration: expect.any(Number),
        success: true
      });

      expect(mockCacheService.getCachedPrinters).toHaveBeenCalled();
      expect(mockParallelService.quickScan).toHaveBeenCalled();
    });

    it('should skip smart scan if enough printers found in quick scan', async () => {
      // Arrange
      const mockQuickResults = {
        method: 'quick' as const,
        duration: 1200,
        found: Array.from({ length: 5 }, (_, i) => ({
          ip: `192.168.1.${200 + i}`,
          port: 9101,
          status: 'connected' as const,
          responseTime: 80
        })),
        scannedCount: 20,
        successRate: 25
      };

      mockCacheService.getCachedPrinters.mockReturnValue([]);
      mockParallelService.quickScan.mockResolvedValue(mockQuickResults);

      // Act
      const result = await service.progressiveDiscovery({ minPrinters: 3 });

      // Assert
      expect(result.stages.smart?.completed).toBeFalsy();
      expect(result.totalFound).toBe(5);
      expect(mockParallelService.smartScan).not.toHaveBeenCalled();
    });

    it('should continue to smart scan if not enough printers found', async () => {
      // Arrange
      const mockQuickResults = {
        method: 'quick' as const,
        duration: 1000,
        found: [
          { ip: '192.168.1.200', port: 9101, status: 'connected' as const, responseTime: 60 }
        ],
        scannedCount: 15,
        successRate: 6.67
      };

      const mockSmartResults = {
        method: 'smart' as const,
        duration: 4500,
        found: [
          { ip: '192.168.1.201', port: 9101, status: 'connected' as const, responseTime: 95 },
          { ip: '192.168.14.200', port: 9101, status: 'connected' as const, responseTime: 120 }
        ],
        scannedCount: 45,
        successRate: 4.44,
        networks: ['192.168.1', '192.168.14']
      };

      mockCacheService.getCachedPrinters.mockReturnValue([]);
      mockParallelService.quickScan.mockResolvedValue(mockQuickResults);
      mockParallelService.smartScan.mockResolvedValue(mockSmartResults);

      // Act
      const result = await service.progressiveDiscovery({ minPrinters: 3, maxDuration: 10000 });

      // Assert
      expect(result.stages.smart?.completed).toBe(true);
      expect(result.totalFound).toBe(3);
      expect(mockParallelService.smartScan).toHaveBeenCalled();
    });

    it('should perform comprehensive scan if needed and time allows', async () => {
      // Arrange
      const mockSmartResults = {
        method: 'smart' as const,
        duration: 3000,
        found: [],
        scannedCount: 50,
        successRate: 0
      };

      const mockComprehensiveResults = {
        method: 'comprehensive' as const,
        duration: 12000,
        found: [
          { ip: '192.168.1.150', port: 9101, status: 'connected' as const, responseTime: 200 }
        ],
        scannedCount: 765,
        successRate: 0.13,
        coverage: { totalIPs: 765, scannedIPs: 255, coveragePercent: 33.3 }
      };

      mockCacheService.getCachedPrinters.mockReturnValue([]);
      mockParallelService.quickScan.mockResolvedValue({ method: 'quick' as const, duration: 800, found: [], scannedCount: 15, successRate: 0 });
      mockParallelService.smartScan.mockResolvedValue(mockSmartResults);
      mockParallelService.comprehensiveScan.mockResolvedValue(mockComprehensiveResults);

      // Act
      const result = await service.progressiveDiscovery({ 
        minPrinters: 1, 
        maxDuration: 20000,
        forceComprehensive: true 
      });

      // Assert
      expect(result.stages.comprehensive?.completed).toBe(true);
      expect(result.totalFound).toBe(1);
      expect(mockParallelService.comprehensiveScan).toHaveBeenCalled();
    });

    it('should respect maxDuration limit', async () => {
      // Arrange
      mockCacheService.getCachedPrinters.mockReturnValue([]);
      mockParallelService.quickScan.mockResolvedValue({
        method: 'quick' as const,
        duration: 1500,
        found: [],
        scannedCount: 15,
        successRate: 0
      });

      mockParallelService.smartScan.mockResolvedValue({
        method: 'smart' as const,
        duration: 6000,
        found: [],
        scannedCount: 45,
        successRate: 0
      });

      // Act
      const result = await service.progressiveDiscovery({ maxDuration: 5000 });

      // Assert
      expect(result.stages.smart?.completed).toBeFalsy();
      expect(result.totalDuration).toBeLessThan(5000);
    });
  });

  describe('findGoDEXPrinters', () => {
    it('should be an alias for progressive discovery with optimal settings', async () => {
      // Arrange
      const spy = jest.spyOn(service, 'progressiveDiscovery');
      spy.mockResolvedValue({
        stages: { cache: { completed: true, found: 0, duration: 50 } },
        totalFound: 0,
        totalDuration: 50,
        success: true
      });

      // Act
      await service.findGoDEXPrinters();

      // Assert
      expect(spy).toHaveBeenCalledWith({
        minPrinters: 1,
        maxDuration: 15000,
        updateCache: true
      });
    });
  });

  describe('quickScan', () => {
    it('should perform cache check then quick scan', async () => {
      // Arrange
      const mockCachedPrinters = [
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const, reliability: 0.8 }
      ];

      const mockQuickResults = {
        method: 'quick' as const,
        duration: 1200,
        found: [
          { ip: '192.168.1.201', port: 9101, status: 'connected' as const, responseTime: 65 }
        ],
        scannedCount: 18,
        successRate: 5.56
      };

      mockCacheService.getCachedPrinters.mockReturnValue(mockCachedPrinters as any);
      mockParallelService.quickScan.mockResolvedValue(mockQuickResults);

      // Act
      const result = await service.quickScan();

      // Assert
      expect(result.found).toHaveLength(2);
      expect(result.method).toBe('quick');
      expect(result.fromCache).toBe(1);
      expect(result.fromScan).toBe(1);
    });
  });

  describe('testPrinter', () => {
    it('should test specific printer and update cache', async () => {
      // Arrange
      const mockTestResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected' as const,
        responseTime: 85,
        model: 'GoDEX ZX420i'
      };

      mockConnectionService.testConnection.mockResolvedValue(mockTestResult);

      // Act
      const result = await service.testPrinter('192.168.1.100', 9101);

      // Assert
      expect(result).toEqual(mockTestResult);
      expect(mockConnectionService.testConnection).toHaveBeenCalledWith('192.168.1.100', 9101);
      expect(mockCacheService.addPrinter).toHaveBeenCalledWith(mockTestResult, 'manual-test');
    });

    it('should handle connection failures gracefully', async () => {
      // Arrange
      const mockErrorResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'error' as const,
        responseTime: 3000,
        error: 'Connection timeout'
      };

      mockConnectionService.testConnection.mockResolvedValue(mockErrorResult);

      // Act
      const result = await service.testPrinter('192.168.1.100', 9101);

      // Assert
      expect(result).toEqual(mockErrorResult);
      expect(mockCacheService.addPrinter).not.toHaveBeenCalled();
    });
  });

  describe('getCachedPrinters', () => {
    it('should return cached printers from cache service', () => {
      // Arrange
      const mockCachedPrinters = [
        {
          ip: '192.168.1.200',
          port: 9101,
          status: 'connected' as const,
          reliability: 0.9,
          discoveryMethod: 'snmp',
          firstSeen: new Date(),
          lastSeen: new Date(),
          seenCount: 5
        }
      ];

      mockCacheService.getCachedPrinters.mockReturnValue(mockCachedPrinters as any);

      // Act
      const result = service.getCachedPrinters();

      // Assert
      expect(result).toEqual(mockCachedPrinters);
      expect(mockCacheService.getCachedPrinters).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the printer cache', () => {
      // Act
      service.clearCache();

      // Assert
      expect(mockCacheService.clearCache).toHaveBeenCalled();
    });
  });

  describe('getDiscoveryStats', () => {
    it('should return comprehensive discovery statistics', async () => {
      // Arrange
      const mockCacheStats = {
        totalEntries: 5,
        connectedPrinters: 4,
        averageReliability: 0.85,
        discoveryMethods: { 'port-scan': 3, 'snmp': 2 },
        oldestEntry: new Date('2025-08-28T08:00:00Z'),
        newestEntry: new Date('2025-08-28T08:30:00Z')
      };

      mockCacheService.getStats.mockReturnValue(mockCacheStats);
      
      // Perform a discovery to initialize stats
      mockCacheService.getCachedPrinters.mockReturnValue([]);
      mockParallelService.quickScan.mockResolvedValue({
        method: 'quick' as const,
        duration: 1000,
        found: [],
        scannedCount: 10,
        successRate: 0
      });
      
      await service.progressiveDiscovery();

      // Act
      const result = service.getDiscoveryStats();

      // Assert
      expect(result).toEqual(expect.objectContaining({
        cache: mockCacheStats,
        lastDiscovery: expect.any(Date),
        totalDiscoveries: expect.any(Number)
      }));
      expect(result.totalDiscoveries).toBeGreaterThan(0);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network service failures gracefully', async () => {
      // Arrange - Make both cache and quick scan fail
      mockCacheService.getCachedPrinters.mockImplementation(() => {
        throw new Error('Cache service failed');
      });
      mockParallelService.quickScan.mockRejectedValue(new Error('Network unreachable'));

      // Act
      const result = await service.progressiveDiscovery();

      // Assert
      expect(result.success).toBe(false);
      expect(result.totalFound).toBe(0);
    });

    it('should handle partial failures in discovery stages', async () => {
      // Arrange
      mockCacheService.getCachedPrinters.mockReturnValue([
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const, reliability: 0.9 } as any
      ]);

      mockParallelService.quickScan.mockRejectedValue(new Error('Quick scan failed'));
      
      // Act
      const result = await service.progressiveDiscovery();

      // Assert
      expect(result.totalFound).toBe(1); // Still found one from cache
      expect(result.stages.cache?.completed).toBe(true);
      expect(result.stages.quick?.completed).toBe(false);
    });

    it('should validate printer addresses before testing', async () => {
      // Act & Assert
      await expect(service.testPrinter('invalid-ip', 9101))
        .rejects.toThrow('Invalid IP address');

      await expect(service.testPrinter('192.168.1.100', 99999))
        .rejects.toThrow('Invalid port number');
    });
  });

  describe('progress callback functionality', () => {
    it('should call progress callback during discovery', async () => {
      // Arrange
      const progressCallback = jest.fn();
      
      mockCacheService.getCachedPrinters.mockReturnValue([]);
      mockParallelService.quickScan.mockResolvedValue({
        method: 'quick' as const,
        duration: 1000,
        found: [],
        scannedCount: 15,
        successRate: 0
      });

      // Act
      await service.progressiveDiscovery({ progressCallback });

      // Assert
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'cache',
          progress: expect.any(Number),
          currentAction: expect.any(String),
          found: expect.any(Array)
        })
      );
    });
  });
});