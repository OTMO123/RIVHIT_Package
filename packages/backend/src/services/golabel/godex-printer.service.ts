import { IGodexPrinter } from './interfaces/IGodexPrinter';
import { ILabelGenerator } from './interfaces/ILabelGenerator';
import { 
  LabelData, 
  PrintResult, 
  PrinterStatus, 
  PrintMethod,
  PrintMethodConfig 
} from './types/golabel.types';
import { GoLabelCliService } from './cli/golabel-cli.service';
import { EzpxGeneratorService } from './generators/ezpx-generator.service';
import { IApplicationLogger } from '../../interfaces/ILogger';
import { ConsoleLoggerService } from '../logging/console.logger.service';
import { IPrinterService } from '../../interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';
import { BoxLabelEZPLData } from '../box-label-ezpl.service';

/**
 * Unified Godex Printer Service
 * Automatically selects the best available printing method
 */
export class GodexPrinterService implements IPrinterService {
  private logger: IApplicationLogger;
  private methods: PrintMethodConfig[] = [];
  private currentMethod?: PrintMethodConfig;
  private goLabelCli: GoLabelCliService;
  private ezpxGenerator: EzpxGeneratorService;
  private isInitialized: boolean = false;
  
  // Keep compatibility with IPrinterService
  private _isConnected: boolean = false;
  
  constructor(logger?: IApplicationLogger) {
    this.logger = logger || new ConsoleLoggerService('GodexPrinterService');
    
    // Initialize services
    this.goLabelCli = new GoLabelCliService(this.logger);
    this.ezpxGenerator = new EzpxGeneratorService(this.logger);
    
    // Setup print methods
    this.initializeMethods();
  }
  
  private initializeMethods(): void {
    // Priority 1: GoLabel CLI
    if (process.env.USE_GOLABEL !== 'false') {
      this.methods.push({
        name: PrintMethod.GOLABEL_CLI,
        priority: 1,
        enabled: true,
        isAvailable: async () => {
          return await this.goLabelCli.isAvailable();
        },
        print: async (data) => {
          if (typeof data === 'string') {
            // If it's raw EZPL, save to temp file
            return await this.goLabelCli.print(data);
          } else {
            // Convert LabelData to EZPX and print
            return await this.goLabelCli.print(data);
          }
        }
      });
    }
    
    // Priority 2: Direct USB fallback (using existing logic)
    this.methods.push({
      name: PrintMethod.DIRECT_USB,
      priority: 3,
      enabled: true,
      isAvailable: async () => true,
      print: async (data) => {
        return await this.directUSBPrint(data);
      }
    });
    
    // Sort by priority
    this.methods.sort((a, b) => a.priority - b.priority);
  }
  
  async initialize(options?: any): Promise<boolean> {
    this.logger.info('Initializing Godex Printer Service...');
    
    try {
      // Initialize each method
      for (const method of this.methods) {
        if (method.enabled) {
          this.logger.info(`Checking ${method.name} availability...`);
          
          if (method.name === PrintMethod.GOLABEL_CLI) {
            await this.goLabelCli.initialize();
          }
          
          const available = await method.isAvailable();
          this.logger.info(`${method.name}: ${available ? 'Available' : 'Not available'}`);
          
          if (available && !this.currentMethod) {
            this.currentMethod = method;
            this._isConnected = true;
          }
        }
      }
      
      if (!this.currentMethod) {
        this.logger.warn('No printing methods available, using fallback');
        this.currentMethod = this.methods[this.methods.length - 1];
      }
      
      this.logger.info(`Selected printing method: ${this.currentMethod.name}`);
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Godex Printer Service:', error as Error);
      return false;
    }
  }
  
  async print(data: LabelData | string): Promise<PrintResult> {
    if (!this.isInitialized) {
      throw new Error('Printer service not initialized');
    }
    
    const startTime = Date.now();
    
    // Try each method in priority order
    for (const method of this.methods) {
      if (!method.enabled) continue;
      
      try {
        const available = await method.isAvailable();
        if (!available) continue;
        
        this.logger.info(`Attempting to print using ${method.name}`);
        this.currentMethod = method;
        
        const result = await method.print(data);
        
        if (result.success) {
          this.logger.info(`Print successful using ${method.name}`);
          return {
            ...result,
            method: method.name,
            duration: Date.now() - startTime
          };
        } else {
          this.logger.warn(`Print failed with ${method.name}: ${result.error}`);
        }
      } catch (error) {
        this.logger.error(`${method.name} error:`, error as Error);
      }
    }
    
    // All methods failed
    return {
      success: false,
      error: 'All printing methods failed',
      method: 'None',
      duration: Date.now() - startTime
    };
  }
  
