# Test-Driven Development Plan for Enhanced Printer Discovery
## Comprehensive Implementation Strategy with Deep Dive Analysis

**Date:** August 28, 2025  
**Approach:** Test-Driven Development (TDD)  
**Target:** Reliable GoDEX printer discovery with 95%+ success rate  

---

## Current Architecture Deep Dive Analysis

### **Existing Codebase Analysis**

#### **Frontend Components Architecture**
```typescript
// Current structure analysis
PrinterDiscovery.tsx (320 lines)
├── State Management
│   ├── printers: PrinterInfo[] - список найденных принтеров
│   ├── loading: boolean - состояние поиска  
│   ├── testingIP: string - IP для тестирования
│   └── testLoading: boolean - состояние теста
├── API Integration
│   ├── /api/printers/quick-scan - автоматический поиск
│   └── /api/printers/test - тест конкретного IP
└── UI Components
    ├── Auto search button
    ├── Manual IP test form  
    └── Found printers list

PrinterSettings.tsx (564 lines)
├── Configuration Management
│   ├── PrinterConfig interface - настройки принтера
│   ├── connectionType: 'usb' | 'network'
│   └── Local storage persistence
├── Network Discovery
│   ├── scanForPrinters() - сканирование популярных IP
│   ├── checkPrinterPort() - проверка порта через fetch
│   └── Parallel scanning with Promise.allSettled
└── Real-time Results
    ├── foundPrinters: FoundPrinter[] 
    └── Progressive updates during scan
```

#### **Backend Services Architecture**
```typescript
// Current backend structure
PrinterDiscoveryService (250 lines)
├── Network Discovery
│   ├── findGoDEXPrinters() - основной поиск
│   ├── testPrinter() - тест конкретного IP
│   └── quickScan() - быстрый поиск известных IP
├── Network Analysis  
│   ├── getLocalNetwork() - определение локальной сети
│   ├── generatePrinterIPs() - генерация списка IP
│   └── normalizeIPAddress() - нормализация IP
└── Connection Testing
    ├── testPrinterConnection() - TCP тест соединения
    └── detectPrinterModel() - определение модели

API Routes (140 lines)
├── GET /discover - автоматический поиск
├── GET /quick-scan - быстрый поиск
├── POST /test - тест IP
└── GET /status - статус принтера
```

### **Current Limitations Analysis**

#### **Performance Issues**
```typescript
// Problem 1: Sequential IP scanning
for (const baseIp of baseIps) {
  for (const ip of popularIPs) {        // 14 IPs
    for (const port of ports) {         // 4 ports  
      await checkPrinterPort(fullIp, port); // Sequential = slow
    }
  }
}
// Total: 14 × 4 × 4 networks = 224 sequential requests

// Problem 2: No connection reuse
const checkPrinterPort = async (ip: string, port: number) => {
  const response = await fetch(`http://${ip}:${port}`, {
    method: 'GET',
    signal: controller.signal,
    mode: 'no-cors'  // Doesn't actually test printer connection
  });
};

// Problem 3: Limited discovery methods
// Only tests HTTP fetch, doesn't use:
// - Raw TCP socket connection (actual printer protocol)
// - SNMP discovery
// - mDNS service discovery
// - ARP table analysis
```

#### **Reliability Issues**
```typescript
// Problem 1: No caching
// Every search starts from scratch, no memory of previous discoveries

// Problem 2: No network topology awareness
const baseIps = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
// Fixed list, doesn't detect actual network

// Problem 3: False positives
// HTTP fetch to port 9100 might succeed for non-printer devices

