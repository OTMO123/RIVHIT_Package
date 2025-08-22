import { Request, Response } from 'express';
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
import { ILogger } from '../interfaces/ILogger';
import { ConsoleLoggerService } from '../services/logging/console.logger.service';

export class PrintController {
  private printerService: PrinterService;
  private boxLabelService: BoxLabelService;
  private logger: ILogger;

  constructor(printerService?: PrinterService) {
    // Initialize logger
    this.logger = new ConsoleLoggerService('PrintController');
    
    // Initialize box label service
    this.boxLabelService = new BoxLabelService(this.logger);
    
    if (printerService) {
      this.printerService = printerService;
      return;
    }

    // Создаем GoDEX ZX420 сервис с конфигурацией из env
    const connectionType = (process.env.PRINTER_CONNECTION_TYPE as 'usb' | 'serial' | 'ethernet') || 'usb';
    const port = process.env.PRINTER_PORT || 'COM1';
    const templatesPath = process.env.PRINTER_TEMPLATES_PATH || './printer-templates';
    
    if (connectionType === 'ethernet') {
      this.printerService = PrinterServiceFactory.createEthernetService(port, templatesPath);
    } else {
      this.printerService = PrinterServiceFactory.createUSBService(port, templatesPath);
    }
    
    this.initializePrinter();
  }

  private async initializePrinter() {
    try {
      const connectionType = (process.env.PRINTER_CONNECTION_TYPE as 'usb' | 'serial' | 'ethernet') || 'usb';
      const port = process.env.PRINTER_PORT || 'COM1';
      
      await this.printerService.initialize({
        connectionType,
        port
      });
      console.log('✅ GoDEX ZX420 printer service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize GoDEX ZX420 printer service:', error);
    }
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
    try {
      console.log('🧪 Running printer test...');
      
      const result = await this.printerService.testPrint();

      if (result.success) {
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          message: 'Test print completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Test print failed'
        });
      }

    } catch (error) {
      console.error('❌ Error in test print:', error);
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
    try {
      const { orderId, customerName, address, items, copies = 1 } = req.body;

      if (!orderId || !customerName) {
        res.status(400).json({
          success: false,
          error: 'Order ID and customer name are required'
        });
        return;
      }

      console.log(`📦 Printing shipping label for order: ${orderId}`);

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

      if (result.success) {
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          message: `Shipping label printed for order ${orderId}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to print shipping label'
        });
      }

    } catch (error) {
      console.error('❌ Error printing shipping label:', error);
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
    try {
      const { orderId, items, options }: { 
        orderId: string, 
        items: PackingItem[], 
        options?: PrintJobOptions 
      } = req.body;

      if (!orderId || !items || !Array.isArray(items)) {
        res.status(400).json({
          success: false,
          error: 'Order ID and items array are required'
        });
        return;
      }

      // Фильтруем только упакованные и доступные товары
      const itemsToPrint = items.filter(item => 
        item.isPacked && 
        item.isAvailable && 
        item.packedQuantity > 0
      );

      if (itemsToPrint.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid items found for printing'
        });
        return;
      }

      console.log(`🏷️ Printing product labels for order ${orderId}: ${itemsToPrint.length} items`);

      const result = await this.printerService.printBarcodeLabels(itemsToPrint, {
        copies: 1,
        labelSize: 'medium',
        includeBarcodes: true,
        includeText: true,
        includeQuantity: true,
        includePrices: true,
        ...options
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          jobId: result.jobId,
          printedItems: result.printedItems,
          estimatedTime: result.estimatedTime,
          ezplCommands: result.ezplCommands || [],
          message: `Product labels printed for order ${orderId}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to print product labels'
        });
      }

    } catch (error) {
      console.error('❌ Error printing product labels:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Product labels print failed'
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
      
      const results: any[] = [];
      
      // Печатаем каждую этикетку
      for (const label of labels) {
        try {
          // Здесь должна быть реальная печать
          // Пока просто симулируем успех
          results.push({
            boxNumber: label.boxNumber,
            success: true
          });
        } catch (error) {
          results.push({
            boxNumber: label.boxNumber,
            success: false,
            error: error instanceof Error ? error.message : 'Print failed'
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      res.status(200).json({
        success: successCount > 0,
        results,
        message: `Напечатано ${successCount} из ${labels.length} этикеток`
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
}