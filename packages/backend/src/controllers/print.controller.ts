import { Request, Response } from 'express';
import * as path from 'path';
import { 
  PrinterService, 
  PrinterServiceFactory,
  PrintJobOptions, 
  PrintJobResult,
  GoDEXPrinterStatus 
} from '../services/printer.service';
import { IPrinterService } from '../interfaces/IPrinterService';
import { PackingItem, PackingBox } from '@packing/shared';
import { BoxLabelService, BoxLabelData } from '../services/box-label.service';
import { BoxLabelZPLService } from '../services/box-label-zpl.service';
import { BoxLabelEZPLService, BoxLabelEZPLData } from '../services/box-label-ezpl.service';
import { ImagePrintService } from '../services/image-print.service';
import { SimpleZPLService } from '../services/simple-zpl.service';
import { WindowsPrintService } from '../services/windows-print.service';
import { ILogger } from '../interfaces/ILogger';
import { ConsoleLoggerService } from '../services/logging/console.logger.service';

export class PrintController {
  private printerService: PrinterService;
  private boxLabelService: BoxLabelService;
  private boxLabelZPLService: BoxLabelZPLService;
  private boxLabelEZPLService: BoxLabelEZPLService;
  private imagePrintService: ImagePrintService;
  private simpleZPLService: SimpleZPLService;
  private windowsPrintService: WindowsPrintService;
  private logger: ILogger;

  constructor(printerService?: PrinterService) {
    // Initialize logger
    this.logger = new ConsoleLoggerService('PrintController');
    
    // Initialize box label services
    this.boxLabelService = new BoxLabelService(this.logger);
    this.boxLabelZPLService = new BoxLabelZPLService();
    this.boxLabelEZPLService = new BoxLabelEZPLService(this.logger);
    this.imagePrintService = new ImagePrintService();
    this.simpleZPLService = new SimpleZPLService();
    this.windowsPrintService = new WindowsPrintService();
    
    // 🚨 CRITICAL FIX: Always use injected printer service from ApplicationServiceFactory
    // Never create own printer service to avoid configuration conflicts
    if (!printerService) {
      throw new Error('PrintController requires a printer service from ApplicationServiceFactory');
    }
    
    this.printerService = printerService;
    console.log('✅ PrintController using injected ZPL printer service from ApplicationServiceFactory');
  }

