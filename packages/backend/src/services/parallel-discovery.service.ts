/**
 * ParallelDiscoveryService - Concurrent printer discovery with multiple strategies
 */

import { NetworkDetectionService, NetworkInfo } from './network-detection.service';
import { PrinterConnectionService, ConnectionTarget, ConnectionResult } from './printer-connection.service';

export interface DiscoveryTarget extends ConnectionTarget {}

export interface DiscoveryResult {
  method: 'quick' | 'smart' | 'comprehensive' | 'custom';
  duration: number;
  found: ConnectionResult[];
  scannedCount: number;
  successRate: number;
  networks?: string[];
  targets?: DiscoveryTarget[];
  coverage?: {
    totalIPs: number;
    scannedIPs: number;
    coveragePercent: number;
  };
}

export interface DiscoveryOptions {
  timeout?: number;
  maxConcurrent?: number;
  ports?: number[];
}

export class ParallelDiscoveryService {
  private readonly DEFAULT_PORTS = [9100, 9101, 9102];
  private readonly QUICK_SCAN_LIMIT = 30;
  private readonly SMART_SCAN_LIMIT = 100;

  constructor(
    private networkService: NetworkDetectionService,
    private connectionService: PrinterConnectionService
  ) {}

  /**
   * Quick scan of most likely printer locations (1-3 seconds)
   */
  async quickScan(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();

    try {
      // Get smart IP suggestions from network service
      const suggestedIPs = await this.networkService.suggestPrinterIPs();
      
      // Generate targets for quick scan
      const targets = this.generateTargetsFromIPs(
        suggestedIPs.slice(0, this.QUICK_SCAN_LIMIT / this.DEFAULT_PORTS.length),
        options?.ports || this.DEFAULT_PORTS
      );

      // Perform concurrent scan
      const allResults = await this.connectionService.testMultipleConnections(
        targets,
        {
          timeout: options?.timeout || 2000,
          maxConcurrent: options?.maxConcurrent || 20
        }
      );

      const connectedResults = allResults.filter(r => r.status === 'connected');
      const sortedResults = this.sortByResponseTime(connectedResults);

      return {
        method: 'quick',
        duration: Date.now() - startTime,
        found: sortedResults,
        scannedCount: targets.length,
        successRate: this.calculateSuccessRate(allResults)
      };

    } catch (error) {
      return {
        method: 'quick',
        duration: Date.now() - startTime,
        found: [],
        scannedCount: 0,
        successRate: 0
      };
    }
  }

  /**
   * Smart scan based on network detection (3-8 seconds)
   */
  async smartScan(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();

    try {
      // Detect current network configuration
      const networkInfo = await this.networkService.detectNetworkInfo();
      
      // Generate smart IP range based on network topology
      const targets = this.generateSmartTargets(networkInfo, options);

      // Perform concurrent scan
      const allResults = await this.connectionService.testMultipleConnections(
        targets,
        {
          timeout: options?.timeout || 3000,
          maxConcurrent: options?.maxConcurrent || 15
        }
      );

      const connectedResults = allResults.filter(r => r.status === 'connected');
      const sortedResults = this.sortByResponseTime(connectedResults);

      return {
        method: 'smart',
        duration: Date.now() - startTime,
        found: sortedResults,
        scannedCount: targets.length,
        successRate: this.calculateSuccessRate(allResults),
        networks: networkInfo.suggestedRanges
      };

    } catch (error) {
      return {
        method: 'smart',
        duration: Date.now() - startTime,
        found: [],
        scannedCount: 0,
        successRate: 0,
        networks: []
      };
    }
  }

  /**
   * Comprehensive scan of full network range (10-20 seconds)
   */
  async comprehensiveScan(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();

    try {
      // Detect network information
      const networkInfo = await this.networkService.detectNetworkInfo();
      
      // Generate comprehensive targets
      const targets = this.generateComprehensiveTargets(networkInfo, options);

      // Perform concurrent scan with batching
      const allResults = await this.connectionService.testMultipleConnections(
        targets,
        {
          timeout: options?.timeout || 4000,
          maxConcurrent: options?.maxConcurrent || 10
        }
      );

      const connectedResults = allResults.filter(r => r.status === 'connected');
      const sortedResults = this.sortByResponseTime(connectedResults);

      const totalPossibleIPs = networkInfo.suggestedRanges.length * 254;
      const coverage = {
        totalIPs: totalPossibleIPs,
        scannedIPs: targets.length / this.DEFAULT_PORTS.length,
        coveragePercent: (targets.length / this.DEFAULT_PORTS.length / totalPossibleIPs) * 100
      };

      return {
        method: 'comprehensive',
        duration: Date.now() - startTime,
        found: sortedResults,
        scannedCount: targets.length,
        successRate: this.calculateSuccessRate(allResults),
        networks: networkInfo.suggestedRanges,
        coverage
      };

    } catch (error) {
      return {
        method: 'comprehensive',
        duration: Date.now() - startTime,
        found: [],
        scannedCount: 0,
        successRate: 0,
        networks: []
      };
    }
  }