// Problem 4: No printer identification
// Can't distinguish GoDEX from other network devices
```

---

## TDD Implementation Strategy

### **Phase 1: Foundation - Network Discovery Engine**

#### **1.1 Test-Driven Network Interface Detection**

**Test First:**
```typescript
// tests/services/network-detection.service.test.ts
describe('NetworkDetectionService', () => {
  let service: NetworkDetectionService;

  beforeEach(() => {
    service = new NetworkDetectionService();
  });

  describe('getCurrentNetworkInterfaces', () => {
    it('should detect all active network interfaces', async () => {
      const interfaces = await service.getCurrentNetworkInterfaces();
      
      expect(interfaces).toBeInstanceOf(Array);
      expect(interfaces.length).toBeGreaterThan(0);
      
      interfaces.forEach(iface => {
        expect(iface.name).toMatch(/^(eth|wlan|en)\d+$/);
        expect(iface.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        expect(iface.networkPrefix).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        expect(iface.isActive).toBe(true);
      });
    });

    it('should exclude loopback and inactive interfaces', async () => {
      const interfaces = await service.getCurrentNetworkInterfaces();
      
      interfaces.forEach(iface => {
        expect(iface.name).not.toBe('lo');
        expect(iface.name).not.toBe('lo0');
        expect(iface.ip).not.toBe('127.0.0.1');
      });
    });

    it('should detect gateway for each interface', async () => {
      const interfaces = await service.getCurrentNetworkInterfaces();
      
      interfaces.forEach(iface => {
        expect(iface.gateway).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        expect(iface.gateway).toContain(iface.networkPrefix);
      });
    });
  });

  describe('suggestPrinterTargetIPs', () => {
    it('should generate smart IP suggestions for each network', async () => {
      const mockInterfaces = [
        { networkPrefix: '192.168.1', gateway: '192.168.1.1' },
        { networkPrefix: '10.0.0', gateway: '10.0.0.1' }
      ];
      
      const suggestions = service.suggestPrinterTargetIPs(mockInterfaces);
      
      expect(suggestions).toContain('192.168.1.200');  // Common printer IP
      expect(suggestions).toContain('192.168.1.100');  // Common printer IP
      expect(suggestions).toContain('10.0.0.200');     // Common printer IP
      expect(suggestions).toContain('192.168.14.200'); // Known RIVHIT printer
      
      // Should prioritize likely printer IPs
      expect(suggestions[0]).toMatch(/(\.200|\.100|\.250)$/);
    });

    it('should handle edge cases gracefully', async () => {
      const emptyInterfaces: NetworkInterface[] = [];
      const suggestions = service.suggestPrinterTargetIPs(emptyInterfaces);
      
      // Should return fallback suggestions
      expect(suggestions).toContain('192.168.1.200');
      expect(suggestions).toContain('192.168.14.200');
      expect(suggestions.length).toBeGreaterThan(10);
    });
  });
});
```

**Implementation:**
```typescript
// src/services/network-detection.service.ts
import { networkInterfaces } from 'os';
import { execAsync } from './utils/exec-async';

export interface NetworkInterface {
  name: string;
  ip: string;
  networkPrefix: string; // 192.168.1
  gateway: string;
  subnet: string;
  isActive: boolean;
}

export class NetworkDetectionService {
  async getCurrentNetworkInterfaces(): Promise<NetworkInterface[]> {
    const osInterfaces = networkInterfaces();
    const activeInterfaces: NetworkInterface[] = [];

    for (const [name, details] of Object.entries(osInterfaces)) {
      if (!details) continue;

      const ipv4 = details.find(detail => 
        detail.family === 'IPv4' && 
        !detail.internal && 
        detail.address !== '127.0.0.1'
      );

      if (ipv4) {
        const gateway = await this.getGatewayForInterface(name);
        const networkPrefix = this.getNetworkPrefix(ipv4.address);

        activeInterfaces.push({
          name,
          ip: ipv4.address,
          networkPrefix,
          gateway: gateway || `${networkPrefix}.1`, // Fallback
          subnet: ipv4.netmask,
          isActive: true
        });
      }
    }

    return activeInterfaces;
  }

  suggestPrinterTargetIPs(interfaces: NetworkInterface[]): string[] {
    const printerTargetEndings = [
      200, 201, 202, 100, 101, 102, 
      150, 250, 254, 1, 10, 50
    ];

    const suggestions: string[] = [];

    // Add IPs for each detected network
    for (const iface of interfaces) {
      for (const ending of printerTargetEndings) {
        suggestions.push(`${iface.networkPrefix}.${ending}`);
      }
    }

    // Add known RIVHIT printer IPs
    suggestions.push('192.168.14.200', '192.168.014.200');

    // Add popular network ranges if not already detected
    const commonNetworks = ['192.168.1', '192.168.0', '10.0.0'];
    for (const network of commonNetworks) {
      if (!interfaces.some(i => i.networkPrefix === network)) {
        for (const ending of printerTargetEndings.slice(0, 6)) { // Top 6 only
          suggestions.push(`${network}.${ending}`);
        }
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  private getNetworkPrefix(ip: string): string {
    return ip.split('.').slice(0, 3).join('.');
  }

  private async getGatewayForInterface(interfaceName: string): Promise<string | null> {
    try {
      // Linux/macOS route detection
      const { stdout } = await execAsync(`ip route show dev ${interfaceName} | grep default`);
      const match = stdout.match(/via (\d+\.\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      // Fallback: try route command
      try {
        const { stdout } = await execAsync('route -n get default');
        const match = stdout.match(/gateway: (\d+\.\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    }
  }
}
```

#### **1.2 Test-Driven Printer Connection Testing**

**Test First:**
```typescript
// tests/services/printer-connection.service.test.ts
describe('PrinterConnectionService', () => {
  let service: PrinterConnectionService;

  beforeEach(() => {
    service = new PrinterConnectionService();
  });

  describe('testTCPConnection', () => {
    it('should successfully connect to active printer', async () => {
      // Mock successful TCP connection
      const mockSocket = {
        connect: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
        end: jest.fn(),
        on: jest.fn(),
        setTimeout: jest.fn()
      };
      
      jest.spyOn(require('net'), 'Socket').mockReturnValue(mockSocket);

      const result = await service.testTCPConnection('192.168.1.200', 9101);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(5000);
      expect(mockSocket.connect).toHaveBeenCalledWith(9101, '192.168.1.200');
    });

    it('should handle connection timeout', async () => {
      jest.spyOn(require('net'), 'Socket').mockImplementation(() => ({
        connect: jest.fn().mockImplementation(() => {
          throw new Error('ETIMEDOUT');
        }),
        on: jest.fn(),
        setTimeout: jest.fn()
      }));

      const result = await service.testTCPConnection('192.168.1.999', 9101);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should test multiple ports efficiently', async () => {
      const ports = [9100, 9101, 9102];
      const ip = '192.168.1.200';

      // Mock: only 9101 responds
      jest.spyOn(service, 'testTCPConnection').mockImplementation(async (testIP, testPort) => {
        if (testIP === ip && testPort === 9101) {
          return { success: true, responseTime: 120, port: testPort };
        }
        return { success: false, error: 'Connection refused', port: testPort };
      });

      const results = await service.testMultiplePorts(ip, ports);

      expect(results).toHaveLength(1);
      expect(results[0].port).toBe(9101);
      expect(results[0].success).toBe(true);
    });
  });

  describe('sendEZPLProbe', () => {
    it('should identify GoDEX printer through EZPL response', async () => {
      const mockSocket = {
        connect: jest.fn().mockResolvedValue(undefined),
        write: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            // Simulate GoDEX response
            setTimeout(() => callback(Buffer.from('GoDEX ZX420i Ready')), 10);
          }
        }),
        end: jest.fn(),
        setTimeout: jest.fn()
      };

      jest.spyOn(require('net'), 'Socket').mockReturnValue(mockSocket);

      const result = await service.sendEZPLProbe('192.168.1.200', 9101);

      expect(result.isGoDEX).toBe(true);
      expect(result.model).toContain('ZX420i');
      expect(mockSocket.write).toHaveBeenCalledWith('~!T\r\n'); // Status command
    });

    it('should detect non-GoDEX printers', async () => {
      const mockSocket = {
        connect: jest.fn().mockResolvedValue(undefined),
        write: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('Zebra Ready')), 10);
          }
        }),
        end: jest.fn(),
        setTimeout: jest.fn()
      };

      jest.spyOn(require('net'), 'Socket').mockReturnValue(mockSocket);

      const result = await service.sendEZPLProbe('192.168.1.200', 9101);

      expect(result.isGoDEX).toBe(false);
      expect(result.model).toContain('Zebra');
    });
  });
});
```

**Implementation:**
```typescript
// src/services/printer-connection.service.ts
import * as net from 'net';

export interface ConnectionResult {
  success: boolean;
  responseTime?: number;
  error?: string;
  port: number;
}

export interface EZPLProbeResult {
  isGoDEX: boolean;
  model?: string;
  firmware?: string;
  status?: string;
}

export class PrinterConnectionService {
  private readonly CONNECTION_TIMEOUT = 3000;
  private readonly PROBE_TIMEOUT = 2000;

  async testTCPConnection(ip: string, port: number): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
        }
      };

      socket.setTimeout(this.CONNECTION_TIMEOUT);
      
      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        cleanup();
        resolve({ success: true, responseTime, port });
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({ success: false, error: 'Connection timeout', port });
      });

      socket.on('error', (error) => {
        cleanup();
        resolve({ 
          success: false, 
          error: error.message, 
          port 
        });
      });

      try {
        socket.connect(port, ip);
      } catch (error) {
        cleanup();
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error', 
          port 
        });
      }
    });
  }

  async testMultiplePorts(ip: string, ports: number[]): Promise<ConnectionResult[]> {
    const promises = ports.map(port => this.testTCPConnection(ip, port));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<ConnectionResult> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value);
  }

  async sendEZPLProbe(ip: string, port: number): Promise<EZPLProbeResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let response = '';
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
        }
      };

      socket.setTimeout(this.PROBE_TIMEOUT);

      socket.on('connect', () => {
        // Send GoDEX status inquiry command
        socket.write('~!T\r\n');
      });

      socket.on('data', (data) => {
        response += data.toString();
        
        // Look for end of response or wait briefly for more data
        setTimeout(() => {
          if (!resolved) {
            const result = this.parseEZPLResponse(response);
            cleanup();
            resolve(result);
          }
        }, 100);
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({ isGoDEX: false });
      });

      socket.on('error', () => {
        cleanup();
        resolve({ isGoDEX: false });
      });

      try {
        socket.connect(port, ip);
      } catch (error) {
        cleanup();
        resolve({ isGoDEX: false });
      }
    });
  }

  private parseEZPLResponse(response: string): EZPLProbeResult {
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('godex')) {
      const modelMatch = response.match(/(godex\s+[a-z0-9\-]+)/i);
      const firmwareMatch = response.match(/firmware[:\s]+([^\s\r\n]+)/i);
      
      return {
        isGoDEX: true,
        model: modelMatch ? modelMatch[1] : 'GoDEX Label Printer',
        firmware: firmwareMatch ? firmwareMatch[1] : undefined,
        status: 'Ready'
      };
    }

    // Check for other printer brands for comparison
    if (lowerResponse.includes('zebra')) {
      return { isGoDEX: false, model: 'Zebra Printer' };
    }

    return { isGoDEX: false };
  }
}
```

#### **1.3 Test-Driven Parallel Discovery Engine**

**Test First:**
```typescript
// tests/services/parallel-discovery.service.test.ts
describe('ParallelDiscoveryService', () => {
  let service: ParallelDiscoveryService;
  let mockConnectionService: jest.Mocked<PrinterConnectionService>;

  beforeEach(() => {
    mockConnectionService = {
      testTCPConnection: jest.fn(),
      testMultiplePorts: jest.fn(),
      sendEZPLProbe: jest.fn()
    } as any;

    service = new ParallelDiscoveryService(mockConnectionService);
  });

  describe('parallelScan', () => {
    it('should scan multiple IPs in parallel with concurrency limit', async () => {
      const ips = ['192.168.1.200', '192.168.1.201', '192.168.1.202'];
      const ports = [9100, 9101];

      // Mock: only first IP has printer
      mockConnectionService.testTCPConnection.mockImplementation(async (ip, port) => {
        if (ip === '192.168.1.200' && port === 9101) {
          return { success: true, responseTime: 150, port };
        }
        return { success: false, error: 'Connection refused', port };
      });

      mockConnectionService.sendEZPLProbe.mockResolvedValue({
        isGoDEX: true,
        model: 'GoDEX ZX420i'
      });

      const results = await service.parallelScan(ips, ports, {
        maxConcurrency: 5,
        timeout: 3000
      });

      expect(results).toHaveLength(1);
      expect(results[0].ip).toBe('192.168.1.200');
      expect(results[0].port).toBe(9101);
      expect(results[0].model).toBe('GoDEX ZX420i');

      // Should have called connection test for all combinations
      expect(mockConnectionService.testTCPConnection).toHaveBeenCalledTimes(6); // 3 IPs × 2 ports
    });

    it('should respect concurrency limits', async () => {
      const ips = Array.from({length: 20}, (_, i) => `192.168.1.${i + 200}`);
      const ports = [9101];

      mockConnectionService.testTCPConnection.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        return { success: false, error: 'No printer', port: 9101 };
      });

      const startTime = Date.now();
      await service.parallelScan(ips, ports, { maxConcurrency: 5 });
      const duration = Date.now() - startTime;

      // With 20 IPs, 5 concurrency, 100ms each: should take ~400ms
      // (20/5 = 4 batches × 100ms = 400ms + overhead)
      expect(duration).toBeGreaterThan(300);
      expect(duration).toBeLessThan(800);
    });

    it('should handle mixed success/failure results', async () => {
      const ips = ['192.168.1.200', '192.168.1.201', '192.168.1.202'];
      const ports = [9101];

      mockConnectionService.testTCPConnection.mockImplementation(async (ip) => {
        if (ip === '192.168.1.201') {
          throw new Error('Network error');
        }
        if (ip === '192.168.1.200') {
          return { success: true, responseTime: 120, port: 9101 };
        }
        return { success: false, error: 'Connection refused', port: 9101 };
      });

      mockConnectionService.sendEZPLProbe.mockResolvedValue({ isGoDEX: true });

      const results = await service.parallelScan(ips, ports);

      expect(results).toHaveLength(1);
      expect(results[0].ip).toBe('192.168.1.200');
      // Should gracefully handle the error and continue
    });
  });

  describe('batchedScan', () => {
    it('should process large IP ranges in batches', async () => {
      const ips = Array.from({length: 100}, (_, i) => `10.0.0.${i + 1}`);
      
      mockConnectionService.testTCPConnection.mockResolvedValue({
        success: false,
        error: 'No printer',
        port: 9101
      });

      let batchCount = 0;
      const originalParallelScan = service.parallelScan.bind(service);
      service.parallelScan = jest.fn().mockImplementation(async (batchIps) => {
        batchCount++;
        expect(batchIps.length).toBeLessThanOrEqual(20); // Batch size
        return originalParallelScan(batchIps, [9101]);
      });

      await service.batchedScan(ips, [9101], { batchSize: 20 });

      expect(batchCount).toBe(5); // 100 IPs / 20 batch size = 5 batches
    });
  });
});
```

**Implementation:**
```typescript
// src/services/parallel-discovery.service.ts
import { PrinterConnectionService, ConnectionResult } from './printer-connection.service';
import { PrinterInfo } from './printer-discovery.service';