  /**
   * Печать этикеток для выбранных товаров
   * POST /api/print/labels
   */
  async printLabels(req: Request, res: Response): Promise<void> {
    try {
      const { items, options }: { items: PackingItem[], options?: PrintJobOptions } = req.body;

      // Валидация входных данных
      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No items provided for printing'
        });
        return;
      }

      // Фильтруем только упакованные и доступные товары
      const itemsToPrint = items.filter(item => item.isPacked && item.isAvailable);

      if (itemsToPrint.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No packed items found for printing'
        });
        return;
      }

      console.log(`🖨️ Printing labels for ${itemsToPrint.length} items`);

      // Печать этикеток
      const result: PrintJobResult = await this.printerService.printBarcodeLabels(
        itemsToPrint,
        options
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          printedItems: result.printedItems,
          estimatedTime: result.estimatedTime,
          ezplCommands: result.ezplCommands || [],
          message: `Successfully printed ${result.printedItems} labels`
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Unknown printing error'
        });
      }

    } catch (error) {
      console.error('❌ Error in printLabels:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Печать одной этикетки
   * POST /api/print/single-label
   */
  async printSingleLabel(req: Request, res: Response): Promise<void> {
    try {
      const { item, options }: { item: PackingItem, options?: PrintJobOptions } = req.body;

      if (!item) {
        res.status(400).json({
          success: false,
          error: 'No item provided for printing'
        });
        return;
      }

      if (!item.isPacked || !item.isAvailable) {
        res.status(400).json({
          success: false,
          error: 'Item is not packed or not available'
        });
        return;
      }

      console.log(`🏷️ Printing single label for item: ${item.item_name}`);

      const success = await this.printerService.printSingleLabel(item, options);

      if (success) {
        res.status(200).json({
          success: true,
          message: `Label printed successfully for ${item.item_name}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to print label'
        });
      }

    } catch (error) {
      console.error('❌ Error in printSingleLabel:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Получение статуса принтера
   * GET /api/print/status
   */
  async getPrinterStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.printerService.checkPrinterStatus();
      
      res.status(200).json({
        success: true,
        status
      });

    } catch (error) {
      console.error('❌ Error getting printer status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get printer status'
      });
    }
  }

  /**
   * Тестовая печать
   * POST /api/print/test
   */
  async testPrint(req: Request, res: Response): Promise<void> {
    console.log('🚀 [BACKEND TEST PRINT] Получен запрос на тестовую печать');
    console.log('📋 [BACKEND TEST PRINT] Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    try {
      console.log('🧪 [BACKEND TEST PRINT] Запускаем тестовую печать...');
      console.log('🖨️ [BACKEND TEST PRINT] Printer service status:', {
        isConnected: this.printerService.isConnected,
        connectionInfo: this.printerService.getConnectionInfo()
      });
      
      const result = await this.printerService.testPrint();
      console.log('📊 [BACKEND TEST PRINT] Результат от printer service:', result);

      if (result.success) {
        console.log('✅ [BACKEND TEST PRINT] Тестовая печать успешна');
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          message: 'Test print completed successfully'
        });
      } else {
        console.error('❌ [BACKEND TEST PRINT] Тестовая печать неудачна:', result.error);
        res.status(500).json({
          success: false,
          error: result.error || 'Test print failed'
        });
      }

    } catch (error) {
      console.error('🚨 [BACKEND TEST PRINT] Критическая ошибка:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Test print failed'
      });
    }
  }

  /**
   * Конфигурация принтера
   * POST /api/print/configure
   */
  async configurePrinter(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      console.log('⚙️ Configuring printer with:', config);
      
      const success = await this.printerService.configurePrinter(config);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Printer configured successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to configure printer'
        });
      }

    } catch (error) {
      console.error('❌ Error configuring printer:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Configuration failed'
      });
    }
  }

  /**
   * Получение поддерживаемых форматов
   * GET /api/print/formats
   */
  async getSupportedFormats(req: Request, res: Response): Promise<void> {
    try {
      const formats = this.printerService.getSupportedFormats();
      
      res.status(200).json({
        success: true,
        formats
      });

    } catch (error) {
      console.error('❌ Error getting supported formats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get supported formats'
      });
    }
  }

  /**
   * Получение информации о подключении принтера
   * GET /api/print/connection
   */
  async getConnectionInfo(req: Request, res: Response): Promise<void> {
    try {
      const connectionInfo = this.printerService.getConnectionInfo();
      
      res.status(200).json({
        success: true,
        connection: connectionInfo
      });

    } catch (error) {
      console.error('❌ Error getting connection info:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connection info'
      });
    }
  }

  /**
   * Получение статуса задания печати
   * GET /api/print/job/:jobId
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      const jobStatus = this.printerService.getJobStatus(jobId);
      
      if (!jobStatus) {
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        job: jobStatus
      });

    } catch (error) {
      console.error('❌ Error getting job status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job status'
      });
    }
  }

  /**
   * Получение всех заданий печати
   * GET /api/print/jobs
   */
  async getAllJobs(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      
      let jobs;
      if (status === 'success') {
        jobs = this.printerService.getJobsByStatus(true);
      } else if (status === 'failed') {
        jobs = this.printerService.getJobsByStatus(false);
      } else {
        jobs = this.printerService.getAllJobs();
      }

      res.status(200).json({
        success: true,
        jobs,
        total: jobs.length
      });

    } catch (error) {
      console.error('❌ Error getting all jobs:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get jobs'
      });
    }
  }

  /**
   * Очистка истории заданий печати
   * DELETE /api/print/jobs
   */
  async clearJobHistory(req: Request, res: Response): Promise<void> {
    try {
      this.printerService.clearJobHistory();
      
      res.status(200).json({
        success: true,
        message: 'Job history cleared successfully'
      });

    } catch (error) {
      console.error('❌ Error clearing job history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear job history'
      });
    }
  }

  /**
   * Переподключение к принтеру
   * POST /api/print/reconnect
   */
  async reconnectPrinter(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Reconnecting to GoDEX ZX420 printer...');
      
      // Отключаемся
      await this.printerService.disconnect();
      
      // Ждем секунду
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Переподключаемся
      const success = await this.printerService.initialize({
        connectionType: (process.env.PRINTER_CONNECTION_TYPE as 'usb' | 'serial' | 'ethernet') || 'usb',
        port: process.env.PRINTER_PORT || 'COM1'
      });

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Printer reconnected successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to reconnect printer'
        });
      }

    } catch (error) {
      console.error('❌ Error reconnecting printer:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Reconnection failed'
      });
    }
  }

  /**
   * Печать этикетки доставки для заказа
   * POST /api/print/shipping-label
   */
  async printShippingLabel(req: Request, res: Response): Promise<void> {
    console.log('🚀 [BACKEND SHIPPING LABEL] Получен запрос на печать этикетки доставки');
    console.log('📋 [BACKEND SHIPPING LABEL] Request details:', {
      method: req.method,
      url: req.url,
      body: req.body
    });
    
    try {
      const { orderId, customerName, address, items, copies = 1 } = req.body;

      if (!orderId || !customerName) {
        console.error('❌ [BACKEND SHIPPING LABEL] Отсутствуют обязательные параметры');
        res.status(400).json({
          success: false,
          error: 'Order ID and customer name are required'
        });
        return;
      }

      console.log(`📦 [BACKEND SHIPPING LABEL] Printing shipping label for order: ${orderId}`);
      console.log('👤 [BACKEND SHIPPING LABEL] Customer:', customerName);
      console.log('📍 [BACKEND SHIPPING LABEL] Address:', address);
      console.log('📦 [BACKEND SHIPPING LABEL] Items count:', items?.length || 0);
      console.log('🔢 [BACKEND SHIPPING LABEL] Copies:', copies);

      // Создаем фиктивный товар для этикетки доставки
      const shippingLabelItem: PackingItem = {
        item_id: 0,
        item_name: `Заказ #${orderId}`,
        item_part_num: `ORDER${orderId}`,
        item_extended_description: `Заказ номер ${orderId}`,
        barcode: `ORDER${orderId}`,
        item_group_id: 0,
        storage_id: 0,
        quantity: 1,
        cost_nis: 0,
        sale_nis: 0,
        currency_id: 1,
        cost_mtc: 0,
        sale_mtc: 0,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        location: 'SHIPPING',
        is_serial: 0,
        sapak: 0,
        item_name_en: `Order #${orderId}`,
        item_order: 0,
        line_id: `shipping_${orderId}`,
        packedQuantity: 1,
        isAvailable: true,
        isPacked: true,
        notes: 'Shipping label',
        reason: 'shipping'
      };

      console.log('🏷️ [BACKEND SHIPPING LABEL] Создан товар для этикетки доставки:', shippingLabelItem);
      console.log('⚙️ [BACKEND SHIPPING LABEL] Параметры печати:', {
        copies, 
        labelSize: 'large',
        includeText: true,
        includeQuantity: false,
        includePrices: false
      });

      console.log('🖨️ [BACKEND SHIPPING LABEL] Вызываем printBarcodeLabels...');
      const result = await this.printerService.printBarcodeLabels(
        [shippingLabelItem], 
        { 
          copies, 
          labelSize: 'large',
          includeText: true,
          includeQuantity: false,
          includePrices: false
        }
      );

      console.log('📊 [BACKEND SHIPPING LABEL] Результат печати:', result);

      if (result.success) {
        console.log('✅ [BACKEND SHIPPING LABEL] Печать успешна');
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          message: `Shipping label printed for order ${orderId}`
        });
      } else {
        console.error('❌ [BACKEND SHIPPING LABEL] Печать неудачна:', result.error);
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to print shipping label'
        });
      }

    } catch (error) {
      console.error('🚨 [BACKEND SHIPPING LABEL] Критическая ошибка:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Shipping label print failed'
      });
    }
  }

  /**
   * Печать этикеток товаров для заказа
   * POST /api/print/product-labels
   */
  async printProductLabels(req: Request, res: Response): Promise<void> {
    // Capture all console logs for frontend forwarding
    const debugLogs: any[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Override console methods to capture logs
    console.log = (...args: any[]) => {
      debugLogs.push({ level: 'info', message: args.join(' '), timestamp: new Date().toISOString() });
      originalConsoleLog(...args);
    };
    console.error = (...args: any[]) => {
      debugLogs.push({ level: 'error', message: args.join(' '), timestamp: new Date().toISOString() });
      originalConsoleError(...args);
    };
    console.warn = (...args: any[]) => {
      debugLogs.push({ level: 'warn', message: args.join(' '), timestamp: new Date().toISOString() });
      originalConsoleWarn(...args);
    };

    console.log('🚀 [BACKEND PRODUCT LABELS] Получен запрос на печать этикеток товаров');
    console.log('📋 [BACKEND PRODUCT LABELS] Request details:', {
      method: req.method,
      url: req.url,
      body: req.body
    });
    
    try {
      const { orderId, items, options }: { 
        orderId: string, 
        items: PackingItem[], 
        options?: PrintJobOptions 
      } = req.body;

      if (!orderId || !items || !Array.isArray(items)) {
        console.error('❌ [BACKEND PRODUCT LABELS] Отсутствуют обязательные параметры');
        
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        
        res.status(400).json({
          success: false,
          error: 'Order ID and items array are required',
          logs: debugLogs,
          debug: {
            totalLogs: debugLogs.length,
            timestamp: new Date().toISOString(),
            validationError: 'Missing required parameters'
          }
        });
        return;
      }

      console.log(`📦 [BACKEND PRODUCT LABELS] Order ID: ${orderId}`);
      console.log(`📦 [BACKEND PRODUCT LABELS] Total items received: ${items.length}`);
      console.log('⚙️ [BACKEND PRODUCT LABELS] Options:', options);

      // Фильтруем только упакованные и доступные товары
      const itemsToPrint = items.filter(item => 
        item.isPacked && 
        item.isAvailable && 
        item.packedQuantity > 0
      );

      console.log(`🔍 [BACKEND PRODUCT LABELS] Filtered items to print: ${itemsToPrint.length}`);
      console.log('📋 [BACKEND PRODUCT LABELS] Items to print:', itemsToPrint.map(item => ({
        id: item.item_id,
        name: item.item_name,
        quantity: item.packedQuantity,
        isPacked: item.isPacked,
        isAvailable: item.isAvailable
      })));

      if (itemsToPrint.length === 0) {
        console.warn('⚠️ [BACKEND PRODUCT LABELS] Нет товаров для печати');
        
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        
        res.status(400).json({
          success: false,
          error: 'No valid items found for printing',
          logs: debugLogs,
          debug: {
            totalLogs: debugLogs.length,
            timestamp: new Date().toISOString(),
            orderId,
            totalItemsReceived: items.length,
            filteredItemsCount: 0,
            validationError: 'No printable items found'
          }
        });
        return;
      }

      console.log(`🏷️ [BACKEND PRODUCT LABELS] Printing product labels for order ${orderId}: ${itemsToPrint.length} items`);

      const printOptions = {
        copies: 1,
        includeBarcodes: true,
        includeText: true,
        includeQuantity: true,
        includePrices: true,
        ...options,
        // Ensure labelSize is one of the valid options
        labelSize: (['small', 'medium', 'large'].includes(options?.labelSize as string) 
          ? options?.labelSize 
          : 'medium') as 'small' | 'medium' | 'large'
      };
      console.log('⚙️ [BACKEND PRODUCT LABELS] Final print options:', printOptions);

      console.log('🖨️ [BACKEND PRODUCT LABELS] Вызываем printBarcodeLabels...');
      const result = await this.printerService.printBarcodeLabels(itemsToPrint, printOptions);

      console.log('📊 [BACKEND PRODUCT LABELS] Результат печати:', result);

      // Restore original console methods before sending response
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      if (result.success) {
        console.log('✅ [BACKEND PRODUCT LABELS] Печать товарных этикеток успешна');
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          printedItems: result.printedItems,
          estimatedTime: result.estimatedTime,
          ezplCommands: result.ezplCommands || [],
          message: `Product labels printed for order ${orderId}`,
          // Forward comprehensive debug logs to frontend
          logs: debugLogs,
          debug: {
            totalLogs: debugLogs.length,
            timestamp: new Date().toISOString(),
            orderId,
            itemsCount: itemsToPrint.length,
            printResult: result
          }
        });
      } else {
        console.error('❌ [BACKEND PRODUCT LABELS] Печать товарных этикеток неудачна:', result.error);
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to print product labels',
          // Include debug logs even on failure
          logs: debugLogs,
          debug: {
            totalLogs: debugLogs.length,
            timestamp: new Date().toISOString(),
            orderId,
            itemsCount: itemsToPrint?.length || 0,
            printResult: result
          }
        });
      }

    } catch (error) {
      console.error('🚨 [BACKEND PRODUCT LABELS] Критическая ошибка:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      
      // Restore original console methods before sending response
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Product labels print failed',
        // Include debug logs on critical error
        logs: debugLogs,
        debug: {
          totalLogs: debugLogs.length,
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : 'UnknownError',
          orderId: req.body?.orderId || 'unknown',
          errorDetails: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error)
        }
      });
    }
  }

  /**
   * Печать этикеток для коробок с заказами
   * POST /api/print/box-labels
   */
  async printBoxLabels(req: Request, res: Response): Promise<void> {
    try {
      const { 
        orderId, 
        boxes, 
        customerName, 
        customerCity,
        format = 'standard',
        region
      }: {
        orderId: string | number;
        boxes: PackingBox[];
        customerName: string;
        customerCity?: string;
        format?: 'standard' | 'compact';
        region?: string;
      } = req.body;

      // Валидация входных данных
      if (!orderId || !boxes || !Array.isArray(boxes) || boxes.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Order ID and boxes array are required'
        });
        return;
      }

      if (!customerName) {
        res.status(400).json({
          success: false,
          error: 'Customer name is required'
        });
        return;
      }

      console.log(`🏷️ Generating box labels for order ${orderId}, ${boxes.length} boxes`);

      const labelPaths: string[] = [];
      const printResults: any[] = [];

      // Генерируем и печатаем этикетки для каждой коробки
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        try {
          // Подготавливаем данные для этикетки
          // Используем индекс + 1 для правильной нумерации
          const boxLabelData: BoxLabelData = {
            orderId,
            boxNumber: i + 1,  // Используем индекс для правильной нумерации 1, 2, 3...
            totalBoxes: boxes.length,
            customerName,
            customerCity,
            items: box.items.map(item => ({
              name: item.name,
              nameHebrew: item.nameHebrew,
              nameRussian: item.nameRussian,
              quantity: item.quantity,
              barcode: item.barcode,
              catalogNumber: item.catalogNumber
            })),
            deliveryDate: new Date().toLocaleDateString('he-IL'),
            region: region
          };

          // Генерируем изображение этикетки
          const labelPath = format === 'compact' 
            ? await this.boxLabelService.generateCompactBoxLabel(boxLabelData)
            : await this.boxLabelService.generateBoxLabel(boxLabelData);

          labelPaths.push(labelPath);

          // Печатаем этикетку через PowerShell
          const printResult = await this.printImageLabel(labelPath);
          
          printResults.push({
            boxNumber: i + 1,  // Используем правильный номер коробки
            success: printResult.success,
            labelPath,
            error: printResult.error
          });

          // Помечаем коробку как напечатанную
          if (printResult.success) {
            box.isPrinted = true;
            box.printedAt = new Date().toISOString();
          }

        } catch (error) {
          console.error(`❌ Failed to print label for box ${box.boxNumber}:`, error);
          printResults.push({
            boxNumber: box.boxNumber,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Подсчитываем результаты
      const successCount = printResults.filter(r => r.success).length;
      const failedCount = printResults.filter(r => !r.success).length;

      res.status(200).json({
        success: successCount > 0,
        message: `Printed ${successCount} of ${boxes.length} box labels`,
        results: printResults,
        stats: {
          total: boxes.length,
          successful: successCount,
          failed: failedCount
        }
      });

    } catch (error) {
      console.error('❌ Error printing box labels:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to print box labels'
      });
    }
  }

  /**
   * Генерация превью этикетки коробки
   * POST /api/print/box-label-preview
   */
  async generateBoxLabelPreview(req: Request, res: Response): Promise<void> {
    try {
      const { 
        orderId, 
        boxNumber, 
        totalBoxes,
        customerName, 
        customerCity,
        items,
        region,
        format = 'standard'
      } = req.body;

      // Валидация
      if (!orderId || !boxNumber || !customerName) {
        res.status(400).json({
          success: false,
          error: 'Order ID, box number and customer name are required'
        });
        return;
      }

      const boxLabelData: BoxLabelData = {
        orderId,
        boxNumber,
        totalBoxes: totalBoxes || 1,
        customerName,
        customerCity,
        items: items || [],
        region: region,
        deliveryDate: new Date().toLocaleDateString('he-IL')
      };

      // Генерируем изображение
      const labelPath = format === 'compact'
        ? await this.boxLabelService.generateCompactBoxLabel(boxLabelData)
        : await this.boxLabelService.generateBoxLabel(boxLabelData);

      // Читаем файл и отправляем как base64
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(labelPath);
      const base64Image = imageBuffer.toString('base64');

      res.status(200).json({
        success: true,
        preview: `data:image/png;base64,${base64Image}`,
        path: labelPath,
        format,
        dimensions: format === 'compact' ? '7x7cm' : '10x10cm'
      });

    } catch (error) {
      console.error('❌ Error generating box label preview:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview'
      });
    }
  }

  /**
   * Вспомогательный метод для печати изображения через PowerShell
   */
  private async printImageLabel(imagePath: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      const path = require('path');
      
      // PowerShell команда для печати изображения
      const scriptPath = path.join(process.cwd(), 'config', 'scripts', 'print-image.ps1');
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" -ImagePath "${imagePath}"`;

      exec(command, { timeout: 30000 }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error('Print command error:', error);
          resolve({ success: false, error: error.message });
        } else {
          console.log('Print command output:', stdout);
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Пакетная печать этикеток
   * POST /api/print/batch-print
   */
  async batchPrintLabels(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, labels, region, customerName } = req.body;
      
      if (!labels || !Array.isArray(labels)) {
        res.status(400).json({
          success: false,
          error: 'Labels array is required'
        });
        return;
      }
      
      console.log('📦 Received labels for printing:', labels.length, 'boxes');
      
      // Проверяем наличие изображений
      const hasImages = labels.every(label => label.imageData);
      
      let printResult: any = { success: false, printedCount: 0 };
      
      if (hasImages) {
        // Используем новый сервис печати изображений (работающий метод ZPL)
        console.log('🏷️ Using image printing service (ZPL method 1)...');
        
        printResult = await this.imagePrintService.printBoxLabelsWithImages(labels);
      } else {
        // Иначе генерируем ZPL текстовые этикетки
        console.log('📝 Using text ZPL method...');
        const boxesToPrint = labels.map(label => ({
          boxNumber: label.boxNumber,
          totalBoxes: labels.length,
          orderId: orderId,
          items: label.items || [],
          imageData: label.imageData
        }));
        printResult = await this.boxLabelZPLService.printBoxLabels(boxesToPrint);
      }
      
      // Формируем результаты для ответа
      const results = labels.map((label, index) => ({
        boxNumber: label.boxNumber,
        success: index < printResult.printedCount,
        itemsCount: label.items?.length || 0
      }));
      
      res.status(200).json({
        success: printResult.success,
        results,
        message: `Напечатано ${printResult.printedCount} из ${labels.length} этикеток`
      });
      
    } catch (error) {
      console.error('❌ Error in batch print:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Batch print failed'
      });
    }
  }

  /**
   * Автоматическое назначение товаров по коробкам
   * POST /api/print/assign-boxes
   */
  async assignItemsToBoxes(req: Request, res: Response): Promise<void> {
    try {
      const { items, maxPerBox = 10 }: { items: PackingItem[], maxPerBox: number } = req.body;

      if (!items || !Array.isArray(items)) {
        res.status(400).json({
          success: false,
          error: 'Items array is required'
        });
        return;
      }

      const boxes: PackingBox[] = [];
      let currentBox: PackingBox | null = null;
      let boxNumber = 1;

      // Сортируем товары по размеру/весу если есть данные
      const sortedItems = [...items].sort((a, b) => {
        // Приоритет крупным товарам
        const aSize = a.boxCapacity || 1;
        const bSize = b.boxCapacity || 1;
        return bSize - aSize;
      });

      for (const item of sortedItems) {
        const itemQuantity = item.packedQuantity || item.quantity;
        
        // Если нет текущей коробки или она заполнена, создаем новую
        if (!currentBox || currentBox.items.length >= maxPerBox) {
          currentBox = {
            boxId: `BOX_${Date.now()}_${boxNumber}`,
            boxNumber,
            orderId: '',
            items: [],
            isFull: false,
            isPrinted: false
          };
          boxes.push(currentBox);
          boxNumber++;
        }

        // Добавляем товар в текущую коробку
        currentBox.items.push({
          itemId: item.item_id,
          name: item.item_name,
          nameHebrew: item.item_name, // Using item_name as fallback
          quantity: itemQuantity,
          catalogNumber: item.item_part_num || undefined,
          barcode: item.barcode || undefined
        });

        // Проверяем, заполнена ли коробка
        if (currentBox.items.length >= maxPerBox) {
          currentBox.isFull = true;
        }
      }

      console.log(`📦 Assigned ${items.length} items to ${boxes.length} boxes`);

      res.status(200).json({
        success: true,
        boxes,
        stats: {
          totalItems: items.length,
          totalBoxes: boxes.length,
          averageItemsPerBox: Math.round(items.length / boxes.length)
        }
      });

    } catch (error) {
      console.error('❌ Error assigning items to boxes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign boxes'
      });
    }
  }

  /**
   * Generate EZPL code for box label (no image generation)
   * POST /api/print/box-label-ezpl
   */
  async generateBoxLabelEZPL(req: Request, res: Response): Promise<void> {
    try {
      const { 
        orderId, 
        boxNumber, 
        totalBoxes,
        customerName, 
        customerCity,
        items,
        region,
        format = 'standard'
      } = req.body;

      // Validation
      if (!orderId || !boxNumber || !customerName) {
        res.status(400).json({
          success: false,
          error: 'Order ID, box number, and customer name are required'
        });
        return;
      }

      this.logger.info('Generating EZPL for box label', {
        orderId,
        boxNumber,
        totalBoxes,
        format
      });

      // Prepare data for EZPL generation
      const ezplData: BoxLabelEZPLData = {
        orderId,
        boxNumber,
        totalBoxes: totalBoxes || 1,
        customerName,
        customerCity,
        region,
        items: items || [],
        deliveryDate: new Date().toLocaleDateString('he-IL')
      };

      // Generate EZPL code
      const ezplCode = format === 'compact' 
        ? this.boxLabelEZPLService.generateCompactBoxLabelEZPL(ezplData)
        : this.boxLabelEZPLService.generateBoxLabelEZPL(ezplData);

      // Return EZPL code
      res.status(200).json({
        success: true,
        ezpl: ezplCode,
        format,
        message: `EZPL code generated for box ${boxNumber}/${totalBoxes}`
      });

    } catch (error) {
      this.logger.error('Failed to generate EZPL for box label', error as Error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate EZPL'
      });
    }
  }

  /**
   * Print box labels using EZPL (direct printer commands)
   * POST /api/print/box-labels-ezpl
   */
  async printBoxLabelsEZPL(req: Request, res: Response): Promise<void> {
    // Capture all console logs for frontend forwarding
    const debugLogs: any[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Override console methods to capture logs
    console.log = (...args: any[]) => {
      debugLogs.push({ level: 'info', message: args.join(' '), timestamp: new Date().toISOString() });
      originalConsoleLog(...args);
    };
    console.error = (...args: any[]) => {
      debugLogs.push({ level: 'error', message: args.join(' '), timestamp: new Date().toISOString() });
      originalConsoleError(...args);
    };
    console.warn = (...args: any[]) => {
      debugLogs.push({ level: 'warn', message: args.join(' '), timestamp: new Date().toISOString() });
      originalConsoleWarn(...args);
    };

    console.log('🚀 [BACKEND BOX LABELS EZPL] Получен запрос на печать этикеток коробок');
    console.log('📋 [BACKEND BOX LABELS EZPL] Request details:', {
      method: req.method,
      url: req.url,
      body: req.body
    });

    try {
      const { 
        orderId, 
        boxes, 
        customerName, 
        customerCity,
        region,
        format = 'standard'
      }: {
        orderId: string | number;
        boxes: PackingBox[];
        customerName: string;
        customerCity?: string;
        region?: string;
        format?: 'standard' | 'compact';
      } = req.body;

      // Validation
      if (!orderId || !boxes || !Array.isArray(boxes) || boxes.length === 0) {
        console.error('❌ [BACKEND BOX LABELS EZPL] Missing required parameters');
        
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        
        res.status(400).json({
          success: false,
          error: 'Order ID and boxes array are required',
          logs: debugLogs,
          debug: {
            totalLogs: debugLogs.length,
            timestamp: new Date().toISOString(),
            validationError: 'Missing required parameters'
          }
        });
        return;
      }

      if (!customerName) {
        console.error('❌ [BACKEND BOX LABELS EZPL] Customer name required');
        
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        
        res.status(400).json({
          success: false,
          error: 'Customer name is required',
          logs: debugLogs,
          debug: {
            totalLogs: debugLogs.length,
            timestamp: new Date().toISOString(),
            validationError: 'Customer name required'
          }
        });
        return;
      }

      console.log(`🏷️ Printing ${boxes.length} box labels using EZPL for order ${orderId}`);

      const printResults: any[] = [];
      const ezplCommands: string[] = [];

      // Generate EZPL for each box
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        try {
          // Prepare data for EZPL generation
          const ezplData: BoxLabelEZPLData = {
            orderId,
            boxNumber: i + 1,  // Use index for correct numbering
            totalBoxes: boxes.length,
            customerName,
            customerCity,
            region,
            items: box.items.map(item => ({
              name: item.name,
              nameHebrew: item.nameHebrew,
              nameRussian: item.nameRussian,
              quantity: item.quantity,
              barcode: item.barcode,
              catalogNumber: item.catalogNumber
            })),
            deliveryDate: new Date().toLocaleDateString('he-IL')
          };

          // Generate EZPL code
          const ezplCode = format === 'compact' 
            ? this.boxLabelEZPLService.generateCompactBoxLabelEZPL(ezplData)
            : this.boxLabelEZPLService.generateBoxLabelEZPL(ezplData);

          ezplCommands.push(ezplCode);

          // Just collect EZPL for now - we'll send as batch later
          printResults.push({
            boxNumber: i + 1,
            success: true, // Will be updated after batch send
            ezplLength: ezplCode.length
          });

          console.log(`✅ Box ${i + 1}/${boxes.length} EZPL generated (${ezplCode.length} chars)`);

          // Mark box as printed
          box.isPrinted = true;
          box.printedAt = new Date().toISOString();

        } catch (error) {
          console.error(`❌ Failed to print EZPL label for box ${i + 1}:`, error);
          printResults.push({
            boxNumber: i + 1,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 🚨 CRITICAL: Send all labels in one batch to prevent printer calibration issues
      if (this.printerService && this.printerService.isConnected && ezplCommands.length > 0) {
        try {
          console.log(`🔧 PRINTER FIX: Sending ${ezplCommands.length} labels as single batch to prevent calibration issues`);
          
          // Combine all EZPL commands with minimal spacing (just newlines)
          const batchEZPL = ezplCommands.join('\n');
          
          console.log(`📤 Sending batch EZPL (${batchEZPL.length} chars total) to printer...`);
          
          // Send all labels in one network command to avoid multiple TCP connections
          await this.printerService.sendRawCommand(batchEZPL);
          
          console.log(`✅ SUCCESS: All ${ezplCommands.length} labels sent in single batch - no calibration disruption`);
          
          // All successful since batch succeeded
          printResults.forEach(result => {
            if (result.success !== false) {
              result.success = true;
            }
          });
          
        } catch (error) {
          console.error(`❌ BATCH PRINT FAILED:`, error);
          console.error(`This will cause printer calibration issues!`);
          
          // Mark all as failed since batch failed
          printResults.forEach(result => {
            result.success = false;
            result.error = `Batch print failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          });
        }
      } else if (!this.printerService?.isConnected) {
        console.warn(`⚠️ Printer not connected - EZPL generated but not sent`);
        printResults.forEach(result => {
          result.success = false;
          result.error = 'Printer not connected - EZPL generated but not sent';
        });
      } else if (ezplCommands.length === 0) {
        console.warn(`⚠️ No EZPL commands generated`);
      }

      // Calculate results
      const successCount = printResults.filter(r => r.success).length;
      const failedCount = printResults.filter(r => !r.success).length;

      // Restore original console methods before sending response
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      res.status(200).json({
        success: successCount > 0,
        message: `Printed ${successCount} of ${boxes.length} box labels using EZPL`,
        results: printResults,
        ezplCommands: ezplCommands,  // Return EZPL for debugging
        stats: {
          total: boxes.length,
          successful: successCount,
          failed: failedCount
        },
        // Forward comprehensive debug logs to frontend
        logs: debugLogs,
        debug: {
          totalLogs: debugLogs.length,
          timestamp: new Date().toISOString(),
          orderId,
          boxCount: boxes.length,
          ezplCommandsGenerated: ezplCommands.length
        }
      });

    } catch (error) {
      console.error('❌ Error printing box labels with EZPL:', error);
      
      // Restore original console methods before sending response
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to print box labels',
        // Include debug logs on critical error
        logs: debugLogs,
        debug: {
          totalLogs: debugLogs.length,
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : 'UnknownError',
          orderId: req.body?.orderId || 'unknown',
          errorDetails: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error)
        }
      });
    }
  }

  /**
   * Generate HTML visualization of box label EZPL
   * POST /api/print/box-label-html
   */
  async generateBoxLabelHTML(req: Request, res: Response): Promise<void> {
    try {
      const { 
        orderId, 
        boxNumber = 1, 
        totalBoxes = 1, 
        customerCompany,
        customerName, 
        customerCity, 
        items = [],
        region,
        deliveryDate,
        format = 'single' // 'single' or 'multiple'
      } = req.body;

      // Validate required fields
      if (!orderId || !customerName) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: orderId and customerName'
        });
        return;
      }

      // Prepare data for EZPL service
      const ezplData: BoxLabelEZPLData = {
        orderId,
        boxNumber,
        totalBoxes,
        customerCompany,
        customerName,
        customerCity,
        region,
        deliveryDate,
        items: items.map((item: any) => ({
          name: item.name || item.itemName || 'Unknown Item',
          nameHebrew: item.nameHebrew || item.name,
          nameRussian: item.nameRussian,
          quantity: item.quantity || 1,
          barcode: item.barcode,
          catalogNumber: item.catalogNumber || item.barcode
        }))
      };

      // Generate HTML visualization
      const html = this.boxLabelEZPLService.generateBoxLabelHTML(ezplData);

      // Return HTML as JSON for easier handling in frontend
      res.status(200).json({
        success: true,
        html: html
      });

    } catch (error) {
      console.error('❌ Failed to generate box label HTML:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate box label HTML',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate HTML visualization for multiple box labels
   * POST /api/print/box-labels-html
   */
  async generateMultipleBoxLabelsHTML(req: Request, res: Response): Promise<void> {
    try {
      const { 
        orderId, 
        boxes = [], 
        customerCompany,
        customerName, 
        customerCity, 
        region,
        deliveryDate
      } = req.body;

      // Validate required fields
      if (!orderId || !customerName || !boxes.length) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: orderId, customerName, and boxes'
        });
        return;
      }

      // Prepare data for each box
      const labelsData: BoxLabelEZPLData[] = boxes.map((box: any, index: number) => ({
        orderId,
        boxNumber: box.boxNumber || index + 1,
        totalBoxes: boxes.length,
        customerCompany,
        customerName,
        customerCity,
        region,
        deliveryDate,
        items: (box.items || []).map((item: any) => ({
          name: item.name || item.itemName || 'Unknown Item',
          nameHebrew: item.nameHebrew || item.name,
          nameRussian: item.nameRussian,
          quantity: item.quantity || 1,
          barcode: item.barcode,
          catalogNumber: item.catalogNumber || item.barcode
        }))
      }));

      // Generate HTML visualization for all labels
      const html = this.boxLabelEZPLService.generateMultipleBoxLabelsHTML(labelsData);

      // Return HTML as JSON for easier handling in frontend
      res.status(200).json({
        success: true,
        html: html
      });

    } catch (error) {
      console.error('❌ Failed to generate multiple box labels HTML:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate multiple box labels HTML',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Helper method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}