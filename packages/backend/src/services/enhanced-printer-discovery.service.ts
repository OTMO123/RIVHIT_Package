/**
 * EnhancedPrinterDiscoveryService - Main integration service for intelligent printer discovery
 */

import { NetworkDetectionService } from './network-detection.service';
import { PrinterConnectionService, ConnectionResult } from './printer-connection.service';
import { ParallelDiscoveryService, DiscoveryResult } from './parallel-discovery.service';
import { PrinterCacheService, CachedPrinterInfo, CacheStats } from './printer-cache.service';

export interface DiscoveryStage {
  completed: boolean;
  found: number;
  duration: number;
  error?: string;
}

export interface ProgressiveDiscoveryResult {
  stages: {
    cache?: DiscoveryStage;
    quick?: DiscoveryStage;
    smart?: DiscoveryStage;
    comprehensive?: DiscoveryStage;
  };
  totalFound: number;
  totalDuration: number;
  success: boolean;
  error?: string;
}

export interface DiscoveryProgress {
  stage: 'cache' | 'quick' | 'smart' | 'comprehensive';
  progress: number; // 0-100
  currentAction: string;
  found: ConnectionResult[];
  eta?: number; // seconds remaining
}

export interface ProgressiveDiscoveryOptions {
  minPrinters?: number;
  maxDuration?: number; // milliseconds
  forceComprehensive?: boolean;
  updateCache?: boolean;
  progressCallback?: (progress: DiscoveryProgress) => void;
}

export interface QuickScanResult extends DiscoveryResult {
  fromCache: number;
  fromScan: number;
}

export interface DiscoveryStats {
  cache: CacheStats;
  lastDiscovery?: Date;
  totalDiscoveries: number;
}

export class EnhancedPrinterDiscoveryService {
  private discoveryCount = 0;
  private lastDiscoveryTime?: Date;

  constructor(
    private networkService: NetworkDetectionService,
    private connectionService: PrinterConnectionService,
    private parallelService: ParallelDiscoveryService,
    private cacheService: PrinterCacheService
  ) {}