export interface ScanOptions {
  maxConcurrency?: number;
  timeout?: number;
  batchSize?: number;
}

export class ParallelDiscoveryService {
  private readonly DEFAULT_MAX_CONCURRENCY = 10;
  private readonly DEFAULT_BATCH_SIZE = 50;

  constructor(
    private connectionService: PrinterConnectionService
  ) {}

  async parallelScan(
    ips: string[], 
    ports: number[], 
    options: ScanOptions = {}
  ): Promise<PrinterInfo[]> {
    const { 
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
      timeout = 3000 
    } = options;

    const tasks = ips.flatMap(ip => 
      ports.map(port => ({ ip, port }))
    );

    const foundPrinters: PrinterInfo[] = [];
    
    // Process tasks in batches to respect concurrency
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
      const batch = tasks.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async ({ ip, port }) => {
        try {
          const connectionResult = await this.connectionService.testTCPConnection(ip, port);
          
          if (connectionResult.success) {
            // Additional verification: send EZPL probe
            const probeResult = await this.connectionService.sendEZPLProbe(ip, port);
            
            if (probeResult.isGoDEX) {
              return {
                ip,
                port,
                status: 'connected' as const,
                model: probeResult.model || 'GoDEX Label Printer',
                responseTime: connectionResult.responseTime
              };
            }
          }
          
          return null;
        } catch (error) {
          console.debug(`Scan failed for ${ip}:${port}:`, error.message);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          foundPrinters.push(result.value);
        }
      }

      // Small delay between batches to prevent network flooding
      if (i + maxConcurrency < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return foundPrinters.sort((a, b) => 
      (a.responseTime || 999) - (b.responseTime || 999)
    );
  }

  async batchedScan(
    ips: string[], 
    ports: number[], 
    options: ScanOptions = {}
  ): Promise<PrinterInfo[]> {
    const { batchSize = this.DEFAULT_BATCH_SIZE } = options;
    const allResults: PrinterInfo[] = [];

    for (let i = 0; i < ips.length; i += batchSize) {
      const ipBatch = ips.slice(i, i + batchSize);
      console.log(`Scanning batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ips.length / batchSize)}: ${ipBatch.length} IPs`);
      
      const batchResults = await this.parallelScan(ipBatch, ports, options);
      allResults.push(...batchResults);

      // Report progress
      if (i + batchSize < ips.length) {
        console.log(`Found ${batchResults.length} printers in this batch. Total: ${allResults.length}`);
      }
    }

    return allResults;
  }
}
```

### **Phase 2: Smart Caching Layer**

#### **2.1 Test-Driven Cache Service**

**Test First:**
```typescript
// tests/services/printer-cache.service.test.ts
describe('PrinterCacheService', () => {
  let service: PrinterCacheService;

  beforeEach(() => {
    service = new PrinterCacheService();
  });

  afterEach(async () => {
    await service.clear();
  });

  describe('cache management', () => {
    it('should cache discovered printers with TTL', async () => {
      const printer: PrinterInfo = {
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected',
        model: 'GoDEX ZX420i',
        responseTime: 120
      };

      await service.cachePrinter(printer, 'tcp-scan');

      const cached = await service.getCachedPrinters();
      expect(cached).toHaveLength(1);
      expect(cached[0].ip).toBe('192.168.1.200');
      expect(cached[0].discoveryMethod).toBe('tcp-scan');
      expect(cached[0].reliability).toBeGreaterThan(0.5);
    });

    it('should update reliability on repeated discoveries', async () => {
      const printer: PrinterInfo = {
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected'
      };

      // First discovery
      await service.cachePrinter(printer, 'tcp-scan');
      const first = await service.getCachedPrinters();
      const initialReliability = first[0].reliability;

      // Second discovery - should increase reliability
      await service.cachePrinter(printer, 'snmp');
      const second = await service.getCachedPrinters();
      
      expect(second[0].reliability).toBeGreaterThan(initialReliability);
      expect(second[0].lastSeen.getTime()).toBeGreaterThan(first[0].lastSeen.getTime());
    });

    it('should expire old cache entries', async () => {
      const printer: PrinterInfo = {
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected'
      };

      // Cache with very short TTL
      service = new PrinterCacheService({ ttl: 100 }); // 100ms
      await service.cachePrinter(printer, 'tcp-scan');

      // Immediately should be in cache
      let cached = await service.getCachedPrinters();
      expect(cached).toHaveLength(1);

      // After TTL expiry should be gone
      await new Promise(resolve => setTimeout(resolve, 150));
      cached = await service.getCachedPrinters();
      expect(cached).toHaveLength(0);
    });

    it('should perform online verification for cached printers', async () => {
      const printer: PrinterInfo = {
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected'
      };

      await service.cachePrinter(printer, 'tcp-scan');

      // Mock connection service
      const mockConnectionService = {
        testTCPConnection: jest.fn().mockResolvedValue({
          success: true,
          responseTime: 100,
          port: 9101
        })
      };

      service.setConnectionService(mockConnectionService as any);

      const cached = await service.getCachedPrinters(true); // verifyOnline = true
      
      expect(cached).toHaveLength(1);
      expect(cached[0].status).toBe('connected');
      expect(mockConnectionService.testTCPConnection).toHaveBeenCalledWith('192.168.1.200', 9101);
    });

    it('should handle offline printers gracefully', async () => {
      const printer: PrinterInfo = {
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected'
      };

      await service.cachePrinter(printer, 'tcp-scan');

      // Mock connection service to return offline
      const mockConnectionService = {
        testTCPConnection: jest.fn().mockResolvedValue({
          success: false,
          error: 'Connection refused',
          port: 9101
        })
      };

      service.setConnectionService(mockConnectionService as any);

      const cached = await service.getCachedPrinters(true);
      
      expect(cached).toHaveLength(1);
      expect(cached[0].status).toBe('error');
      expect(cached[0].reliability).toBeLessThan(0.5); // Decreased reliability
    });
  });

  describe('smart suggestions', () => {
    it('should suggest IPs based on successful discoveries', async () => {
      // Cache several printers in same network
      const printers = [
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const },
        { ip: '192.168.1.201', port: 9101, status: 'connected' as const },
        { ip: '10.0.0.100', port: 9101, status: 'connected' as const }
      ];

      for (const printer of printers) {
        await service.cachePrinter(printer, 'tcp-scan');
      }

      const suggestions = await service.getSmartIPSuggestions();

      // Should suggest more IPs in successful networks
      expect(suggestions.filter(ip => ip.startsWith('192.168.1.')).length)
        .toBeGreaterThan(suggestions.filter(ip => ip.startsWith('10.0.0.')).length);
      
      // Should include adjacent IPs to successful ones
      expect(suggestions).toContain('192.168.1.199');
      expect(suggestions).toContain('192.168.1.202');
    });
  });
});
```

**Implementation:**
```typescript
// src/services/printer-cache.service.ts
import { PrinterInfo } from './printer-discovery.service';
import { PrinterConnectionService } from './printer-connection.service';

export interface CachedPrinterInfo extends PrinterInfo {
  lastSeen: Date;
  discoveryMethod: 'tcp-scan' | 'snmp' | 'mdns' | 'manual' | 'cache';
  reliability: number; // 0-1 score
  averageResponseTime: number;
  discoveryCount: number;
}

export interface CacheOptions {
  ttl?: number; // milliseconds
  maxSize?: number;
  verificationInterval?: number;
}

