// import * as ffi from 'ffi-napi';
// import * as ref from 'ref-napi';
let ffi: any;
let ref: any;
try {
  ffi = require('ffi-napi');
  ref = require('ref-napi');
} catch (e) {
  // Optional dependencies
}
import * as path from 'path';
import { IGodexPrinter } from '../interfaces/IGodexPrinter';
import { 
  LabelData, 
  PrintResult, 
  PrinterStatus,
  PrintMethod 
} from '../types/golabel.types';
import { IApplicationLogger } from '../../../interfaces/ILogger';
import { ConsoleLoggerService } from '../../logging/console.logger.service';

/**
 * GoLabel SDK Service - Direct integration with Godex SDK
 * Uses EZio32.dll and QLabelSDK.DLL for native printer control
 */
export class GoLabelSdkService implements IGodexPrinter {
  private logger: IApplicationLogger;
  private ezio: any;
  private qlabel: any;
  private isInitialized: boolean = false;
  private printerHandle: number = -1;
  private currentPort: string = 'USB';
  
  // EZio32.dll function types
  private readonly EZioTypes = {
    openport: ['int', ['string']],
    closeport: ['int', []],
    sendcommand: ['int', ['string']],
    RcvBuf: ['int', ['pointer', 'int']],
    putcommand: ['int', ['string']],
    ecTextOut: ['int', ['int', 'int', 'int', 'int', 'int', 'string']],
    ecTextOutFine: ['int', ['int', 'int', 'int', 'int', 'int', 'int', 'int', 'string', 'int']],
    Bar: ['int', ['char', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'string']],
    InternalFont: ['int', ['int', 'int', 'int']],
    DownloadFont: ['int', ['string', 'string']],
    setup: ['int', ['int', 'int', 'int', 'int', 'int']],
    LabelEnd: ['int', []],
    PortStatus: ['int', []],
    GetDllVersion: ['string', []]
  };
  
  constructor(logger?: IApplicationLogger) {
    this.logger = logger || new ConsoleLoggerService('GoLabelSdkService');
  }
  
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing GoLabel SDK service...');
      
      // Load DLLs
      const dllPath = process.env.GODEX_SDK_PATH || 
        'C:\\Program Files (x86)\\Godex\\SDK';
      
      const ezioPath = path.join(dllPath, 'EZio32.dll');
      const qlabelPath = path.join(dllPath, 'QLabelSDK.DLL');
      