  /**
   * Scan custom IP:port combinations
   */
  async scanCustomRange(targets: DiscoveryTarget[], options?: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();

    if (targets.length === 0) {
      return {
        method: 'custom',
        duration: Date.now() - startTime,
        found: [],
        scannedCount: 0,
        successRate: 0,
        targets: []
      };
    }

    try {
      const allResults = await this.connectionService.testMultipleConnections(
        targets,
        {
          timeout: options?.timeout || 3000,
          maxConcurrent: options?.maxConcurrent || 15
        }
      );

      const connectedResults = allResults.filter(r => r.status === 'connected');
      const sortedResults = this.sortByResponseTime(connectedResults);

      return {
        method: 'custom',
        duration: Date.now() - startTime,
        found: sortedResults,
        scannedCount: targets.length,
        successRate: this.calculateSuccessRate(allResults),
        targets
      };

    } catch (error) {
      return {
        method: 'custom',
        duration: Date.now() - startTime,
        found: [],
        scannedCount: targets.length,
        successRate: 0,
        targets
      };
    }
  }

  /**
   * Generate IP range for a network with specified strategy
   */
  generateIPRange(network: string, strategy: 'quick' | 'smart' | 'comprehensive'): string[] {
    const ips: string[] = [];

    switch (strategy) {
      case 'quick':
        // Popular printer IP endings
        const quickEndings = [1, 100, 200, 201, 254];
        quickEndings.forEach(ending => {
          ips.push(`${network}.${ending}`);
        });
        break;

      case 'smart':
        // Extended popular ranges
        const smartEndings = [
          1, 2, 3, 4, 5, 10, 11, 12, 20, 50,
          100, 101, 102, 103, 110, 150, 200, 201, 202, 210, 250, 254
        ];
        smartEndings.forEach(ending => {
          ips.push(`${network}.${ending}`);
        });
        break;

      case 'comprehensive':
        // Full range 1-254
        for (let i = 1; i <= 254; i++) {
          ips.push(`${network}.${i}`);
        }
        break;
    }

    return ips;
  }

  private generateTargetsFromIPs(ips: string[], ports: number[]): DiscoveryTarget[] {
    const targets: DiscoveryTarget[] = [];
    
    for (const ip of ips) {
      for (const port of ports) {
        targets.push({ ip, port });
      }
    }

    return targets;
  }

  private generateSmartTargets(networkInfo: NetworkInfo, options?: DiscoveryOptions): DiscoveryTarget[] {
    const ports = options?.ports || this.DEFAULT_PORTS;
    const allIPs: string[] = [];

    // Prioritize current network
    if (networkInfo.currentNetwork) {
      const currentNetworkIPs = this.generateIPRange(networkInfo.currentNetwork, 'smart');
      allIPs.push(...currentNetworkIPs);
    }

    // Add other suggested networks
    for (const network of networkInfo.suggestedRanges) {
      if (network !== networkInfo.currentNetwork) {
        const networkIPs = this.generateIPRange(network, 'quick');
        allIPs.push(...networkIPs);
      }
    }

    // Limit total IPs to prevent overwhelming
    const limitedIPs = allIPs.slice(0, this.SMART_SCAN_LIMIT / ports.length);
    
    return this.generateTargetsFromIPs(limitedIPs, ports);
  }

  private generateComprehensiveTargets(networkInfo: NetworkInfo, options?: DiscoveryOptions): DiscoveryTarget[] {
    const ports = options?.ports || this.DEFAULT_PORTS;
    const allIPs: string[] = [];

    // Generate comprehensive scan for detected networks
    for (const network of networkInfo.suggestedRanges) {
      const networkIPs = this.generateIPRange(network, 'comprehensive');
      allIPs.push(...networkIPs);
    }

    return this.generateTargetsFromIPs(allIPs, ports);
  }

  private sortByResponseTime(results: ConnectionResult[]): ConnectionResult[] {
    return results.sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
  }

  private calculateSuccessRate(results: ConnectionResult[]): number {
    if (results.length === 0) return 0;
    
    const successCount = results.filter(r => r.status === 'connected').length;
    return Math.round((successCount / results.length) * 100 * 100) / 100; // Round to 2 decimal places
  }
}