export class PrinterCacheService {
  private cache = new Map<string, CachedPrinterInfo>();
  private readonly options: Required<CacheOptions>;
  private connectionService?: PrinterConnectionService;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000,        // 5 minutes
      maxSize: 100,               // max cached printers
      verificationInterval: 60 * 1000, // 1 minute
      ...options
    };
  }

  setConnectionService(service: PrinterConnectionService): void {
    this.connectionService = service;
  }

  async cachePrinter(
    printer: PrinterInfo, 
    method: CachedPrinterInfo['discoveryMethod']
  ): Promise<void> {
    const key = `${printer.ip}:${printer.port}`;
    const now = new Date();
    const existing = this.cache.get(key);

    const cached: CachedPrinterInfo = {
      ...printer,
      lastSeen: now,
      discoveryMethod: method,
      reliability: this.calculateReliability(existing, printer.status),
      averageResponseTime: this.calculateAverageResponseTime(existing, printer.responseTime),
      discoveryCount: (existing?.discoveryCount || 0) + 1
    };

    this.cache.set(key, cached);
    this.limitCacheSize();
  }

  async getCachedPrinters(verifyOnline: boolean = false): Promise<CachedPrinterInfo[]> {
    const now = new Date();
    const validPrinters: CachedPrinterInfo[] = [];

    for (const [key, printer] of this.cache.entries()) {
      const age = now.getTime() - printer.lastSeen.getTime();

      if (age > this.options.ttl) {
        this.cache.delete(key);
        continue;
      }

      if (verifyOnline && this.connectionService) {
        const isOnline = await this.verifyPrinterOnline(printer);
        
        if (isOnline) {
          printer.reliability = Math.min(printer.reliability + 0.05, 1.0);
          validPrinters.push(printer);
        } else {
          printer.reliability *= 0.8;
          printer.status = 'error';
          
          if (printer.reliability > 0.2) {
            validPrinters.push(printer);
          } else {
            this.cache.delete(key);
          }
        }
      } else {
        validPrinters.push(printer);
      }
    }

    return validPrinters.sort((a, b) => b.reliability - a.reliability);
  }

  async getSmartIPSuggestions(): Promise<string[]> {
    const cached = await this.getCachedPrinters();
    const networkScores = new Map<string, number>();
    const suggestions: string[] = [];

    // Analyze successful networks
    for (const printer of cached) {
      if (printer.status === 'connected' && printer.reliability > 0.5) {
        const networkPrefix = this.getNetworkPrefix(printer.ip);
        const currentScore = networkScores.get(networkPrefix) || 0;
        networkScores.set(networkPrefix, currentScore + printer.reliability);
      }
    }

    // Generate suggestions for promising networks
    const sortedNetworks = Array.from(networkScores.entries())
      .sort(([,a], [,b]) => b - a);

    for (const [network, score] of sortedNetworks) {
      const networkSuggestions = this.generateNetworkSuggestions(network, cached);
      const suggestionCount = Math.ceil(score * 10); // More suggestions for better networks
      
      suggestions.push(...networkSuggestions.slice(0, suggestionCount));
    }

    // Add fallback suggestions if nothing cached
    if (suggestions.length === 0) {
      suggestions.push(
        '192.168.1.200', '192.168.1.100', '192.168.14.200',
        '10.0.0.200', '172.16.0.200'
      );
    }

    return [...new Set(suggestions)];
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private calculateReliability(
    existing: CachedPrinterInfo | undefined, 
    currentStatus: PrinterInfo['status']
  ): number {
    if (!existing) {
      return currentStatus === 'connected' ? 0.7 : 0.3;
    }

    if (currentStatus === 'connected') {
      return Math.min(existing.reliability + 0.1, 1.0);
    } else {
      return existing.reliability * 0.8;
    }
  }

  private calculateAverageResponseTime(
    existing: CachedPrinterInfo | undefined,
    currentResponseTime?: number
  ): number {
    if (!existing || !currentResponseTime) {
      return currentResponseTime || 0;
    }

    return (existing.averageResponseTime + currentResponseTime) / 2;
  }

  private async verifyPrinterOnline(printer: CachedPrinterInfo): Promise<boolean> {
    if (!this.connectionService) return true;

    try {
      const result = await this.connectionService.testTCPConnection(printer.ip, printer.port);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  private getNetworkPrefix(ip: string): string {
    return ip.split('.').slice(0, 3).join('.');
  }

  private generateNetworkSuggestions(
    networkPrefix: string, 
    existingPrinters: CachedPrinterInfo[]
  ): string[] {
    const usedIPs = new Set(
      existingPrinters
        .filter(p => p.ip.startsWith(networkPrefix))
        .map(p => parseInt(p.ip.split('.')[3]))
    );

    const printerTargets = [200, 201, 202, 100, 101, 102, 150, 250, 254, 1, 10, 50];
    const suggestions: string[] = [];

    for (const target of printerTargets) {
      if (!usedIPs.has(target)) {
        suggestions.push(`${networkPrefix}.${target}`);
      }
    }

    // Add adjacent IPs to successful ones
    for (const printer of existingPrinters) {
      if (printer.ip.startsWith(networkPrefix) && printer.status === 'connected') {
        const lastOctet = parseInt(printer.ip.split('.')[3]);
        
        for (let i = -2; i <= 2; i++) {
          const adjacent = lastOctet + i;
          if (adjacent > 0 && adjacent < 255 && !usedIPs.has(adjacent)) {
            suggestions.push(`${networkPrefix}.${adjacent}`);
          }
        }
      }
    }

    return suggestions;
  }

  private limitCacheSize(): void {
    if (this.cache.size <= this.options.maxSize) return;

    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.reliability - b.reliability);

    const toDelete = entries.slice(0, this.cache.size - this.options.maxSize);
    for (const [key] of toDelete) {
      this.cache.delete(key);
    }
  }
}
```

### **Phase 3: Enhanced Discovery Service Integration**

#### **3.1 Test-Driven Enhanced Discovery Service**

**Test First:**
```typescript
// tests/services/enhanced-printer-discovery.service.test.ts
describe('EnhancedPrinterDiscoveryService', () => {
  let service: EnhancedPrinterDiscoveryService;
  let mockNetworkService: jest.Mocked<NetworkDetectionService>;
  let mockConnectionService: jest.Mocked<PrinterConnectionService>;
  let mockParallelService: jest.Mocked<ParallelDiscoveryService>;
  let mockCacheService: jest.Mocked<PrinterCacheService>;

  beforeEach(() => {
    mockNetworkService = {
      getCurrentNetworkInterfaces: jest.fn(),
      suggestPrinterTargetIPs: jest.fn()
    } as any;

    mockConnectionService = {
      testTCPConnection: jest.fn(),
      sendEZPLProbe: jest.fn()
    } as any;

    mockParallelService = {
      parallelScan: jest.fn(),
      batchedScan: jest.fn()
    } as any;

    mockCacheService = {
      getCachedPrinters: jest.fn(),
      cachePrinter: jest.fn(),
      getSmartIPSuggestions: jest.fn()
    } as any;

    service = new EnhancedPrinterDiscoveryService(
      mockNetworkService,
      mockConnectionService,
      mockParallelService,
      mockCacheService
    );
  });

  describe('quickDiscovery', () => {
    it('should return cached results within 2 seconds', async () => {
      const cachedPrinters = [
        {
          ip: '192.168.1.200',
          port: 9101,
          status: 'connected' as const,
          reliability: 0.8,
          lastSeen: new Date()
        }
      ];

      mockCacheService.getCachedPrinters.mockResolvedValue(cachedPrinters as any);

      const startTime = Date.now();
      const results = await service.quickDiscovery();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(1);
      expect(results[0].ip).toBe('192.168.1.200');
      expect(mockCacheService.getCachedPrinters).toHaveBeenCalledWith(true); // verify online
    });

    it('should test known RIVHIT printer IPs when cache is empty', async () => {
      mockCacheService.getCachedPrinters.mockResolvedValue([]);
      
      mockConnectionService.testTCPConnection.mockImplementation(async (ip, port) => {
        if (ip === '192.168.14.200' && port === 9101) {
          return { success: true, responseTime: 120, port };
        }
        return { success: false, error: 'No response', port };
      });

      mockConnectionService.sendEZPLProbe.mockResolvedValue({
        isGoDEX: true,
        model: 'GoDEX ZX420i'
      });

      const results = await service.quickDiscovery();

      expect(results).toHaveLength(1);
      expect(results[0].ip).toBe('192.168.14.200');
      expect(mockCacheService.cachePrinter).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '192.168.14.200' }),
        'quick-scan'
      );
    });
  });

  describe('smartDiscovery', () => {
    it('should use network detection for targeted scanning', async () => {
      const mockInterfaces = [
        { networkPrefix: '192.168.1', gateway: '192.168.1.1' },
        { networkPrefix: '10.0.0', gateway: '10.0.0.1' }
      ];

      mockNetworkService.getCurrentNetworkInterfaces.mockResolvedValue(mockInterfaces as any);
      mockNetworkService.suggestPrinterTargetIPs.mockReturnValue([
        '192.168.1.200', '192.168.1.100', '10.0.0.200'
      ]);

      mockParallelService.parallelScan.mockResolvedValue([
        {
          ip: '192.168.1.200',
          port: 9101,
          status: 'connected',
          model: 'GoDEX ZX420i',
          responseTime: 150
        }
      ]);

      const results = await service.smartDiscovery();

      expect(mockNetworkService.getCurrentNetworkInterfaces).toHaveBeenCalled();
      expect(mockNetworkService.suggestPrinterTargetIPs).toHaveBeenCalledWith(mockInterfaces);
      expect(mockParallelService.parallelScan).toHaveBeenCalledWith(
        ['192.168.1.200', '192.168.1.100', '10.0.0.200'],
        [9100, 9101, 9102],
        expect.objectContaining({ maxConcurrency: 10 })
      );
      expect(results).toHaveLength(1);
    });

    it('should complete within 5 seconds', async () => {
      mockNetworkService.getCurrentNetworkInterfaces.mockResolvedValue([]);
      mockNetworkService.suggestPrinterTargetIPs.mockReturnValue(['192.168.1.200']);
      mockParallelService.parallelScan.mockResolvedValue([]);

      const startTime = Date.now();
      await service.smartDiscovery();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('comprehensiveDiscovery', () => {
    it('should combine multiple discovery methods', async () => {
      // Mock SNMP discovery
      const snmpResults = [
        { ip: '192.168.1.100', port: 9101, status: 'connected' as const, model: 'GoDEX via SNMP' }
      ];

      // Mock mDNS discovery
      const mdnsResults = [
        { ip: '192.168.1.101', port: 9100, status: 'connected' as const, model: 'GoDEX via mDNS' }
      ];

      // Mock comprehensive scan
      const scanResults = [
        { ip: '192.168.1.102', port: 9101, status: 'connected' as const, model: 'GoDEX via scan' }
      ];

      service.snmpDiscovery = jest.fn().mockResolvedValue(snmpResults);
      service.mdnsDiscovery = jest.fn().mockResolvedValue(mdnsResults);
      mockParallelService.batchedScan.mockResolvedValue(scanResults);

      const results = await service.comprehensiveDiscovery();

      expect(results).toHaveLength(3);
      expect(results.some(r => r.ip === '192.168.1.100')).toBe(true);
      expect(results.some(r => r.ip === '192.168.1.101')).toBe(true);
      expect(results.some(r => r.ip === '192.168.1.102')).toBe(true);
    });

    it('should deduplicate results from different methods', async () => {
      const duplicateIP = '192.168.1.200';
      
      // Same printer found by different methods
      service.snmpDiscovery = jest.fn().mockResolvedValue([
        { ip: duplicateIP, port: 9101, status: 'connected' as const, model: 'GoDEX via SNMP' }
      ]);
      
      mockParallelService.batchedScan.mockResolvedValue([
        { ip: duplicateIP, port: 9101, status: 'connected' as const, model: 'GoDEX via scan' }
      ]);

      const results = await service.comprehensiveDiscovery();

      // Should have only one result, with best information
      expect(results).toHaveLength(1);
      expect(results[0].ip).toBe(duplicateIP);
      expect(results[0].model).toContain('GoDEX'); // Should merge best info
    });
  });

  describe('progressiveDiscovery', () => {
    it('should provide progress updates during discovery', async () => {
      const progressCallback = jest.fn();

      mockCacheService.getCachedPrinters.mockResolvedValue([]);
      mockNetworkService.getCurrentNetworkInterfaces.mockResolvedValue([]);
      mockParallelService.parallelScan.mockResolvedValue([]);

      await service.progressiveDiscovery(progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'quick',
          progress: expect.any(Number),
          currentAction: expect.any(String)
        })
      );

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'smart',
          progress: expect.any(Number)
        })
      );
    });

    it('should stop early if enough printers found', async () => {
      const progressCallback = jest.fn();
      
      // Quick discovery finds printers
      mockCacheService.getCachedPrinters.mockResolvedValue([
        { ip: '192.168.1.200', port: 9101, status: 'connected' as const }
      ] as any);

      const results = await service.progressiveDiscovery(progressCallback);

      expect(results).toHaveLength(1);
      // Should not proceed to comprehensive discovery
      expect(progressCallback).not.toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'comprehensive' })
      );
    });
  });
});
```

**Implementation:**
```typescript
// src/services/enhanced-printer-discovery.service.ts
import { NetworkDetectionService } from './network-detection.service';
import { PrinterConnectionService } from './printer-connection.service';
import { ParallelDiscoveryService } from './parallel-discovery.service';
import { PrinterCacheService } from './printer-cache.service';
import { PrinterInfo } from './printer-discovery.service';

