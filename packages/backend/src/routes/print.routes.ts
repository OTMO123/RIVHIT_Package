import { Router } from 'express';
import { PrintController } from '../controllers/print.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import {
  PrintLabelsBodySchema,
  PrintSingleLabelBodySchema,
  PrintShippingLabelBodySchema,
  ConfigurePrinterBodySchema,
  GetPrintJobsQuerySchema,
  GetPrintJobParamsSchema
} from '../schemas/api.schemas';

const router = Router();
const execAsync = promisify(exec);

// 🚨 CRITICAL FIX: Use PrintController with proper dependency injection from app.locals
// This ensures we use the ZPL printer service from ApplicationServiceFactory
function getPrintController(req: any): PrintController {
  const controller = req.app.locals.printController;
  if (!controller) {
    throw new Error('PrintController not found in app.locals - dependency injection failed');
  }
  return controller;
}

/**
 * @route POST /api/print/labels
 * @desc Печать этикеток для выбранных товаров
 * @body { items: PackingItem[], options?: PrintJobOptions }
 */
router.post('/labels', 
  validateRequest({ body: PrintLabelsBodySchema }),
  async (req, res) => {
    await getPrintController(req).printLabels(req, res);
  }
);

/**
 * @route POST /api/print/single-label
 * @desc Печать одной этикетки
 * @body { item: PackingItem, options?: PrintJobOptions }
 */
router.post('/single-label', 
  validateRequest({ body: PrintSingleLabelBodySchema }),
  async (req, res) => {
    await getPrintController(req).printSingleLabel(req, res);
  }
);

/**
 * @route GET /api/print/status
 * @desc Получение статуса принтера
 */
router.get('/status', async (req, res) => {
  await getPrintController(req).getPrinterStatus(req, res);
});

/**
 * @route POST /api/print/test
 * @desc Тестовая печать
 */
router.post('/test', async (req, res) => {
  await getPrintController(req).testPrint(req, res);
});

/**
 * @route POST /api/print/configure
 * @desc Конфигурация принтера
 * @body { model?: string, dpi?: number, speed?: number, darkness?: number }
 */
router.post('/configure', 
  validateRequest({ body: ConfigurePrinterBodySchema }),
  async (req, res) => {
    await getPrintController(req).configurePrinter(req, res);
  }
);

/**
 * @route GET /api/print/formats
 * @desc Получение поддерживаемых форматов печати
 */
router.get('/formats', async (req, res) => {
  await getPrintController(req).getSupportedFormats(req, res);
});

/**
 * @route GET /api/print/connection
 * @desc Получение информации о подключении принтера
 */
router.get('/connection', async (req, res) => {
  await getPrintController(req).getConnectionInfo(req, res);
});

/**
 * @route GET /api/print/job/:jobId
 * @desc Получение статуса задания печати
 * @param jobId - ID задания печати
 */
router.get('/job/:jobId', 
  validateRequest({ params: GetPrintJobParamsSchema }),
  async (req, res) => {
    await getPrintController(req).getJobStatus(req, res);
  }
);

/**
 * @route GET /api/print/jobs
 * @desc Получение всех заданий печати
 * @query status - Фильтр по статусу (success, failed)
 */
router.get('/jobs', 
  validateRequest({ query: GetPrintJobsQuerySchema }),
  async (req, res) => {
    await getPrintController(req).getAllJobs(req, res);
  }
);

/**
 * @route DELETE /api/print/jobs
 * @desc Очистка истории заданий печати
 */
router.delete('/jobs', async (req, res) => {
  await getPrintController(req).clearJobHistory(req, res);
});

/**
 * @route POST /api/print/test-simple
 * @desc Тест простой этикетки для диагностики
 */
