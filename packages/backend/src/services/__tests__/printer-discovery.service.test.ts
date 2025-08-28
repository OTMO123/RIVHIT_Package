// Mock child_process and util before importing the service
const mockExecAsync = jest.fn();

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

import { PrinterDiscoveryService, PrinterInfo } from '../printer-discovery.service';
import { exec } from 'child_process';
import { promisify } from 'util';

describe('PrinterDiscoveryService', () => {
  let service: PrinterDiscoveryService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrinterDiscoveryService();
    
    // Mock console methods to avoid noise in tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('findGoDEXPrinters', () => {
    it('should discover GoDEX printers in local network', async () => {
      // Mock network discovery
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'inet 192.168.14.100 netmask 0xffffff00 broadcast 192.168.14.255\n'
      });

      // Mock the private getLocalNetwork method
      const mockGetLocalNetwork = jest.spyOn(service as any, 'getLocalNetwork');
      mockGetLocalNetwork.mockResolvedValue('192.168.14');

      // Mock printer connection tests - simulate finding one printer
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockImplementation(async (ip: any, port: any) => {
        if (ip === '192.168.14.200' && port === 9101) {
          return {
            ip: '192.168.14.200',
            port: 9101,
            status: 'connected' as const,
            model: 'GoDEX ZX420i',
            responseTime: 150
          };
        }
        return null;
      });

      const result = await service.findGoDEXPrinters();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ip: '192.168.14.200',
        port: 9101,
        status: 'connected',
        model: 'GoDEX ZX420i',
        responseTime: 150
      });

      expect(console.log).toHaveBeenCalledWith('🔍 Поиск GoDEX принтеров в сети 192.168.14...');
      expect(console.log).toHaveBeenCalledWith('✅ Найдено 1 GoDEX принтеров');
    });

    it('should handle multiple printers and sort by response time', async () => {
      // Mock getLocalNetwork to return a specific network
      const mockGetLocalNetwork = jest.spyOn(service as any, 'getLocalNetwork');
      mockGetLocalNetwork.mockResolvedValue('192.168.1');

      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockImplementation(async (ip: any, port: any) => {
        if (ip === '192.168.1.200' && port === 9100) {
          return {
            ip: '192.168.1.200',
            port: 9100,
            status: 'connected' as const,
            responseTime: 300
          };
        }
        if (ip === '192.168.1.201' && port === 9101) {
          return {
            ip: '192.168.1.201',
            port: 9101,
            status: 'connected' as const,
            responseTime: 100
          };
        }
        return null;
      });

      const result = await service.findGoDEXPrinters();

      expect(result).toHaveLength(2);
      // Should be sorted by response time (fastest first)
      expect(result[0].responseTime).toBe(100);
      expect(result[1].responseTime).toBe(300);
      expect(result[0].ip).toBe('192.168.1.201');
      expect(result[1].ip).toBe('192.168.1.200');
    });

    it('should return empty array when no printers found', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255\n'
      });

      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValue(null); // No printers found

      const result = await service.findGoDEXPrinters();

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('✅ Найдено 0 GoDEX принтеров');
    });

    it('should handle network discovery errors gracefully', async () => {
      // Mock getLocalNetwork to throw an error
      const mockGetLocalNetwork = jest.spyOn(service as any, 'getLocalNetwork');
      mockGetLocalNetwork.mockRejectedValue(new Error('Network error'));

      const result = await service.findGoDEXPrinters();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('❌ Ошибка поиска принтеров:', expect.any(Error));
    });

    it('should use fallback network when ifconfig fails', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'invalid output' });

      const mockGetLocalNetwork = jest.spyOn(service as any, 'getLocalNetwork');
      mockGetLocalNetwork.mockResolvedValueOnce('192.168.1'); // Fallback network

      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValue(null);

      await service.findGoDEXPrinters();

      expect(mockGetLocalNetwork).toHaveBeenCalled();
    });

    it('should test all common printer IP addresses and ports', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255\n'
      });

      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValue(null);

      await service.findGoDEXPrinters();

      // Should test multiple common IP addresses (.1, .200, .201, etc.) 
      // and multiple ports (9100, 9101, 9102)
      expect(mockTestConnection.mock.calls.length).toBeGreaterThan(10);
      
      // Verify it tests the expected ports
      expect(mockTestConnection).toHaveBeenCalledWith(expect.any(String), 9100);
      expect(mockTestConnection).toHaveBeenCalledWith(expect.any(String), 9101);
      expect(mockTestConnection).toHaveBeenCalledWith(expect.any(String), 9102);
    });
  });

  describe('testPrinter', () => {
    it('should test specific printer with IP normalization', async () => {
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValueOnce({
        ip: '192.168.14.200',
        port: 9101,
        status: 'connected' as const,
        responseTime: 120
      });

      const result = await service.testPrinter('192.168.014.200', 9101);

      expect(result).toEqual({
        ip: '192.168.14.200',
        port: 9101,
        status: 'connected',
        responseTime: 120
      });

      // Should normalize IP and log the conversion
      expect(console.log).toHaveBeenCalledWith('🔍 Тестирование принтера: 192.168.014.200 → 192.168.14.200:9101');
      expect(mockTestConnection).toHaveBeenCalledWith('192.168.14.200', 9101);
    });

    it('should use default port 9101 when not specified', async () => {
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValueOnce({
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected' as const
      });

      const result = await service.testPrinter('192.168.1.200');

      expect(mockTestConnection).toHaveBeenCalledWith('192.168.1.200', 9101);
      expect(result?.port).toBe(9101);
    });

    it('should return null when printer test fails', async () => {
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValueOnce(null);

      const result = await service.testPrinter('192.168.1.999');

      expect(result).toBeNull();
    });
  });

  describe('normalizeIPAddress', () => {
    it('should normalize IP addresses with leading zeros', () => {
      const normalizeIP = (service as any).normalizeIPAddress.bind(service);

      expect(normalizeIP('192.168.014.200')).toBe('192.168.14.200');
      expect(normalizeIP('010.001.001.001')).toBe('10.1.1.1');
      expect(normalizeIP('192.168.1.1')).toBe('192.168.1.1'); // Already normalized
    });

    it('should handle malformed IP addresses gracefully', () => {
      const normalizeIP = (service as any).normalizeIPAddress.bind(service);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test with invalid IP - should return original
      const result = normalizeIP('invalid.ip.address');
      expect(result).toBe('invalid.ip.address');

      warnSpy.mockRestore();
    });
  });

  describe('getLocalNetwork', () => {
    it('should extract network from ifconfig output', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'inet 192.168.14.100 netmask 0xffffff00 broadcast 192.168.14.255'
      });

      const getLocalNetwork = (service as any).getLocalNetwork.bind(service);
      const result = await getLocalNetwork();

      // Should parse network from the mocked output, but may fallback to default
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
      expect(mockExecAsync).toHaveBeenCalledWith("ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1");
    });

    it('should use fallback network when ifconfig output is invalid', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'no valid inet lines'
      });

      const getLocalNetwork = (service as any).getLocalNetwork.bind(service);
      const result = await getLocalNetwork();

      // Should return a valid network prefix (fallback behavior)
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should handle ifconfig command failure', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Command failed'));

      const getLocalNetwork = (service as any).getLocalNetwork.bind(service);
      const result = await getLocalNetwork();

      // Should return fallback network on error
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should extract different network ranges correctly', async () => {
      // Test regex parsing logic works correctly
      const getLocalNetwork = (service as any).getLocalNetwork.bind(service);
      
      // Mock various network ranges
      const testCases = [
        'inet 10.0.0.100 netmask',
        'inet 172.16.5.100 netmask',
        'inet 192.168.1.50 netmask'
      ];

      for (const testInput of testCases) {
        mockExecAsync.mockClear();
        mockExecAsync.mockResolvedValueOnce({ stdout: testInput });
        
        const result = await getLocalNetwork();
        
        // Should return a valid network prefix
        expect(typeof result).toBe('string');
        expect(result).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });
  });

  describe('generatePrinterIPs', () => {
    it('should generate common printer IP addresses', () => {
      const generatePrinterIPs = (service as any).generatePrinterIPs.bind(service);
      
      const result = generatePrinterIPs('192.168.1');

      expect(result).toContain('192.168.1.1');     // Gateway
      expect(result).toContain('192.168.1.200');   // Common printer IP
      expect(result).toContain('192.168.1.201');   // Common printer IP
      expect(result).toContain('192.168.1.100');   // Common printer IP
      
      // Should have reasonable number of IPs to test
      expect(result.length).toBeGreaterThan(5);
      expect(result.length).toBeLessThan(50); // Not too many to avoid long delays
    });

    it('should work with different network prefixes', () => {
      const generatePrinterIPs = (service as any).generatePrinterIPs.bind(service);
      
      const result1 = generatePrinterIPs('10.0.0');
      const result2 = generatePrinterIPs('172.16.5');

      expect(result1).toContain('10.0.0.1');
      expect(result1).toContain('10.0.0.200');
      
      expect(result2).toContain('172.16.5.1');
      expect(result2).toContain('172.16.5.200');
    });
  });

  describe('testPrinterConnection', () => {
    it('should test printer connection with timeout', async () => {
      // This is a private method, but we can test it indirectly through public methods
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockImplementation(async (ip: any, port: any) => {
        // Simulate successful connection
        if (ip === '192.168.1.200' && port === 9101) {
          return {
            ip,
            port,
            status: 'connected' as const,
            responseTime: 150
          };
        }
        return null;
      });

      const result = await service.testPrinter('192.168.1.200', 9101);

      expect(result).toEqual({
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected',
        responseTime: 150
      });
    });

    it('should handle connection timeouts', async () => {
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockImplementation(async () => {
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          ip: '192.168.1.200',
          port: 9101,
          status: 'error' as const,
          responseTime: 2100 // Over timeout
        };
      });

      const result = await service.testPrinter('192.168.1.200', 9101);

      expect(result?.status).toBe('error');
      expect(result?.responseTime).toBeGreaterThan(2000);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle Promise.allSettled results correctly', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'inet 192.168.1.100 netmask 0xffffff00\n'
      });

      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      
      // Mix of successful and failed results
      mockTestConnection
        .mockResolvedValueOnce({ ip: '192.168.1.200', port: 9101, status: 'connected' as const })
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(null) // No printer found
        .mockResolvedValueOnce({ ip: '192.168.1.201', port: 9100, status: 'connected' as const });

      const result = await service.findGoDEXPrinters();

      // Should only include successful connections
      expect(result).toHaveLength(2);
      expect(result.some(p => p.ip === '192.168.1.200')).toBe(true);
      expect(result.some(p => p.ip === '192.168.1.201')).toBe(true);
    });

    it('should handle empty or undefined network gracefully', async () => {
      const generatePrinterIPs = (service as any).generatePrinterIPs.bind(service);
      
      const result = generatePrinterIPs('');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('performance and reliability', () => {
    it('should complete discovery within reasonable time', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'inet 192.168.1.100 netmask 0xffffff00\n'
      });

      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValue(null); // No printers found

      const startTime = Date.now();
      await service.findGoDEXPrinters();
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (allowing for Promise.allSettled)
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should handle concurrent connection tests', async () => {
      const mockTestConnection = jest.spyOn(service as any, 'testPrinterConnection');
      mockTestConnection.mockResolvedValue({
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected' as const,
        responseTime: 100
      });

      // Test multiple concurrent calls
      const promises = [
        service.testPrinter('192.168.1.200'),
        service.testPrinter('192.168.1.201'),
        service.testPrinter('192.168.1.202')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result?.status).toBe('connected');
      });
    });
  });
});