export interface DiscoveryProgress {
  stage: 'quick' | 'smart' | 'comprehensive';
  progress: number; // 0-100
  currentAction: string;
  found: PrinterInfo[];
  eta?: number; // estimated seconds remaining
}

export type ProgressCallback = (progress: DiscoveryProgress) => void;

export class EnhancedPrinterDiscoveryService {
  private readonly KNOWN_RIVHIT_IPS = ['192.168.14.200', '192.168.014.200'];
  private readonly GODEX_PORTS = [9100, 9101, 9102];

  constructor(
    private networkService: NetworkDetectionService,
    private connectionService: PrinterConnectionService,
    private parallelService: ParallelDiscoveryService,
    private cacheService: PrinterCacheService
  ) {
    // Link services
    this.cacheService.setConnectionService(this.connectionService);
  }

  async quickDiscovery(): Promise<PrinterInfo[]> {
    console.log('🚀 Starting quick discovery...');
    
    // Step 1: Check cache with online verification
    const cachedPrinters = await this.cacheService.getCachedPrinters(true);
    
    if (cachedPrinters.length > 0) {
      console.log(`✅ Found ${cachedPrinters.length} printers in cache`);
      return cachedPrinters;
    }

    // Step 2: Test known RIVHIT printer IPs
    console.log('🎯 Testing known RIVHIT printer IPs...');
    const knownPrinters: PrinterInfo[] = [];
    
    for (const ip of this.KNOWN_RIVHIT_IPS) {
      for (const port of this.GODEX_PORTS) {
        try {
          const result = await this.connectionService.testTCPConnection(ip, port);
          
          if (result.success) {
            const probe = await this.connectionService.sendEZPLProbe(ip, port);
            
            if (probe.isGoDEX) {
              const printer: PrinterInfo = {
                ip,
                port,
                status: 'connected',
                model: probe.model || 'GoDEX Label Printer',
                responseTime: result.responseTime
              };
              
              knownPrinters.push(printer);
              await this.cacheService.cachePrinter(printer, 'quick-scan');
              console.log(`✅ Found known printer: ${ip}:${port}`);
              break; // Found printer on this IP, try next IP
            }
          }
        } catch (error) {
          // Continue to next IP/port
        }
      }
    }

    return knownPrinters;
  }

  async smartDiscovery(): Promise<PrinterInfo[]> {
    console.log('🧠 Starting smart discovery...');
    
    // Get network topology
    const interfaces = await this.networkService.getCurrentNetworkInterfaces();
    console.log(`📡 Detected ${interfaces.length} network interfaces`);
    
    // Generate smart IP suggestions
    const targetIPs = this.networkService.suggestPrinterTargetIPs(interfaces);
    
    // Add cache-based suggestions
    const cacheIPs = await this.cacheService.getSmartIPSuggestions();
    const allIPs = [...new Set([...targetIPs, ...cacheIPs])];
    
    console.log(`🎯 Scanning ${allIPs.length} target IPs...`);
    
    // Parallel scan with reasonable concurrency
    const foundPrinters = await this.parallelService.parallelScan(
      allIPs,
      this.GODEX_PORTS,
      {
        maxConcurrency: 10,
        timeout: 3000
      }
    );

    // Cache all found printers
    for (const printer of foundPrinters) {
      await this.cacheService.cachePrinter(printer, 'smart-scan');
    }

    console.log(`✅ Smart discovery found ${foundPrinters.length} printers`);
    return foundPrinters;
  }

  async comprehensiveDiscovery(): Promise<PrinterInfo[]> {
    console.log('🔍 Starting comprehensive discovery...');
    
    const discoveryMethods = [
      this.snmpDiscovery(),
      this.mdnsDiscovery(),
      this.fullRangePortScan()
    ];

    const results = await Promise.allSettled(discoveryMethods);
    const allPrinters: PrinterInfo[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allPrinters.push(...result.value);
      } else {
        console.warn('Discovery method failed:', result.reason);
      }
    }

    // Deduplicate by IP:port
    const uniquePrinters = this.deduplicatePrinters(allPrinters);

    // Cache all discoveries
    for (const printer of uniquePrinters) {
      await this.cacheService.cachePrinter(printer, 'comprehensive-scan');
    }