router.post('/test-simple', async (req, res) => {
  try {
    console.log('🔍 [ROUTE DEBUG] ======================================');
    console.log('🔍 [ROUTE DEBUG] Test print endpoint called');
    console.log('🔍 [ROUTE DEBUG] Request details:', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type')
    });
    
    const fs = require('fs');
    const path = require('path');
    
    console.log('🔍 [ROUTE DEBUG] Reading test template...');
    const templatePath = path.join(__dirname, '../../printer-templates/test-simple.ezpl');
    console.log('🔍 [ROUTE DEBUG] Template path:', templatePath);
    
    const ezplCode = fs.readFileSync(templatePath, 'utf8');
    console.log('🔍 [ROUTE DEBUG] Template loaded successfully');
    console.log('🔍 [ROUTE DEBUG] Template length:', ezplCode.length, 'characters');
    
    console.log('🔍 [ROUTE DEBUG] Getting ZPL service...');
    const zplService = req.app.locals.zplPrinterService;
    if (!zplService) {
      console.error('❌ [ROUTE DEBUG] ZPL service not available in app.locals');
      console.error('🔍 [ROUTE DEBUG] Available services:', Object.keys(req.app.locals));
      return res.status(500).json({
        success: false,
        error: 'ZPL service not available',
        debug: {
          availableServices: Object.keys(req.app.locals),
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.log('🔍 [ROUTE DEBUG] ZPL service found, sending command...');
    console.log('🧪 Sending simple test label to printer...');
    
    const printResult = await zplService.sendRawCommand(ezplCode);
    
    console.log('🔍 [ROUTE DEBUG] Print result:', printResult);
    
    if (printResult) {
      console.log('✅ [ROUTE DEBUG] Print command completed successfully');
    } else {
      console.warn('⚠️ [ROUTE DEBUG] Print command failed or timed out');
    }
    
    res.json({
      success: printResult,
      message: printResult ? 'Simple test label sent to printer' : 'Print failed - check printer connection',
      ezplCode: ezplCode.substring(0, 200) + '...',
      debug: {
        commandLength: ezplCode.length,
        printResult,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('🔍 [ROUTE DEBUG] ======================================');
    
  } catch (error) {
    console.error('❌ [ROUTE DEBUG] Test print error:', error);
    console.error('🔍 [ROUTE DEBUG] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test print failed',
      debug: {
        errorType: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/print/reconnect
 * @desc Переподключение к принтеру
 */
router.post('/reconnect', async (req, res) => {
  await getPrintController(req).reconnectPrinter(req, res);
});

/**
 * @route POST /api/print/shipping-label
 * @desc Печать этикетки доставки для заказа
 * @body { orderId: string, customerName: string, address?: string, items?: any[], copies?: number }
 */
router.post('/shipping-label', 
  validateRequest({ body: PrintShippingLabelBodySchema }),
  async (req, res) => {
    await getPrintController(req).printShippingLabel(req, res);
  }
);

/**
 * @route POST /api/print/product-labels
 * @desc Печать этикеток товаров для заказа
 * @body { orderId: string, items: PackingItem[], options?: PrintJobOptions }
 */
router.post('/product-labels', async (req, res) => {
  await getPrintController(req).printProductLabels(req, res);
});

/**
 * @route POST /api/print/box-labels
 * @desc Печать этикеток для коробок с заказами
 * @body { orderId: string | number, boxes: PackingBox[], customerName: string, customerCity?: string, format?: 'standard' | 'compact' }
 */
router.post('/box-labels', async (req, res) => {
  await getPrintController(req).printBoxLabels(req, res);
});

/**
 * @route POST /api/print/box-label-preview
 * @desc Генерация превью этикетки коробки
 * @body { orderId: string | number, boxNumber: number, totalBoxes?: number, customerName: string, customerCity?: string, items?: any[], format?: 'standard' | 'compact' }
 */
router.post('/box-label-preview', async (req, res) => {
  await getPrintController(req).generateBoxLabelPreview(req, res);
});

/**
 * @route POST /api/print/assign-boxes
 * @desc Автоматическое назначение товаров по коробкам
 * @body { items: PackingItem[], maxPerBox?: number }
 */
router.post('/assign-boxes', async (req, res) => {
  await getPrintController(req).assignItemsToBoxes(req, res);
});

/**
 * @route POST /api/print/batch-print
 * @desc Пакетная печать этикеток
 * @body { orderId: string | number, labels: Array, region?: string, customerName: string }
 */
router.post('/batch-print', async (req, res) => {
  await getPrintController(req).batchPrintLabels(req, res);
});

/**
 * @route POST /api/print/box-label-ezpl
 * @desc Generate EZPL code for box label (no image generation)
 * @body { orderId: string | number, boxNumber: number, totalBoxes?: number, customerName: string, customerCity?: string, items?: any[], region?: string, format?: 'standard' | 'compact' }
 */
router.post('/box-label-ezpl', async (req, res) => {
  await getPrintController(req).generateBoxLabelEZPL(req, res);
});

/**
 * @route POST /api/print/box-labels-ezpl
 * @desc Print box labels using EZPL (direct printer commands)
 * @body { orderId: string | number, boxes: PackingBox[], customerName: string, customerCity?: string, region?: string, format?: 'standard' | 'compact' }
 */
router.post('/box-labels-ezpl', async (req, res) => {
  await getPrintController(req).printBoxLabelsEZPL(req, res);
});

/**
 * @route POST /api/print/box-label-html
 * @desc Generate HTML visualization of box label EZPL
 * @body { orderId: string | number, boxNumber?: number, totalBoxes?: number, customerName: string, customerCity?: string, items?: any[], region?: string }
 */
router.post('/box-label-html', async (req, res) => {
  await getPrintController(req).generateBoxLabelHTML(req, res);
});

/**
 * @route POST /api/print/box-labels-html
 * @desc Generate HTML visualization for multiple box labels
 * @body { orderId: string | number, boxes: any[], customerName: string, customerCity?: string, region?: string }
 */
router.post('/box-labels-html', async (req, res) => {
  await getPrintController(req).generateMultipleBoxLabelsHTML(req, res);
});

/**
 * @route POST /api/print/test-usb
 * @desc Test USB printer on Windows/macOS platforms
 * @body { platform?: 'windows' | 'macos', printerName?: string }
 */
router.post('/test-usb', async (req, res) => {
  try {
    console.log('🔌 Testing USB printer...');
    
    const platform = process.platform;
    const { printerName = 'GODEX_ZX420i' } = req.body;
    
    if (platform === 'win32') {
      // Windows: Use PowerShell to print test page
      const scriptPath = path.join(__dirname, '../../scripts/print-test-usb.ps1');
      const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${printerName}"`;
      
      const { stdout, stderr } = await execAsync(command, { timeout: 15000 });
      
      return res.json({
        success: !stderr || !stderr.includes('Error'),
        data: {
          platform: 'Windows',
          output: stdout,
          warnings: stderr || null,
          printerName,
          method: 'powershell-test-page'
        },
        message: !stderr || !stderr.includes('Error') 
          ? `Test page sent to ${printerName}` 
          : `Failed to send test page: ${stderr}`,
        timestamp: new Date().toISOString()
      });
      
    } else if (platform === 'darwin') {
      // macOS: Use lp command to print test
      try {
        const command = `echo "🧪 USB Test Print - $(date)" | lp -d "${printerName}" -o media=Custom.4x3in`;
        const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
        
        return res.json({
          success: true,
          data: {
            platform: 'macOS',
            output: stdout,
            warnings: stderr || null,
            printerName,
            method: 'cups-lp-command'
          },
          message: `Test print sent to ${printerName} via CUPS`,
          timestamp: new Date().toISOString()
        });
        
      } catch (cupsError) {
        return res.json({
          success: false,
          error: 'CUPS printing failed',
          data: {
            platform: 'macOS',
            cupsError: cupsError.message,
            printerName,
            suggestions: [
              'Ensure printer is added in System Preferences > Printers & Scanners',
              'Check printer name matches exactly',
              'Verify CUPS service is running: sudo launchctl load /System/Library/LaunchDaemons/org.cups.cupsd.plist'
            ]
          },
          timestamp: new Date().toISOString()
        });
      }
      
    } else {
      return res.json({
        success: false,
        error: 'USB printing not supported on this platform',
        data: {
          platform: platform,
          supportedPlatforms: ['win32', 'darwin']
        },
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ USB test print error:', error);
    res.status(500).json({
      success: false,
      error: 'USB test print failed',
      details: error.message,
      platform: process.platform,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;