  /**
   * Progressive discovery: Cache → Quick → Smart → Comprehensive
   * Stops when enough printers found or time limit reached
   */
  async progressiveDiscovery(options?: ProgressiveDiscoveryOptions): Promise<ProgressiveDiscoveryResult> {
    const startTime = Date.now();
    const minPrinters = options?.minPrinters || 1;
    const maxDuration = options?.maxDuration || 15000;
    const updateCache = options?.updateCache !== false;
    const progressCallback = options?.progressCallback;

    const result: ProgressiveDiscoveryResult = {
      stages: {},
      totalFound: 0,
      totalDuration: 0,
      success: false
    };

    let totalFound: ConnectionResult[] = [];

    try {
      // Stage 1: Cache Check (immediate)
      progressCallback?.({
        stage: 'cache',
        progress: 10,
        currentAction: 'Проверяем кеш принтеров...',
        found: [],
        eta: maxDuration / 1000
      });

      const cacheStart = Date.now();
      let hasCacheResults = false;
      try {
        const cachedPrinters = this.cacheService.getCachedPrinters();
        const cacheConnected = cachedPrinters.filter(p => p.status === 'connected');
        
        // Convert cached printers to ConnectionResult format
        const cacheResults: ConnectionResult[] = cacheConnected.map(cached => ({
          ip: cached.ip,
          port: cached.port,
          status: cached.status,
          responseTime: cached.averageResponseTime,
          model: cached.model,
          firmware: cached.firmware,
          capabilities: cached.capabilities,
          error: cached.error
        }));
        
        totalFound = [...cacheResults];
        hasCacheResults = true;

        result.stages.cache = {
          completed: true,
          found: cacheConnected.length,
          duration: Date.now() - cacheStart
        };

        progressCallback?.({
          stage: 'cache',
          progress: 20,
          currentAction: `Найдено ${cacheConnected.length} принтеров в кеше`,
          found: totalFound
        });
      } catch (error) {
        result.stages.cache = {
          completed: false,
          found: 0,
          duration: Date.now() - cacheStart,
          error: error instanceof Error ? error.message : 'Cache error'
        };
      }

      // Check if we have enough and should continue
      const remainingTime = maxDuration - (Date.now() - startTime);
      if (totalFound.length >= minPrinters && remainingTime < 5000) {
        result.totalFound = totalFound.length;
        result.totalDuration = Date.now() - startTime;
        result.success = true;
        this.updateStats();
        return result;
      }

      // Stage 2: Quick Scan (1-3 seconds)
      if (remainingTime > 3000) {
        progressCallback?.({
          stage: 'quick',
          progress: 30,
          currentAction: 'Быстрое сканирование популярных адресов...',
          found: totalFound,
          eta: remainingTime / 1000
        });

        try {
          const quickResults = await this.parallelService.quickScan();
          const newPrinters = quickResults.found.filter(p => p.status === 'connected');
          
          // Add to total, avoiding duplicates
          const uniqueNew = newPrinters.filter(newP => 
            !totalFound.some(existing => existing.ip === newP.ip && existing.port === newP.port)
          );
          totalFound = [...totalFound, ...uniqueNew];

          result.stages.quick = {
            completed: true,
            found: newPrinters.length,
            duration: quickResults.duration
          };

          // Update cache with new findings
          if (updateCache) {
            newPrinters.forEach(printer => {
              this.cacheService.addPrinter(printer, 'quick-scan');
            });
          }

          progressCallback?.({
            stage: 'quick',
            progress: 50,
            currentAction: `Быстрое сканирование: найдено ${newPrinters.length} принтеров`,
            found: totalFound
          });
        } catch (error) {
          result.stages.quick = {
            completed: false,
            found: 0,
            duration: Date.now() - startTime - (result.stages.cache?.duration || 0),
            error: error instanceof Error ? error.message : 'Quick scan failed'
          };
          
          // If cache also failed and no results yet, this is a critical failure
          if (!hasCacheResults && totalFound.length === 0) {
            throw new Error('Critical failure: Both cache and quick scan failed');
          }
        }
      }

      // Check if we should continue to smart scan
      const remainingTimeAfterQuick = maxDuration - (Date.now() - startTime);
      if (totalFound.length >= minPrinters || remainingTimeAfterQuick < 5000) {
        result.totalFound = totalFound.length;
        result.totalDuration = Date.now() - startTime;
        result.success = true;
        this.updateStats();
        return result;
      }

      // Stage 3: Smart Scan (3-8 seconds)
      if (remainingTimeAfterQuick > 5000) {
        progressCallback?.({
          stage: 'smart',
          progress: 60,
          currentAction: 'Умное сканирование сети...',
          found: totalFound,
          eta: remainingTimeAfterQuick / 1000
        });

        try {
          const smartResults = await this.parallelService.smartScan();
          const newPrinters = smartResults.found.filter(p => p.status === 'connected');
          
          const uniqueNew = newPrinters.filter(newP => 
            !totalFound.some(existing => existing.ip === newP.ip && existing.port === newP.port)
          );
          totalFound = [...totalFound, ...uniqueNew];

          result.stages.smart = {
            completed: true,
            found: newPrinters.length,
            duration: smartResults.duration
          };

          if (updateCache) {
            newPrinters.forEach(printer => {
              this.cacheService.addPrinter(printer, 'smart-scan');
            });
          }

          progressCallback?.({
            stage: 'smart',
            progress: 80,
            currentAction: `Умное сканирование: найдено ${newPrinters.length} принтеров`,
            found: totalFound
          });
        } catch (error) {
          result.stages.smart = {
            completed: false,
            found: 0,
            duration: Date.now() - startTime - (result.stages.cache?.duration || 0) - (result.stages.quick?.duration || 0),
            error: error instanceof Error ? error.message : 'Smart scan failed'
          };
        }
      }

      // Stage 4: Comprehensive Scan (only if forced or no printers found)
      const remainingTimeAfterSmart = maxDuration - (Date.now() - startTime);
      const shouldRunComprehensive = (options?.forceComprehensive || totalFound.length === 0) && remainingTimeAfterSmart > 10000;

      if (shouldRunComprehensive) {
        progressCallback?.({
          stage: 'comprehensive',
          progress: 85,
          currentAction: 'Полное сканирование сети (может занять время)...',
          found: totalFound,
          eta: remainingTimeAfterSmart / 1000
        });

        try {
          const comprehensiveResults = await this.parallelService.comprehensiveScan();
          const newPrinters = comprehensiveResults.found.filter(p => p.status === 'connected');
          
          const uniqueNew = newPrinters.filter(newP => 
            !totalFound.some(existing => existing.ip === newP.ip && existing.port === newP.port)
          );
          totalFound = [...totalFound, ...uniqueNew];

          result.stages.comprehensive = {
            completed: true,
            found: newPrinters.length,
            duration: comprehensiveResults.duration
          };

          if (updateCache) {
            newPrinters.forEach(printer => {
              this.cacheService.addPrinter(printer, 'comprehensive-scan');
            });
          }

          progressCallback?.({
            stage: 'comprehensive',
            progress: 100,
            currentAction: `Полное сканирование завершено: найдено ${newPrinters.length} принтеров`,
            found: totalFound
          });
        } catch (error) {
          result.stages.comprehensive = {
            completed: false,
            found: 0,
            duration: Date.now() - startTime - (result.stages.cache?.duration || 0) - (result.stages.quick?.duration || 0) - (result.stages.smart?.duration || 0),
            error: error instanceof Error ? error.message : 'Comprehensive scan failed'
          };
        }
      }

      result.totalFound = totalFound.length;
      result.totalDuration = Date.now() - startTime;
      result.success = true;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Progressive discovery failed';
      result.success = false;
      result.totalDuration = Date.now() - startTime;
    }

    this.updateStats();
    return result;
  }