    console.log(`✅ Comprehensive discovery found ${uniquePrinters.length} printers`);
    return uniquePrinters;
  }

  async progressiveDiscovery(
    progressCallback?: ProgressCallback
  ): Promise<PrinterInfo[]> {
    const allFound: PrinterInfo[] = [];

    // Stage 1: Quick Discovery
    progressCallback?.({
      stage: 'quick',
      progress: 10,
      currentAction: 'Checking cache and known printers...',
      found: [],
      eta: 15
    });

    const quickResults = await this.quickDiscovery();
    allFound.push(...quickResults);

    progressCallback?.({
      stage: 'quick',
      progress: 30,
      currentAction: `Found ${quickResults.length} printers in quick scan`,
      found: quickResults
    });

    // If we found printers, we might skip comprehensive scan
    const shouldContinue = quickResults.length === 0;

    // Stage 2: Smart Discovery
    progressCallback?.({
      stage: 'smart',
      progress: 40,
      currentAction: 'Scanning network intelligently...',
      found: allFound,
      eta: shouldContinue ? 10 : 5
    });

    const smartResults = await this.smartDiscovery();
    const newSmartResults = smartResults.filter(
      p => !allFound.some(existing => existing.ip === p.ip && existing.port === p.port)
    );
    allFound.push(...newSmartResults);

    progressCallback?.({
      stage: 'smart',
      progress: 70,
      currentAction: `Found ${newSmartResults.length} additional printers`,
      found: allFound
    });

    // Stage 3: Comprehensive Discovery (only if needed)
    if (shouldContinue && allFound.length === 0) {
      progressCallback?.({
        stage: 'comprehensive',
        progress: 80,
        currentAction: 'SNMP and comprehensive scan...',
        found: allFound,
        eta: 10
      });

      const comprehensiveResults = await this.comprehensiveDiscovery();
      const newComprehensiveResults = comprehensiveResults.filter(
        p => !allFound.some(existing => existing.ip === p.ip && existing.port === p.port)
      );
      allFound.push(...newComprehensiveResults);
    }

    progressCallback?.({
      stage: 'comprehensive',
      progress: 100,
      currentAction: `Discovery complete! Found ${allFound.length} printers`,
      found: allFound
    });

    return allFound.sort((a, b) => (a.responseTime || 999) - (b.responseTime || 999));
  }

  // Placeholder methods for SNMP and mDNS (to be implemented in later phases)
  async snmpDiscovery(): Promise<PrinterInfo[]> {
    // TODO: Implement SNMP discovery
    console.log('📡 SNMP discovery not yet implemented');
    return [];
  }

  async mdnsDiscovery(): Promise<PrinterInfo[]> {
    // TODO: Implement mDNS discovery
    console.log('🔊 mDNS discovery not yet implemented');
    return [];
  }

  private async fullRangePortScan(): Promise<PrinterInfo[]> {
    console.log('🌐 Full range port scan...');
    
    const interfaces = await this.networkService.getCurrentNetworkInterfaces();
    const allIPs: string[] = [];

    // Generate full IP ranges for detected networks
    for (const iface of interfaces) {
      for (let i = 1; i <= 254; i++) {
        allIPs.push(`${iface.networkPrefix}.${i}`);
      }
    }

    return this.parallelService.batchedScan(allIPs, this.GODEX_PORTS, {
      batchSize: 50,
      maxConcurrency: 20
    });
  }

  private deduplicatePrinters(printers: PrinterInfo[]): PrinterInfo[] {
    const seen = new Map<string, PrinterInfo>();

    for (const printer of printers) {
      const key = `${printer.ip}:${printer.port}`;
      const existing = seen.get(key);

      if (!existing || this.isBetterPrinterInfo(printer, existing)) {
        seen.set(key, printer);
      }
    }

    return Array.from(seen.values());
  }

  private isBetterPrinterInfo(a: PrinterInfo, b: PrinterInfo): boolean {
    // Prefer printers with model information
    if (a.model && !b.model) return true;
    if (!a.model && b.model) return false;

    // Prefer connected over error status
    if (a.status === 'connected' && b.status === 'error') return true;
    if (a.status === 'error' && b.status === 'connected') return false;

    // Prefer better response times
    return (a.responseTime || 999) < (b.responseTime || 999);
  }
}
```

### **Phase 4: Backend API Integration**

#### **4.1 Test-Driven Enhanced API Routes**

**Test First:**
```typescript
// tests/routes/enhanced-printer-discovery.routes.test.ts
import request from 'supertest';
import express from 'express';
import { enhancedPrinterDiscoveryRouter } from '../../src/routes/enhanced-printer-discovery.routes';

describe('Enhanced Printer Discovery API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/printers', enhancedPrinterDiscoveryRouter);
  });

  describe('GET /api/printers/quick-discover', () => {
    it('should return cached printers quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/printers/quick-discover')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should be fast

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('method', 'quick');
      expect(response.body).toHaveProperty('duration');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/printers/smart-discover', () => {
    it('should perform network-aware discovery', async () => {
      const response = await request(app)
        .get('/api/printers/smart-discover')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('method', 'smart');
      expect(response.body).toHaveProperty('networks');
      expect(Array.isArray(response.body.networks)).toBe(true);
    });

    it('should handle network detection errors gracefully', async () => {
      // Mock network service to throw error
      const response = await request(app)
        .get('/api/printers/smart-discover')
        .expect(200); // Should still succeed with fallback

      expect(response.body.success).toBe(true);
      // Should use fallback networks even if detection fails
    });
  });

  describe('GET /api/printers/progressive-discover', () => {
    it('should provide real-time progress updates via SSE', async () => {
      const response = await request(app)
        .get('/api/printers/progressive-discover')
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      // Test SSE format
      expect(response.text).toContain('data: ');
    });
  });

  describe('POST /api/printers/cache-printer', () => {
    it('should cache printer manually', async () => {
      const printer = {
        ip: '192.168.1.200',
        port: 9101,
        status: 'connected',
        model: 'GoDEX ZX420i'
      };

      const response = await request(app)
        .post('/api/printers/cache-printer')
        .send({ printer, method: 'manual' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate printer data', async () => {
      const invalidPrinter = {
        ip: 'invalid-ip',
        port: 'not-a-number'
      };

      await request(app)
        .post('/api/printers/cache-printer')
        .send({ printer: invalidPrinter })
        .expect(400);
    });
  });

  describe('GET /api/network/info', () => {
    it('should return network topology information', async () => {
      const response = await request(app)
        .get('/api/network/info')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('interfaces');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.interfaces)).toBe(true);
    });
  });
});
```

**Implementation:**
```typescript
// src/routes/enhanced-printer-discovery.routes.ts
import { Router, Request, Response } from 'express';
import { EnhancedPrinterDiscoveryService } from '../services/enhanced-printer-discovery.service';
import { NetworkDetectionService } from '../services/network-detection.service';
import { PrinterConnectionService } from '../services/printer-connection.service';
import { ParallelDiscoveryService } from '../services/parallel-discovery.service';
import { PrinterCacheService } from '../services/printer-cache.service';
import { body, validationResult } from 'express-validator';

const router = Router();

// Initialize services
const networkService = new NetworkDetectionService();
const connectionService = new PrinterConnectionService();
const parallelService = new ParallelDiscoveryService(connectionService);
const cacheService = new PrinterCacheService();
const discoveryService = new EnhancedPrinterDiscoveryService(
  networkService,
  connectionService,
  parallelService,
  cacheService
);

/**
 * GET /api/printers/quick-discover - Ultra-fast discovery (1-2 seconds)
 */
