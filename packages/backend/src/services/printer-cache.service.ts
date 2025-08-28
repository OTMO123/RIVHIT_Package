/**
 * PrinterCacheService - Intelligent caching for discovered printers
 */

import { ConnectionResult } from './printer-connection.service';

export interface CachedPrinterInfo extends Omit<ConnectionResult, 'responseTime'> {
  discoveryMethod: string;
  reliability: number;
  averageResponseTime: number;
  firstSeen: Date;
  lastSeen: Date;
  seenCount: number;
}

export interface CacheEntry {
  printer: CachedPrinterInfo;
  expiresAt: Date;
}

export interface CacheStats {
  totalEntries: number;
  connectedPrinters: number;
  averageReliability: number;
  discoveryMethods: Record<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxCacheSize?: number;
  reliabilityThreshold?: number;
}

export class PrinterCacheService {
  private cache = new Map<string, CachedPrinterInfo>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_MAX_SIZE = 100;
  private readonly DEFAULT_RELIABILITY_THRESHOLD = 0.2;
  
  private ttl: number;
  private maxCacheSize: number;
  private reliabilityThreshold: number;
  private validator?: (ip: string, port: number) => Promise<boolean>;

  constructor(options?: CacheOptions) {
    this.ttl = options?.ttl || this.DEFAULT_TTL;
    this.maxCacheSize = options?.maxCacheSize || this.DEFAULT_MAX_SIZE;
    this.reliabilityThreshold = options?.reliabilityThreshold || this.DEFAULT_RELIABILITY_THRESHOLD;
  }

  /**
   * Add or update printer in cache
   */
  addPrinter(printer: ConnectionResult, discoveryMethod: string): void {
    const key = this.getKey(printer.ip, printer.port);
    const now = new Date();
    
    const existing = this.cache.get(key);
    
    if (existing) {
      // Update existing entry
      const newReliability = Math.min(1.0, existing.reliability + 0.1);
      const newAvgResponseTime = existing.averageResponseTime
        ? (existing.averageResponseTime + (printer.responseTime || 0)) / 2
        : (printer.responseTime || 0);

      this.cache.set(key, {
        ...existing,
        ...printer,
        discoveryMethod, // Update to latest method
        reliability: newReliability,
        averageResponseTime: newAvgResponseTime,
        lastSeen: now,
        seenCount: existing.seenCount + 1
      });
    } else {
      // Create new entry
      const cachedPrinter: CachedPrinterInfo = {
        ...printer,
        discoveryMethod,
        reliability: 0.7, // Initial reliability
        averageResponseTime: printer.responseTime || 0,
        firstSeen: now,
        lastSeen: now,
        seenCount: 1
      };
      
      this.cache.set(key, cachedPrinter);
      
      // Enforce cache size limit
      this.enforceMaxSize();
    }
  }

  /**
   * Get all cached printers, filtered by expiration and sorted by reliability
   */
  getCachedPrinters(): CachedPrinterInfo[] {
    this.clearExpired();
    
    return Array.from(this.cache.values())
      .sort((a, b) => b.reliability - a.reliability);
  }

  /**
   * Get cached printers with validation
   */
  async getCachedPrintersWithValidation(): Promise<CachedPrinterInfo[]> {
    if (!this.validator) {
      return this.getCachedPrinters();
    }

    const printers = this.getCachedPrinters();
    const validatedPrinters: CachedPrinterInfo[] = [];

    for (const printer of printers) {
      try {
        const isValid = await this.validator(printer.ip, printer.port);
        if (isValid) {
          validatedPrinters.push(printer);
        } else {
          // Decrease reliability for invalid printers
          printer.reliability *= 0.8;
          if (printer.reliability > this.reliabilityThreshold) {
            printer.status = 'error';
            validatedPrinters.push(printer);
          } else {
            // Remove low reliability printers
            this.cache.delete(this.getKey(printer.ip, printer.port));
          }
        }
      } catch (error) {
        // Validation failed, decrease reliability
        printer.reliability *= 0.9;
        if (printer.reliability > this.reliabilityThreshold) {
          validatedPrinters.push(printer);
        }
      }
    }

    return validatedPrinters;
  }