  private async directUSBPrint(data: LabelData | string): Promise<PrintResult> {
    const { exec } = require('child_process');
    const fs = require('fs').promises;
    const os = require('os');
    const path = require('path');
    
    try {
      let content: string;
      
      if (typeof data === 'string') {
        content = data;
      } else {
        // Convert LabelData to EZPL commands
        content = this.convertLabelDataToEZPL(data);
      }
      
      // Write to temp file
      const tempFile = path.join(os.tmpdir(), `godex_${Date.now()}.prn`);
      await fs.writeFile(tempFile, content, 'utf8');
      
      // Send to USB port
      return new Promise((resolve) => {
        const portName = process.env.PRINTER_PORT || 'USB002';
        exec(`copy /B "${tempFile}" "${portName}"`, async (error: any) => {
          // Clean up
          try {
            await fs.unlink(tempFile);
          } catch (e) {
            // Ignore
          }
          
          if (error) {
            this.logger.error('Direct USB print failed:', error);
            resolve({
              success: false,
              error: error.message,
              method: PrintMethod.DIRECT_USB
            });
          } else {
            this.logger.info('Direct USB print successful');
            resolve({
              success: true,
              message: 'Label sent via direct USB',
              method: PrintMethod.DIRECT_USB
            });
          }
        });
      });
    } catch (error) {
      this.logger.error('Direct USB error:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        method: PrintMethod.DIRECT_USB
      };
    }
  }
  
  private convertLabelDataToEZPL(data: LabelData): string {
    const commands: string[] = [];
    
    // Initialize label
    commands.push('^L');
    
    // Add elements
    for (const element of data.elements) {
      switch (element.type) {
        case 'text':
          commands.push(
            `A,${element.position.x},${element.position.y},` +
            `0,${element.properties.size || 4},1,1,N,` +
            `"${element.properties.text}"`
          );
          break;
          
        case 'barcode':
          commands.push(
            `B,${element.position.x},${element.position.y},` +
            `0,1,2,${element.properties.height || 100},` +
            `B,"${element.properties.data}"`
          );
          break;
          
        case 'rectangle':
          commands.push(
            `R,${element.position.x},${element.position.y},` +
            `${element.position.x + element.properties.width},` +
            `${element.position.y + element.properties.height},` +
            `${element.properties.lineWidth || 2}`
          );
          break;
          
        case 'line':
          commands.push(
            `L,${element.position.x},${element.position.y},` +
            `${element.properties.endX},${element.properties.endY},` +
            `${element.properties.width || 1}`
          );
          break;
      }
    }
    
    // End label
    commands.push('E');
    
    return commands.join('\r\n');
  }
  