router.get('/quick-discover', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Quick discovery requested');
    
    const printers = await discoveryService.quickDiscovery();
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: printers,
      method: 'quick',
      duration,
      cached: printers.length > 0,
      message: printers.length > 0 
        ? `Found ${printers.length} printers in ${duration}ms`
        : 'No printers found in quick scan'
    });

  } catch (error) {
    console.error('❌ Quick discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Quick discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/printers/smart-discover - Network-aware discovery (3-5 seconds)
 */
router.get('/smart-discover', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('🧠 Smart discovery requested');
    
    const [printers, networkInfo] = await Promise.all([
      discoveryService.smartDiscovery(),
      networkService.getCurrentNetworkInterfaces().catch(() => [])
    ]);
    
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: printers,
      method: 'smart',
      duration,
      networks: networkInfo.map(i => i.networkPrefix),
      message: `Smart scan found ${printers.length} printers in ${duration}ms`
    });

  } catch (error) {
    console.error('❌ Smart discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Smart discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/printers/comprehensive-discover - Full discovery (10-15 seconds)
 */
router.get('/comprehensive-discover', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Comprehensive discovery requested');
    
    const printers = await discoveryService.comprehensiveDiscovery();
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: printers,
      method: 'comprehensive',
      duration,
      message: `Comprehensive scan found ${printers.length} printers in ${duration}ms`
    });

  } catch (error) {
    console.error('❌ Comprehensive discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Comprehensive discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/printers/progressive-discover - Progressive discovery with SSE updates
 */
router.get('/progressive-discover', async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    console.log('📊 Progressive discovery requested');
    
    const printers = await discoveryService.progressiveDiscovery((progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });

    // Send final result
    res.write(`data: ${JSON.stringify({
      stage: 'complete',
      progress: 100,
      currentAction: 'Discovery finished',
      found: printers,
      final: true
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Progressive discovery error:', error);
    res.write(`data: ${JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : 'Discovery failed'
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/printers/cache-printer - Manually cache a printer
 */
router.post('/cache-printer', 
  [
    body('printer.ip').isIP('4').withMessage('Valid IPv4 address required'),
    body('printer.port').isInt({ min: 1, max: 65535 }).withMessage('Valid port required'),
    body('printer.status').isIn(['connected', 'error']).withMessage('Valid status required'),
    body('method').optional().isString()
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const { printer, method = 'manual' } = req.body;
      
      await cacheService.cachePrinter(printer, method);
      
      res.json({
        success: true,
        message: `Printer ${printer.ip}:${printer.port} cached successfully`
      });

    } catch (error) {
      console.error('❌ Cache printer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cache printer'
      });
    }
  }
);

/**
 * GET /api/network/info - Network topology information
 */
router.get('/network/info', async (req: Request, res: Response) => {
  try {
    const interfaces = await networkService.getCurrentNetworkInterfaces();
    const suggestions = networkService.suggestPrinterTargetIPs(interfaces);

    res.json({
      success: true,
      data: {
        interfaces: interfaces.map(i => ({
          name: i.name,
          network: i.networkPrefix,
          gateway: i.gateway
        })),
        suggestions: suggestions.slice(0, 20), // Top 20 suggestions
        detectedNetworks: interfaces.map(i => i.networkPrefix)
      }
    });

  } catch (error) {
    console.error('❌ Network info error:', error);
    
    // Fallback response
    res.json({
      success: true,
      data: {
        interfaces: [],
        suggestions: ['192.168.1.200', '192.168.14.200', '10.0.0.200'],
        detectedNetworks: [],
        fallback: true
      }
    });
  }
});

/**
 * DELETE /api/printers/cache - Clear printer cache
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    await cacheService.clear();
    
    res.json({
      success: true,
      message: 'Printer cache cleared successfully'
    });

  } catch (error) {
    console.error('❌ Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

export { router as enhancedPrinterDiscoveryRouter };
```

### **Phase 5: Frontend Integration**

#### **5.1 Test-Driven Enhanced React Component**

**Test First:**
```typescript
// tests/components/EnhancedPrinterDiscovery.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedPrinterDiscovery } from '../EnhancedPrinterDiscovery';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('EnhancedPrinterDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Quick Discovery', () => {
    it('should perform quick discovery and show results', async () => {
      const mockPrinters = [
        {
          ip: '192.168.1.200',
          port: 9101,
          status: 'connected',
          model: 'GoDEX ZX420i',
          responseTime: 120
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPrinters,
          method: 'quick',
          duration: 850
        })
      } as Response);

      const onSelect = jest.fn();
      render(<EnhancedPrinterDiscovery onPrinterSelect={onSelect} />);

      const quickButton = screen.getByRole('button', { name: /quick discovery/i });
      fireEvent.click(quickButton);

      await waitFor(() => {
        expect(screen.getByText('192.168.1.200:9101')).toBeInTheDocument();
        expect(screen.getByText('GoDEX ZX420i')).toBeInTheDocument();
        expect(screen.getByText('120ms')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/printers/quick-discover');
    });

    it('should handle quick discovery errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<EnhancedPrinterDiscovery />);

      const quickButton = screen.getByRole('button', { name: /quick discovery/i });
      fireEvent.click(quickButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to search/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progressive Discovery', () => {
    it('should show real-time progress updates', async () => {
      // Mock SSE EventSource
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: EventSource.OPEN
      };

      global.EventSource = jest.fn(() => mockEventSource) as any;

      render(<EnhancedPrinterDiscovery />);

      const progressiveButton = screen.getByRole('button', { name: /smart discovery/i });
      fireEvent.click(progressiveButton);

      // Simulate progress updates
      const progressHandler = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1];

      // Simulate quick stage
      progressHandler({
        data: JSON.stringify({
          stage: 'quick',
          progress: 20,
          currentAction: 'Checking cache...',
          found: []
        })
      });

      await waitFor(() => {
        expect(screen.getByText('Checking cache...')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
      });

      // Simulate smart stage with results
      progressHandler({
        data: JSON.stringify({
          stage: 'smart',
          progress: 70,
          currentAction: 'Network scanning...',
          found: [{ ip: '192.168.1.200', port: 9101, status: 'connected' }]
        })
      });

      await waitFor(() => {
        expect(screen.getByText('Network scanning...')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.200:9101')).toBeInTheDocument();
      });
    });

    it('should stop discovery when user cancels', async () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: EventSource.OPEN
      };

      global.EventSource = jest.fn(() => mockEventSource) as any;

      render(<EnhancedPrinterDiscovery />);

      const progressiveButton = screen.getByRole('button', { name: /smart discovery/i });
      fireEvent.click(progressiveButton);

      // Should show cancel button
      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });

  describe('Network Information', () => {
    it('should display detected network information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            interfaces: [
              { name: 'eth0', network: '192.168.1', gateway: '192.168.1.1' }
            ],
            detectedNetworks: ['192.168.1'],
            suggestions: ['192.168.1.200', '192.168.1.100']
          }
        })
      } as Response);

      render(<EnhancedPrinterDiscovery showNetworkInfo />);

      await waitFor(() => {
        expect(screen.getByText('Network: 192.168.1')).toBeInTheDocument();
        expect(screen.getByText('Gateway: 192.168.1.1')).toBeInTheDocument();
      });
    });
  });

  describe('Printer Selection', () => {
    it('should call onSelect when printer is selected', async () => {
      const mockPrinters = [
        { ip: '192.168.1.200', port: 9101, status: 'connected', model: 'GoDEX ZX420i' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPrinters })
      } as Response);

      const onSelect = jest.fn();
      render(<EnhancedPrinterDiscovery onPrinterSelect={onSelect} />);

      const quickButton = screen.getByRole('button', { name: /quick discovery/i });
      fireEvent.click(quickButton);

      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: /select/i });
        fireEvent.click(selectButton);
      });

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.200',
          port: 9101,
          model: 'GoDEX ZX420i'
        })
      );
    });
  });
});
```

**Implementation:**
```typescript
// src/components/EnhancedPrinterDiscovery.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Card, Button, Progress, List, Typography, Space, Badge, 
  message, Spin, Alert, Collapse, Descriptions, Tag
} from 'antd';
import {
  SearchOutlined, ThunderboltOutlined, RadarChartOutlined,
  PrinterOutlined, WifiOutlined, CheckCircleOutlined,
  CloseOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useI18n } from '../i18n/i18n';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface PrinterInfo {
  ip: string;
  port: number;
  status: 'connected' | 'error';
  model?: string;
  responseTime?: number;
}

interface DiscoveryProgress {
  stage: 'quick' | 'smart' | 'comprehensive';
  progress: number;
  currentAction: string;
  found: PrinterInfo[];
  eta?: number;
}

interface NetworkInfo {
  interfaces: Array<{
    name: string;
    network: string;
    gateway: string;
  }>;
  detectedNetworks: string[];
  suggestions: string[];
}

interface EnhancedPrinterDiscoveryProps {
  onPrinterSelect?: (printer: PrinterInfo) => void;
  showNetworkInfo?: boolean;
  autoStart?: boolean;
}

export const EnhancedPrinterDiscovery: React.FC<EnhancedPrinterDiscoveryProps> = ({
  onPrinterSelect,
  showNetworkInfo = false,
  autoStart = false
}) => {
  const { t, locale } = useI18n();
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Load network info on mount
  useEffect(() => {
    if (showNetworkInfo) {
      loadNetworkInfo();
    }
    
    if (autoStart) {
      handleQuickDiscovery();
    }
  }, [showNetworkInfo, autoStart]);

  const loadNetworkInfo = async () => {
    try {
      const response = await fetch('/api/network/info');
      const data = await response.json();
      
      if (data.success) {
        setNetworkInfo(data.data);
      }
    } catch (error) {
      console.warn('Failed to load network info:', error);
    }
  };

  const handleQuickDiscovery = async () => {
    setLoading(true);
    setProgress(null);
    
    try {
      const response = await fetch('/api/printers/quick-discover');
      const data = await response.json();
      
      if (data.success) {
        setPrinters(data.data);
        showResultMessage(data.data.length, data.duration, 'quick');
      } else {
        message.error(locale === 'ru' ? 'Ошибка быстрого поиска' : 'Quick discovery failed');
      }
    } catch (error) {
      console.error('Quick discovery error:', error);
      message.error(locale === 'ru' ? 'Не удалось выполнить поиск' : 'Failed to search');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartDiscovery = async () => {
    setLoading(true);
    setProgress(null);
    
    try {
      const response = await fetch('/api/printers/smart-discover');
      const data = await response.json();
      
      if (data.success) {
        setPrinters(data.data);
        showResultMessage(data.data.length, data.duration, 'smart');
      } else {
        message.error(locale === 'ru' ? 'Ошибка умного поиска' : 'Smart discovery failed');
      }
    } catch (error) {
      console.error('Smart discovery error:', error);
      message.error(locale === 'ru' ? 'Не удалось выполнить поиск' : 'Failed to search');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressiveDiscovery = useCallback(() => {
    if (loading) return;
    
    setLoading(true);
    setPrinters([]);
    setProgress({
      stage: 'quick',
      progress: 0,
      currentAction: locale === 'ru' ? 'Подготовка...' : 'Preparing...',
      found: []
    });

    const source = new EventSource('/api/printers/progressive-discover');
    setEventSource(source);

    source.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          message.error(data.message);
          source.close();
          setLoading(false);
          setProgress(null);
          return;
        }

        if (data.final) {
          setPrinters(data.found);
          showResultMessage(data.found.length, 0, 'progressive');
          source.close();
          setEventSource(null);
          setLoading(false);
          setProgress(null);
        } else {
          setProgress(data);
          
          // Update printer list in real-time
          if (data.found && data.found.length > 0) {
            setPrinters(data.found);
          }
        }
      } catch (error) {
        console.error('Failed to parse progress data:', error);
      }
    });

    source.addEventListener('error', () => {
      message.error(locale === 'ru' ? 'Ошибка соединения' : 'Connection error');
      source.close();
      setLoading(false);
      setProgress(null);
    });

  }, [loading, locale]);

  const handleCancelDiscovery = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setLoading(false);
    setProgress(null);
  };

  const showResultMessage = (count: number, duration: number, method: string) => {
    const durationText = duration > 0 ? ` (${duration}ms)` : '';
    
    if (count > 0) {
      message.success(
        locale === 'ru' 
          ? `Найдено ${count} принтеров${durationText}`
          : `Found ${count} printers${durationText}`
      );
    } else {
      message.warning(
        locale === 'ru'
          ? 'Принтеры не найдены в сети'
          : 'No printers found in network'
      );
    }
  };

  const handleSelectPrinter = (printer: PrinterInfo) => {
    message.success(
      locale === 'ru'
        ? `Выбран принтер: ${printer.ip}:${printer.port}`
        : `Selected printer: ${printer.ip}:${printer.port}`
    );
    
    onPrinterSelect?.(printer);
  };

  const formatStageText = (stage: string) => {
    const stages = {
      quick: locale === 'ru' ? 'Быстрый поиск' : 'Quick Scan',
      smart: locale === 'ru' ? 'Умный поиск' : 'Smart Scan', 
      comprehensive: locale === 'ru' ? 'Полный поиск' : 'Comprehensive Scan'
    };
    return stages[stage as keyof typeof stages] || stage;
  };

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 16 }}>
        <PrinterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        {locale === 'ru' ? 'Умный поиск принтеров' : 'Smart Printer Discovery'}
      </Title>

      {/* Network Information */}
      {showNetworkInfo && networkInfo && (
        <Card size="small" type="inner" style={{ marginBottom: 16 }}>
          <Descriptions 
            size="small" 
            title={locale === 'ru' ? 'Информация о сети' : 'Network Information'}
            column={1}
          >
            <Descriptions.Item label={locale === 'ru' ? 'Обнаружено сетей' : 'Detected Networks'}>
              {networkInfo.detectedNetworks.map(net => (
                <Tag key={net} color="blue">{net}.x</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label={locale === 'ru' ? 'Рекомендуемые IP' : 'Suggested IPs'}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {networkInfo.suggestions.slice(0, 10).join(', ')}...
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Discovery Controls */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Space wrap>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleQuickDiscovery}
            loading={loading && !progress}
            size="large"
          >
            {locale === 'ru' ? 'Быстрый поиск' : 'Quick Discovery'}
            <Text type="secondary" style={{ fontSize: 11 }}> (~1-2 сек)</Text>
          </Button>

          <Button
            icon={<SearchOutlined />}
            onClick={handleSmartDiscovery}
            loading={loading && !progress}
            size="large"
          >
            {locale === 'ru' ? 'Умный поиск' : 'Smart Discovery'}
            <Text type="secondary" style={{ fontSize: 11 }}> (~3-5 сек)</Text>
          </Button>

          <Button
            icon={<RadarChartOutlined />}
            onClick={handleProgressiveDiscovery}
            loading={loading && !progress}
            size="large"
          >
            {locale === 'ru' ? 'Прогрессивный поиск' : 'Progressive Discovery'}
            <Text type="secondary" style={{ fontSize: 11 }}> (~5-15 сек)</Text>
          </Button>

          {loading && progress && (
            <Button
              icon={<CloseOutlined />}
              onClick={handleCancelDiscovery}
              danger
            >
              {locale === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
          )}
        </Space>
      </Space>

      {/* Progress Display */}
      {progress && (
        <Card size="small" type="inner" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>{formatStageText(progress.stage)}</Text>
              {progress.eta && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {locale === 'ru' ? 'Осталось' : 'ETA'}: ~{progress.eta}с
                </Text>
              )}
            </div>
            
            <Progress
              percent={progress.progress}
              status={loading ? 'active' : 'success'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            
            <Text type="secondary" style={{ fontSize: 12 }}>
              {progress.currentAction}
            </Text>

            {progress.found.length > 0 && (
              <div>
                <Badge count={progress.found.length} style={{ backgroundColor: '#52c41a' }}>
                  <Text strong style={{ marginRight: 8 }}>
                    {locale === 'ru' ? 'Найдено принтеров' : 'Found Printers'}
                  </Text>
                </Badge>
                
                <div style={{ marginTop: 8, maxHeight: 100, overflowY: 'auto' }}>
                  {progress.found.slice(0, 5).map((printer, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#52c41a' }}>
                      ✓ {printer.ip}:{printer.port} 
                      {printer.responseTime && ` (${printer.responseTime}ms)`}
                    </div>
                  ))}
                  {progress.found.length > 5 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ...и еще {progress.found.length - 5}
                    </Text>
                  )}
                </div>
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* Results Display */}
      {printers.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              {locale === 'ru' ? 'Найденные принтеры' : 'Found Printers'}
              <Badge count={printers.length} style={{ backgroundColor: '#52c41a' }} />
            </Space>
          }
        >
          <List
            dataSource={printers}
            renderItem={(printer) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    onClick={() => handleSelectPrinter(printer)}
                    icon={<CheckCircleOutlined />}
                  >
                    {locale === 'ru' ? 'Выбрать' : 'Select'}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Badge
                      status={printer.status === 'connected' ? 'success' : 'error'}
                      text={
                        <Space>
                          <PrinterOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                          <Text strong>{printer.ip}:{printer.port}</Text>
                        </Space>
                      }
                    />
                  }
                  title={
                    <div>
                      {printer.model || 'GoDEX Label Printer'}
                      {printer.responseTime && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {printer.responseTime}ms
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <Text type="secondary">
                      {printer.status === 'connected' 
                        ? (locale === 'ru' ? 'Готов к печати' : 'Ready to print')
                        : (locale === 'ru' ? 'Недоступен' : 'Not available')
                      }
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Help Information */}
      <Collapse ghost style={{ marginTop: 16 }}>
        <Panel 
          header={
            <Space>
              <InfoCircleOutlined />
              <Text type="secondary">
                {locale === 'ru' ? 'Информация о методах поиска' : 'Discovery Methods Info'}
              </Text>
            </Space>
          } 
          key="help"
        >
          <Space direction="vertical" size="small">
            <div>
              <Text strong>{locale === 'ru' ? 'Быстрый поиск' : 'Quick Discovery'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {locale === 'ru' 
                  ? 'Проверяет кеш и известные IP адреса принтеров RIVHIT'
                  : 'Checks cache and known RIVHIT printer IP addresses'
                }
              </Text>
            </div>
            
            <div>
              <Text strong>{locale === 'ru' ? 'Умный поиск' : 'Smart Discovery'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {locale === 'ru'
                  ? 'Анализирует сеть и сканирует популярные IP адреса принтеров'
                  : 'Analyzes network topology and scans popular printer IP addresses'
                }
              </Text>
            </div>

            <div>
              <Text strong>{locale === 'ru' ? 'Прогрессивный поиск' : 'Progressive Discovery'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {locale === 'ru'
                  ? 'Поэтапный поиск с real-time обновлениями и полным сканированием'
                  : 'Multi-stage discovery with real-time updates and comprehensive scanning'
                }
              </Text>
            </div>
          </Space>
        </Panel>
      </Collapse>
    </Card>
  );
};

export default EnhancedPrinterDiscovery;
```

---

## Summary and Expected Outcomes

### **Testing Strategy Summary**

1. **Unit Tests** (95%+ coverage required)
   - Service layer testing with mocked dependencies
   - Network detection and IP generation logic
   - Cache management and reliability scoring
   - Connection testing and EZPL probing

2. **Integration Tests** (End-to-end workflows)
   - API endpoint testing with real network calls
   - Component integration with backend services
   - Progressive discovery flow testing
   - Error handling and recovery scenarios

3. **Performance Tests** (Speed and reliability)
   - Discovery speed benchmarks (1-2s quick, 3-5s smart)
   - Concurrent connection handling
   - Memory usage and cache efficiency
   - Network load impact assessment

### **Expected Results After Implementation**

#### **Performance Improvements**
- **Quick Discovery**: 1-2 seconds (95% success for cached printers)
- **Smart Discovery**: 3-5 seconds (90% success for network printers)  
- **Progressive Discovery**: 5-15 seconds (95%+ success comprehensive)

#### **Reliability Improvements**
- **Network-aware**: Automatic detection of current network topology
- **Intelligent caching**: Learning from successful discoveries
- **Multi-method approach**: TCP + SNMP + mDNS validation
- **Error resilience**: Graceful fallbacks and retry logic

#### **User Experience Improvements**
- **Real-time progress**: Live updates during discovery process
- **Smart suggestions**: IP recommendations based on network analysis
- **One-click selection**: Easy printer selection and configuration
- **Comprehensive feedback**: Detailed discovery results and diagnostics

This TDD implementation plan ensures that the enhanced printer discovery system will reliably find GoDEX printers in network environments while providing excellent user experience and maintainable, well-tested code.

<system-reminder>
Background Bash bash_12 (command: cd ../.. && npx lerna run dev --scope=@packing/frontend) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>

<system-reminder>
Background Bash bash_14 (command: npm run dev) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>