      try {
        // Load EZio32.dll
        this.ezio = ffi.Library(ezioPath, this.EZioTypes);
        this.logger.info('EZio32.dll loaded successfully');
        
        // Try to load QLabelSDK if available
        try {
          this.qlabel = ffi.Library(qlabelPath, {
            OpenPrinter: ['int', ['string']],
            ClosePrinter: ['int', ['int']],
            SetLabelSize: ['int', ['int', 'int', 'int']],
            PrintLabel: ['int', ['int', 'int']],
            SendCommand: ['int', ['int', 'string']]
          });
          this.logger.info('QLabelSDK.DLL loaded successfully');
        } catch (error) {
          this.logger.warn('QLabelSDK.DLL not available, using EZio32 only');
        }
        
        // Get DLL version
        const version = this.ezio.GetDllVersion();
        this.logger.info(`EZio32 DLL Version: ${version}`);
        
        // Try to open USB port
        const portResult = await this.openPort();
        if (!portResult) {
          this.logger.warn('Failed to open USB port, SDK initialized but not connected');
        }
        
        this.isInitialized = true;
        return true;
        
      } catch (error) {
        this.logger.error('Failed to load SDK DLLs:', error as Error);
        this.logger.info(`Make sure Godex SDK is installed at: ${dllPath}`);
        return false;
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize GoLabel SDK:', error as Error);
      return false;
    }
  }
  
  private async openPort(port: string = 'USB'): Promise<boolean> {
    try {
      // Close existing connection
      if (this.printerHandle !== -1) {
        this.ezio.closeport();
        this.printerHandle = -1;
      }
      
      // Open new connection
      const result = this.ezio.openport(port);
      if (result === 0) {
        this.logger.info(`Successfully opened port: ${port}`);
        this.printerHandle = 0;
        this.currentPort = port;
        return true;
      } else {
        this.logger.error(`Failed to open port ${port}, error code: ${result}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Error opening port:', error as Error);
      return false;
    }
  }
  
  async print(data: LabelData | string): Promise<PrintResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('GoLabel SDK service not initialized');
      }
      
      // Ensure port is open
      if (this.printerHandle === -1) {
        const opened = await this.openPort();
        if (!opened) {
          throw new Error('Failed to open printer port');
        }
      }
      
      let result: boolean;
      
      if (typeof data === 'string') {
        // Send raw commands
        result = await this.sendRawCommands(data);
      } else {
        // Convert LabelData to commands and send
        result = await this.printLabelData(data);
      }
      
      return {
        success: result,
        message: result ? 'Label printed successfully' : 'Print failed',
        method: PrintMethod.SDK,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error('SDK print error:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        method: PrintMethod.SDK,
        duration: Date.now() - startTime
      };
    }
  }
  
  private async sendRawCommands(commands: string): Promise<boolean> {
    try {
      // Split commands by line
      const lines = commands.split(/\r?\n/);
      
      for (const line of lines) {
        if (line.trim()) {
          const result = this.ezio.sendcommand(line);
          if (result !== 0) {
            this.logger.error(`Failed to send command: ${line}`);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error sending raw commands:', error as Error);
      return false;
    }
  }
  
  private async printLabelData(data: LabelData): Promise<boolean> {
    try {
      // Setup label
      const widthDots = Math.round(data.size.width * 8); // 8 dots/mm at 203 DPI
      const heightDots = Math.round(data.size.height * 8);
      const speed = data.printerSettings?.speed || 4;
      const darkness = data.printerSettings?.darkness || 10;
      
      // Initialize label
      this.ezio.setup(widthDots, heightDots, speed, darkness, 0);
      
      // Process elements
      for (const element of data.elements) {
        switch (element.type) {
          case 'text':
            await this.addText(element);
            break;
            
          case 'barcode':
            await this.addBarcode(element);
            break;
            
          case 'rectangle':
            await this.addRectangle(element);
            break;
            
          case 'line':
            await this.addLine(element);
            break;
            
          default:
            this.logger.warn(`Unsupported element type: ${element.type}`);
        }
      }
      
      // End label and print
      this.ezio.LabelEnd();
      
      return true;
    } catch (error) {
      this.logger.error('Error printing label data:', error as Error);
      return false;
    }
  }
  
  private async addText(element: any): Promise<void> {
    const x = Math.round(element.position.x * 8); // Convert mm to dots
    const y = Math.round(element.position.y * 8);
    const rotation = element.properties.rotation || 0;
    const fontType = this.mapFontType(element.properties.font);
    const multiplier = Math.round((element.properties.size || 12) / 12);
    
    this.ezio.ecTextOut(
      x,
      y,
      fontType,
      rotation,
      multiplier,
      element.properties.text
    );
  }
  
  private async addBarcode(element: any): Promise<void> {
    const x = Math.round(element.position.x * 8);
    const y = Math.round(element.position.y * 8);
    const height = Math.round((element.properties.height || 50) * 8);
    const rotation = element.properties.rotation || 0;
    const barcodeType = this.mapBarcodeType(element.properties.barcodeType);
    
    this.ezio.Bar(
      barcodeType,
      x,
      y,
      3, // narrow width
      6, // wide width
      height,
      rotation,
      element.properties.showText !== false ? 1 : 0,
      element.properties.data
    );
  }
  
  private async addRectangle(element: any): Promise<void> {
    // Draw rectangle using lines
    const x1 = Math.round(element.position.x * 8);
    const y1 = Math.round(element.position.y * 8);
    const x2 = x1 + Math.round(element.properties.width * 8);
    const y2 = y1 + Math.round(element.properties.height * 8);
    const thickness = element.properties.lineWidth || 1;
    
    // Top line
    this.ezio.sendcommand(`L,${x1},${y1},${x2},${y1},${thickness}`);
    // Right line
    this.ezio.sendcommand(`L,${x2},${y1},${x2},${y2},${thickness}`);
    // Bottom line
    this.ezio.sendcommand(`L,${x2},${y2},${x1},${y2},${thickness}`);
    // Left line
    this.ezio.sendcommand(`L,${x1},${y2},${x1},${y1},${thickness}`);
  }
  
  private async addLine(element: any): Promise<void> {
    const x1 = Math.round(element.position.x * 8);
    const y1 = Math.round(element.position.y * 8);
    const x2 = Math.round(element.properties.endX * 8);
    const y2 = Math.round(element.properties.endY * 8);
    const thickness = element.properties.width || 1;
    
    this.ezio.sendcommand(`L,${x1},${y1},${x2},${y2},${thickness}`);
  }
  
  private mapFontType(font?: string): number {
    // Map font names to EZio font codes
    const fontMap: Record<string, number> = {
      'Arial': 1,
      'Times': 2,
      'Courier': 3,
      'System': 0
    };
    
    return fontMap[font || 'System'] || 0;
  }
  
  private mapBarcodeType(type?: string): string {
    // Map barcode types to EZio codes
    const typeMap: Record<string, string> = {
      'Code128': '1',
      'Code39': '3',
      'EAN13': 'E',
      'EAN8': 'E8',
      'UPC-A': 'U',
      'QRCode': 'Q',
      'DataMatrix': 'D',
      'PDF417': 'P'
    };
    
    return typeMap[type || 'Code128'] || '1';
  }
  
  async getStatus(): Promise<PrinterStatus> {
    if (!this.isInitialized || this.printerHandle === -1) {
      return {
        connected: false,
        ready: false,
        status: 'Not connected',
        method: PrintMethod.SDK
      };
    }
    
    try {
      // Check port status
      const status = this.ezio.PortStatus();
      
      if (status === 0) {
        return {
          connected: true,
          ready: true,
          status: 'Ready',
          method: PrintMethod.SDK
        };
      } else {
        // Try to interpret status codes
        let statusText = 'Unknown status';
        switch (status) {
          case 1:
            statusText = 'Busy';
            break;
          case 2:
            statusText = 'Paper out';
            break;
          case 3:
            statusText = 'Ribbon out';
            break;
          case 4:
            statusText = 'Cover open';
            break;
          default:
            statusText = `Error code: ${status}`;
        }
        
        return {
          connected: true,
          ready: false,
          status: statusText,
          method: PrintMethod.SDK
        };
      }
    } catch (error) {
      this.logger.error('Error getting status:', error as Error);
      return {
        connected: false,
        ready: false,
        status: 'Connection error',
        method: PrintMethod.SDK
      };
    }
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      // Try to get status
      const status = this.ezio.PortStatus();
      return status >= 0;
    } catch {
      return false;
    }
  }
  
  getCurrentMethod(): string {
    return PrintMethod.SDK;
  }
  
  async dispose(): Promise<void> {
    try {
      if (this.printerHandle !== -1) {
        this.ezio.closeport();
        this.printerHandle = -1;
      }
    } catch (error) {
      this.logger.error('Error during dispose:', error as Error);
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return this.isInitialized && this.printerHandle !== -1;
  }
}