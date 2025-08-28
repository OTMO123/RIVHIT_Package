/**
 * PrinterCacheService Tests - TDD Implementation
 */

import { PrinterCacheService, CachedPrinterInfo, CacheEntry } from '../printer-cache.service';
import { ConnectionResult } from '../printer-connection.service';

describe('PrinterCacheService', () => {
  let service: PrinterCacheService;

  beforeEach(() => {
    service = new PrinterCacheService();
    // Clear any existing cache
    service.clearCache();
  });

  describe('addPrinter', () => {
    it('should add new printer to cache', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50,
        model: 'GoDEX ZX420i'
      };

      // Act
      service.addPrinter(printer, 'port-scan');

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached).toHaveLength(1);
      expect(cached[0]).toEqual(expect.objectContaining({
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        model: 'GoDEX ZX420i',
        discoveryMethod: 'port-scan',
        reliability: 0.7,
        firstSeen: expect.any(Date),
        lastSeen: expect.any(Date),
        seenCount: 1
      }));
    });

    it('should update existing printer reliability', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      // Act
      service.addPrinter(printer, 'port-scan');
      service.addPrinter(printer, 'snmp');

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached).toHaveLength(1);
      expect(cached[0].reliability).toBeCloseTo(0.8, 1); // 0.7 + 0.1
      expect(cached[0].seenCount).toBe(2);
      expect(cached[0].discoveryMethod).toBe('snmp'); // Latest method
    });

    it('should cap reliability at 1.0', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      // Act - Add same printer 10 times
      for (let i = 0; i < 10; i++) {
        service.addPrinter(printer, 'port-scan');
      }

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached[0].reliability).toBe(1.0);
      expect(cached[0].seenCount).toBe(10);
    });

    it('should update average response time', () => {
      // Arrange
      const printer1: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      const printer2: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 150
      };

      // Act
      service.addPrinter(printer1, 'port-scan');
      service.addPrinter(printer2, 'port-scan');

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached[0].averageResponseTime).toBe(100); // (50 + 150) / 2
    });
  });

  describe('getCachedPrinters', () => {
    it('should return printers sorted by reliability', () => {
      // Arrange
      const printer1: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      const printer2: ConnectionResult = {
        ip: '192.168.1.101',
        port: 9101,
        status: 'connected',
        responseTime: 75
      };

      // Act
      service.addPrinter(printer1, 'port-scan');
      service.addPrinter(printer2, 'snmp'); // Higher initial reliability
      service.addPrinter(printer2, 'mdns'); // Even higher reliability

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached).toHaveLength(2);
      expect(cached[0].ip).toBe('192.168.1.101'); // Higher reliability first
      expect(cached[1].ip).toBe('192.168.1.100');
    });

    it('should exclude expired entries', async () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      // Act
      service.addPrinter(printer, 'port-scan');
      
      // Manually expire the entry
      const key = '192.168.1.100:9101';
      (service as any).cache.get(key).lastSeen = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached).toHaveLength(0);
    });

    it('should validate cached printers if configured', async () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      const mockValidator = jest.fn().mockResolvedValue(true);
      service.setValidator(mockValidator);

      // Act
      service.addPrinter(printer, 'port-scan');
      const cached = await service.getCachedPrintersWithValidation();

      // Assert
      expect(cached).toHaveLength(1);
      expect(mockValidator).toHaveBeenCalledWith('192.168.1.100', 9101);
    });
  });

  describe('getPrinterByAddress', () => {
    it('should find printer by IP and port', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50,
        model: 'GoDEX ZX420i'
      };

      service.addPrinter(printer, 'port-scan');

      // Act
      const found = service.getPrinterByAddress('192.168.1.100', 9101);

      // Assert
      expect(found).toEqual(expect.objectContaining({
        ip: '192.168.1.100',
        port: 9101,
        model: 'GoDEX ZX420i'
      }));
    });

    it('should return null for non-existent printer', () => {
      // Act
      const found = service.getPrinterByAddress('192.168.1.200', 9101);

      // Assert
      expect(found).toBeNull();
    });

    it('should return null for expired printer', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      service.addPrinter(printer, 'port-scan');
      
      // Manually expire
      const key = '192.168.1.100:9101';
      (service as any).cache.get(key).lastSeen = new Date(Date.now() - 10 * 60 * 1000);

      // Act
      const found = service.getPrinterByAddress('192.168.1.100', 9101);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('updatePrinterStatus', () => {
    it('should update status of existing printer', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      service.addPrinter(printer, 'port-scan');

      // Act
      service.updatePrinterStatus('192.168.1.100', 9101, 'error', 3000);

      // Assert
      const cached = service.getPrinterByAddress('192.168.1.100', 9101);
      expect(cached?.status).toBe('error');
      expect(cached?.averageResponseTime).toBeGreaterThan(50);
      expect(cached?.reliability).toBeLessThan(0.7); // Should decrease
    });

    it('should increase reliability on successful status', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'error',
        responseTime: 3000
      };

      service.addPrinter(printer, 'port-scan');
      const initialReliability = service.getPrinterByAddress('192.168.1.100', 9101)!.reliability;

      // Act
      service.updatePrinterStatus('192.168.1.100', 9101, 'connected', 80);

      // Assert
      const cached = service.getPrinterByAddress('192.168.1.100', 9101);
      expect(cached?.status).toBe('connected');
      expect(cached?.reliability).toBeGreaterThan(initialReliability);
    });

    it('should not update non-existent printer', () => {
      // Act
      const result = service.updatePrinterStatus('192.168.1.200', 9101, 'connected', 50);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('clearExpired', () => {
    it('should remove expired entries', () => {
      // Arrange
      const printer1: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      const printer2: ConnectionResult = {
        ip: '192.168.1.101',
        port: 9101,
        status: 'connected',
        responseTime: 75
      };

      service.addPrinter(printer1, 'port-scan');
      service.addPrinter(printer2, 'port-scan');

      // Expire first printer
      const key1 = '192.168.1.100:9101';
      (service as any).cache.get(key1).lastSeen = new Date(Date.now() - 10 * 60 * 1000);

      // Act
      const removedCount = service.clearExpired();

      // Assert
      expect(removedCount).toBe(1);
      expect(service.getCachedPrinters()).toHaveLength(1);
      expect(service.getCachedPrinters()[0].ip).toBe('192.168.1.101');
    });

    it('should remove low-reliability entries when cleaning', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      service.addPrinter(printer, 'port-scan');
      
      // Decrease reliability significantly
      for (let i = 0; i < 10; i++) {
        service.updatePrinterStatus('192.168.1.100', 9101, 'error', 3000);
      }

      // Act
      const removedCount = service.clearExpired(0.3); // Remove below 30% reliability

      // Assert
      expect(removedCount).toBe(1);
      expect(service.getCachedPrinters()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      // Arrange
      const printer1: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50
      };

      const printer2: ConnectionResult = {
        ip: '192.168.1.101',
        port: 9101,
        status: 'error',
        responseTime: 3000
      };

      service.addPrinter(printer1, 'port-scan');
      service.addPrinter(printer2, 'snmp');

      // Act
      const stats = service.getStats();

      // Assert
      expect(stats).toEqual({
        totalEntries: 2,
        connectedPrinters: 1,
        averageReliability: expect.any(Number),
        discoveryMethods: expect.objectContaining({
          'port-scan': 1,
          'snmp': 1
        }),
        oldestEntry: expect.any(Date),
        newestEntry: expect.any(Date)
      });
      expect(stats.averageReliability).toBeGreaterThan(0);
    });

    it('should return empty stats for empty cache', () => {
      // Act
      const stats = service.getStats();

      // Assert
      expect(stats).toEqual({
        totalEntries: 0,
        connectedPrinters: 0,
        averageReliability: 0,
        discoveryMethods: {},
        oldestEntry: null,
        newestEntry: null
      });
    });
  });

  describe('exportCache and importCache', () => {
    it('should export and import cache data', () => {
      // Arrange
      const printer: ConnectionResult = {
        ip: '192.168.1.100',
        port: 9101,
        status: 'connected',
        responseTime: 50,
        model: 'GoDEX ZX420i'
      };

      service.addPrinter(printer, 'port-scan');

      // Act
      const exported = service.exportCache();
      service.clearCache();
      service.importCache(exported);

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached).toHaveLength(1);
      expect(cached[0]).toEqual(expect.objectContaining({
        ip: '192.168.1.100',
        port: 9101,
        model: 'GoDEX ZX420i'
      }));
    });

    it('should handle invalid import data gracefully', () => {
      // Arrange
      const invalidData = 'invalid json';

      // Act & Assert
      expect(() => service.importCache(invalidData)).toThrow();
    });
  });

  describe('performance tests', () => {
    it('should handle 1000 cache entries efficiently', () => {
      // Arrange - Create service with larger cache size
      const largeService = new PrinterCacheService({ maxCacheSize: 1500 });
      
      // Act
      const startTime = Date.now();
      
      for (let i = 1; i <= 1000; i++) {
        const printer: ConnectionResult = {
          ip: `192.168.${Math.floor(i / 254)}.${i % 254 + 1}`,
          port: 9101,
          status: 'connected',
          responseTime: Math.floor(Math.random() * 200) + 50
        };
        largeService.addPrinter(printer, 'port-scan');
      }
      
      const addTime = Date.now() - startTime;
      
      // Retrieve all
      const retrieveStart = Date.now();
      const cached = largeService.getCachedPrinters();
      const retrieveTime = Date.now() - retrieveStart;

      // Assert
      expect(addTime).toBeLessThan(1000); // Should add 1000 entries in < 1 second
      expect(retrieveTime).toBeLessThan(100); // Should retrieve in < 100ms
      expect(cached).toHaveLength(1000);
    });

    it('should limit cache size and remove least reliable entries', () => {
      // Arrange - Set a small cache limit
      const service = new PrinterCacheService({ maxCacheSize: 10 });
      
      // Act - Add more entries than limit
      for (let i = 1; i <= 20; i++) {
        const printer: ConnectionResult = {
          ip: `192.168.1.${i}`,
          port: 9101,
          status: 'connected',
          responseTime: 50
        };
        service.addPrinter(printer, 'port-scan');
      }

      // Assert
      const cached = service.getCachedPrinters();
      expect(cached.length).toBeLessThanOrEqual(10);
    });
  });
});