  async getStatus(): Promise<{
    connected: boolean;
    model: string;
    paperLevel: number;
    ribbonLevel: number;
    temperature: number;
    isReady: boolean;
    lastError?: string;
  }> {
    if (!this.isInitialized) {
      return {
        connected: false,
        model: 'GoDEX',
        paperLevel: 0,
        ribbonLevel: 0,
        temperature: 0,
        isReady: false,
        lastError: 'Not initialized'
      };
    }
    
    if (this.currentMethod?.name === PrintMethod.GOLABEL_CLI) {
      const status = await this.goLabelCli.getStatus();
      return {
        connected: status.connected,
        model: 'GoDEX',
        paperLevel: 100,
        ribbonLevel: 100,
        temperature: 25,
        isReady: status.ready,
        lastError: status.error
      };
    }
    
    return {
      connected: this._isConnected,
      model: 'GoDEX',
      paperLevel: 100,
      ribbonLevel: 100,
      temperature: 25,
      isReady: this._isConnected,
      lastError: this._isConnected ? undefined : 'Disconnected'
    };
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.currentMethod) return false;
    return await this.currentMethod.isAvailable();
  }
  
  getCurrentMethod(): string {
    return this.currentMethod?.name || 'None';
  }
  
  async dispose(): Promise<void> {
    await this.goLabelCli.dispose();
  }
  
  async isAvailable(): Promise<boolean> {
    return this.isInitialized && !!this.currentMethod;
  }
  
  // IPrinterService compatibility methods
  
  async printLabels(
    items: PackingItem[], 
    options?: any
  ): Promise<{ success: boolean; error?: string; printedItems: number }> {
    let printedCount = 0;
    
    for (const item of items) {
      const labelData = this.convertPackingItemToLabelData(item);
      const result = await this.print(labelData);
      
      if (result.success) {
        printedCount++;
      } else {
        return {
          success: false,
          error: result.error,
          printedItems: printedCount
        };
      }
    }
    
    return {
      success: true,
      printedItems: printedCount
    };
  }
  
  private convertPackingItemToLabelData(item: PackingItem): LabelData {
    return {
      size: { width: 80, height: 50 },
      elements: [
        {
          type: 'text',
          position: { x: 10, y: 10 },
          properties: {
            text: item.item_name,
            size: 24
          }
        },
        {
          type: 'barcode',
          position: { x: 10, y: 30 },
          properties: {
            data: item.barcode || '',
            barcodeType: 'Code128',
            height: 50
          }
        }
      ]
    };
  }
  
  async printBarcodeLabels(items: PackingItem[], options?: any): Promise<any> {
    return this.printLabels(items, { ...options, includeBarcodes: true });
  }
  
  async printSingleLabel(item: PackingItem, options?: any): Promise<any> {
    return this.printLabels([item], options);
  }
  
  async configure(config: any): Promise<boolean> {
    // Configuration handled through environment variables
    return true;
  }
  
  async sendRawCommand(command: string): Promise<boolean> {
    const result = await this.print(command);
    return result.success;
  }
  
  async getConnectionInfo(): Promise<any> {
    const status = await this.getStatus();
    return {
      connected: status.connected,
      method: this.getCurrentMethod(),
      ready: status.isReady
    };
  }
  
  get isConnected(): boolean {
    return this._isConnected;
  }
  
  async testPrint(): Promise<any> {
    const testLabel: LabelData = {
      size: { width: 80, height: 50 },
      elements: [
        {
          type: 'text',
          position: { x: 10, y: 10 },
          properties: {
            text: 'GoLabel Integration Test',
            size: 24
          }
        },
        {
          type: 'text',
          position: { x: 10, y: 30 },
          properties: {
            text: `Method: ${this.getCurrentMethod()}`,
            size: 16
          }
        },
        {
          type: 'barcode',
          position: { x: 10, y: 50 },
          properties: {
            data: '123456789',
            barcodeType: 'Code128',
            height: 40
          }
        }
      ]
    };
    
    return this.print(testLabel);
  }
  
  // Box label specific methods
  async printBoxLabel(data: BoxLabelEZPLData): Promise<PrintResult> {
    // Convert box label data to LabelData format
    const labelData = this.convertBoxLabelToLabelData(data);
    return this.print(labelData);
  }
  
  private convertBoxLabelToLabelData(data: BoxLabelEZPLData): LabelData {
    const elements: any[] = [];
    
    // Order number
    elements.push({
      type: 'text',
      position: { x: 50, y: 20 },
      properties: {
        text: `Order: ${data.orderId}`,
        size: 32,
        bold: true
      }
    });
    
    // Box indicator
    elements.push({
      type: 'text',
      position: { x: 200, y: 20 },
      properties: {
        text: `Box ${data.boxNumber}/${data.totalBoxes}`,
        size: 24
      }
    });
    
    // Customer info
    elements.push({
      type: 'text',
      position: { x: 50, y: 50 },
      properties: {
        text: data.customerName,
        size: 18
      }
    });
    
    // Items
    let yPos = 80;
    for (const item of data.items.slice(0, 4)) {
      elements.push({
        type: 'text',
        position: { x: 50, y: yPos },
        properties: {
          text: `${item.quantity}x ${item.name}`,
          size: 14
        }
      });
      
      if (item.barcode) {
        elements.push({
          type: 'barcode',
          position: { x: 250, y: yPos - 10 },
          properties: {
            data: item.barcode,
            barcodeType: 'Code128',
            height: 30
          }
        });
      }
      
      yPos += 40;
    }
    
    return {
      size: { width: 100, height: 100 }, // 10cm x 10cm
      elements
    };
  }
}