  /**
   * Legacy method for backward compatibility
   */
  async findGoDEXPrinters(): Promise<ProgressiveDiscoveryResult> {
    return this.progressiveDiscovery({
      minPrinters: 1,
      maxDuration: 15000,
      updateCache: true
    });
  }

  /**
   * Quick scan with cache integration
   */
  async quickScan(): Promise<QuickScanResult> {
    const startTime = Date.now();
    
    // Get cached printers
    const cachedPrintersRaw = this.cacheService.getCachedPrinters()
      .filter(p => p.status === 'connected');
    
    // Convert cached printers to ConnectionResult format
    const cachedPrinters: ConnectionResult[] = cachedPrintersRaw.map(cached => ({
      ip: cached.ip,
      port: cached.port,
      status: cached.status,
      responseTime: cached.averageResponseTime,
      model: cached.model,
      firmware: cached.firmware,
      capabilities: cached.capabilities,
      error: cached.error
    }));
    
    // Perform quick scan
    const scanResults = await this.parallelService.quickScan();
    const newPrinters = scanResults.found.filter(p => p.status === 'connected');
    
    // Update cache
    newPrinters.forEach(printer => {
      this.cacheService.addPrinter(printer, 'quick-scan');
    });
    
    // Combine results, avoiding duplicates
    const allFound = [...cachedPrinters, ...newPrinters];
    const uniqueFound = allFound.filter((printer, index, self) => 
      index === self.findIndex(p => p.ip === printer.ip && p.port === printer.port)
    );

    return {
      ...scanResults,
      found: uniqueFound,
      fromCache: cachedPrinters.length,
      fromScan: newPrinters.length,
      duration: Date.now() - startTime
    };
  }

  /**
   * Test specific printer connection
   */
  async testPrinter(ip: string, port: number): Promise<ConnectionResult> {
    // Validate inputs
    if (!this.isValidIP(ip)) {
      throw new Error('Invalid IP address');
    }
    if (!this.isValidPort(port)) {
      throw new Error('Invalid port number');
    }

    const result = await this.connectionService.testConnection(ip, port);
    
    // Update cache if successful
    if (result.status === 'connected') {
      this.cacheService.addPrinter(result, 'manual-test');
    }

    return result;
  }

  /**
   * Get cached printers
   */
  getCachedPrinters(): CachedPrinterInfo[] {
    return this.cacheService.getCachedPrinters();
  }

  /**
   * Clear printer cache
   */
  clearCache(): void {
    this.cacheService.clearCache();
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): DiscoveryStats {
    return {
      cache: this.cacheService.getStats(),
      lastDiscovery: this.lastDiscoveryTime,
      totalDiscoveries: this.discoveryCount
    };
  }

  private updateStats(): void {
    this.discoveryCount++;
    this.lastDiscoveryTime = new Date();
  }

  private isValidIP(ip: string): boolean {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  }

  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }
}