  /**
   * Get specific printer by address
   */
  getPrinterByAddress(ip: string, port: number): CachedPrinterInfo | null {
    const key = this.getKey(ip, port);
    const printer = this.cache.get(key);
    
    if (!printer) {
      return null;
    }

    // Check if expired
    if (this.isExpired(printer)) {
      this.cache.delete(key);
      return null;
    }

    return printer;
  }

  /**
   * Update status of existing printer
   */
  updatePrinterStatus(ip: string, port: number, status: 'connected' | 'error', responseTime?: number): boolean {
    const key = this.getKey(ip, port);
    const printer = this.cache.get(key);
    
    if (!printer) {
      return false;
    }

    printer.status = status;
    printer.lastSeen = new Date();

    if (responseTime !== undefined) {
      printer.averageResponseTime = printer.averageResponseTime
        ? (printer.averageResponseTime + responseTime) / 2
        : responseTime;
    }

    // Update reliability based on status
    if (status === 'connected') {
      printer.reliability = Math.min(1.0, printer.reliability + 0.05);
    } else {
      printer.reliability = Math.max(0, printer.reliability - 0.1);
    }

    this.cache.set(key, printer);
    return true;
  }

  /**
   * Clear expired entries and optionally low-reliability entries
   */
  clearExpired(minReliability?: number): number {
    let removedCount = 0;
    const now = Date.now();
    
    for (const [key, printer] of this.cache.entries()) {
      const shouldRemove = this.isExpired(printer) || 
        (minReliability !== undefined && printer.reliability < minReliability);
        
      if (shouldRemove) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const printers = Array.from(this.cache.values());
    
    if (printers.length === 0) {
      return {
        totalEntries: 0,
        connectedPrinters: 0,
        averageReliability: 0,
        discoveryMethods: {},
        oldestEntry: null,
        newestEntry: null
      };
    }

    const connectedCount = printers.filter(p => p.status === 'connected').length;
    const averageReliability = printers.reduce((sum, p) => sum + p.reliability, 0) / printers.length;
    
    const discoveryMethods: Record<string, number> = {};
    let oldestEntry = printers[0].firstSeen;
    let newestEntry = printers[0].firstSeen;

    for (const printer of printers) {
      discoveryMethods[printer.discoveryMethod] = (discoveryMethods[printer.discoveryMethod] || 0) + 1;
      
      if (printer.firstSeen < oldestEntry) {
        oldestEntry = printer.firstSeen;
      }
      if (printer.lastSeen > newestEntry) {
        newestEntry = printer.lastSeen;
      }
    }

    return {
      totalEntries: printers.length,
      connectedPrinters: connectedCount,
      averageReliability: Math.round(averageReliability * 100) / 100,
      discoveryMethods,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Export cache data for persistence
   */
  exportCache(): string {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      printers: Array.from(this.cache.entries()).map(([key, printer]) => ({
        key,
        printer: {
          ...printer,
          firstSeen: printer.firstSeen.toISOString(),
          lastSeen: printer.lastSeen.toISOString()
        }
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import cache data from persistence
   */
  importCache(data: string): void {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.printers || !Array.isArray(importData.printers)) {
        throw new Error('Invalid cache data format');
      }

      this.cache.clear();

      for (const entry of importData.printers) {
        const printer = {
          ...entry.printer,
          firstSeen: new Date(entry.printer.firstSeen),
          lastSeen: new Date(entry.printer.lastSeen)
        };

        // Only import non-expired entries
        if (!this.isExpired(printer)) {
          this.cache.set(entry.key, printer);
        }
      }

      this.enforceMaxSize();
    } catch (error) {
      throw new Error(`Failed to import cache data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set a validator function for cache entries
   */
  setValidator(validator: (ip: string, port: number) => Promise<boolean>): void {
    this.validator = validator;
  }

  private getKey(ip: string, port: number): string {
    return `${ip}:${port}`;
  }

  private isExpired(printer: CachedPrinterInfo): boolean {
    return Date.now() - printer.lastSeen.getTime() > this.ttl;
  }

  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Sort by reliability (ascending) to remove least reliable first
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.reliability - b.reliability);

    // Remove entries until we're under the limit
    const toRemove = this.cache.size - this.maxCacheSize;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}