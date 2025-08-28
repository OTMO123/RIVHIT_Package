/**
 * Enhanced Printer Discovery API Routes - поиск принтеров в сети
 */

import { Router, Request, Response } from 'express';
import { printerDiscoveryService } from '../services/printer-discovery.service';
import { NetworkDetectionService } from '../services/network-detection.service';
import { PrinterConnectionService } from '../services/printer-connection.service';
import { ParallelDiscoveryService } from '../services/parallel-discovery.service';
import { PrinterCacheService } from '../services/printer-cache.service';
import { EnhancedPrinterDiscoveryService } from '../services/enhanced-printer-discovery.service';

const router = Router();

// Initialize enhanced services
const networkService = new NetworkDetectionService();
const connectionService = new PrinterConnectionService();
const parallelService = new ParallelDiscoveryService(networkService, connectionService);
const cacheService = new PrinterCacheService();
const enhancedService = new EnhancedPrinterDiscoveryService(
  networkService,
  connectionService,
  parallelService,
  cacheService
);

// ================== ENHANCED ROUTES ==================

/**
 * GET /api/printers/progressive-discovery - Progressive discovery with real-time updates
 */
router.get('/progressive-discovery', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting progressive printer discovery...');
    
    const minPrinters = parseInt(req.query.minPrinters as string) || 1;
    const maxDuration = parseInt(req.query.maxDuration as string) || 15000;
    const forceComprehensive = req.query.forceComprehensive === 'true';
    
    const result = await enhancedService.progressiveDiscovery({
      minPrinters,
      maxDuration,
      forceComprehensive,
      updateCache: true
    });
    
    res.json({
      success: result.success,
      data: {
        totalFound: result.totalFound,
        duration: result.totalDuration,
        stages: result.stages,
        printers: result.totalFound > 0 ? await enhancedService.getCachedPrinters() : []
      },
      message: result.success 
        ? `Progressive discovery completed: found ${result.totalFound} printers in ${result.totalDuration}ms`
        : `Discovery failed: ${result.error}`,
      method: 'progressive',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Progressive discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Progressive discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/printers/quick-discover - Enhanced quick scan with cache
 */
router.get('/quick-discover', async (req: Request, res: Response) => {
  try {
    console.log('⚡ Enhanced quick printer discovery...');
    
    const result = await enhancedService.quickScan();
    
    res.json({
      success: true,
      data: {
        found: result.found,
        fromCache: result.fromCache,
        fromScan: result.fromScan,
        scannedCount: result.scannedCount,
        successRate: result.successRate,
        duration: result.duration
      },
      message: `Quick scan: ${result.found.length} printers (${result.fromCache} cached, ${result.fromScan} new)`,
      method: result.method,
      timestamp: new Date().toISOString()
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
 * GET /api/printers/cache - Get cached printers
 */
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const cachedPrinters = enhancedService.getCachedPrinters();
    const stats = enhancedService.getDiscoveryStats();
    
    res.json({
      success: true,
      data: {
        printers: cachedPrinters,
        stats: stats.cache,
        lastDiscovery: stats.lastDiscovery,
        totalDiscoveries: stats.totalDiscoveries
      },
      message: `Cache contains ${cachedPrinters.length} printers`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/printers/cache - Clear printer cache
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    enhancedService.clearCache();
    
    res.json({
      success: true,
      message: 'Printer cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/printers/network-info - Get network information
 */
router.get('/network-info', async (req: Request, res: Response) => {
  try {
    console.log('🌐 Detecting network information...');
    
    const networkInfo = await networkService.detectNetworkInfo();
    const suggestedIPs = await networkService.suggestPrinterIPs();
    
    res.json({
      success: true,
      data: {
        networkInfo,
        suggestedIPs: suggestedIPs.slice(0, 20), // Limit to first 20
        totalSuggestions: suggestedIPs.length
      },
      message: 'Network information retrieved successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Network info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect network information',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/printers/test-enhanced - Enhanced printer testing with cache update
 */
router.post('/test-enhanced', async (req: Request, res: Response) => {
  try {
    const { ip, port = 9101 } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP адрес обязателен'
      });
    }
    
    console.log(`🔍 Enhanced testing printer ${ip}:${port}...`);
    
    const result = await enhancedService.testPrinter(ip, port);
    
    res.json({
      success: result.status === 'connected',
      data: result,
      message: result.status === 'connected' 
        ? `Printer ${ip}:${port} connected successfully` 
        : `Printer ${ip}:${port} test failed: ${result.error}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Enhanced test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ================== LEGACY ROUTES (for backward compatibility) ==================

/**
 * GET /api/printers/discover - автоматический поиск всех GoDEX принтеров
 */
router.get('/discover', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Запущен поиск GoDEX принтеров...');
    
    const printers = await printerDiscoveryService.findGoDEXPrinters();
    
    res.json({
      success: true,
      data: printers,
      message: `Найдено ${printers.length} принтеров`
    });
    
  } catch (error) {
    console.error('❌ Ошибка поиска принтеров:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка поиска принтеров',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/printers/quick-scan - быстрый поиск в локальной сети
 */
router.get('/quick-scan', async (req: Request, res: Response) => {
  try {
    console.log('⚡ Быстрый поиск принтеров...');
    
    const printers = await printerDiscoveryService.quickScan();
    
    res.json({
      success: true,
      data: printers,
      message: printers.length > 0 
        ? `Найдено ${printers.length} принтеров` 
        : 'Принтеры не найдены'
    });
    
  } catch (error) {
    console.error('❌ Ошибка быстрого поиска:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка быстрого поиска принтеров'
    });
  }
});

/**
 * POST /api/printers/test - проверить конкретный принтер
 * Body: { ip: string, port?: number }
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { ip, port = 9101 } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP адрес обязателен'
      });
    }
    
    console.log(`🔍 Проверка принтера ${ip}:${port}...`);
    
    const printer = await printerDiscoveryService.testPrinter(ip, port);
    
    if (printer) {
      res.json({
        success: true,
        data: printer,
        message: `Принтер ${ip}:${port} доступен`
      });
    } else {
      res.json({
        success: false,
        data: null,
        message: `Принтер ${ip}:${port} недоступен`
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки принтера:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки принтера'
    });
  }
});

/**
 * GET /api/printers/status - проверить статус известного принтера
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Проверяем принтер с известными настройками
    const knownIP = '192.168.14.200';
    const knownPort = 9101;
    
    console.log(`📋 Проверка статуса принтера ${knownIP}:${knownPort}...`);
    
    const printer = await printerDiscoveryService.testPrinter(knownIP, knownPort);
    
    res.json({
      success: true,
      data: {
        configured: {
          ip: knownIP,
          port: knownPort
        },
        status: printer ? 'connected' : 'disconnected',
        printer: printer || null
      },
      message: printer 
        ? `Принтер ${knownIP}:${knownPort} подключен` 
        : `Принтер ${knownIP}:${knownPort} не отвечает`
    });
    
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки статуса принтера'
    });
  }
});

export { router as printerDiscoveryRouter };