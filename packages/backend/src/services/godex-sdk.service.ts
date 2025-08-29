import { ILogger } from '../interfaces/ILogger';
import { ConsoleLoggerService } from './logging/console.logger.service';
import * as path from 'path';
import * as ffi from 'ffi-napi';
import * as ref from 'ref-napi';

/**
 * Service for direct communication with Godex printers using their SDK
 */
export class GodexSDKService {
  private logger: ILogger;
  private ezioLib: any;
  private qlabelLib: any;
  private isInitialized: boolean = false;
  
  // SDK paths
  private readonly EZIO_DLL_PATH = 'C:\\Program Files (x86)\\Godex\\GoLabel\\EZio32.dll';
  private readonly QLABEL_DLL_PATH = 'C:\\Program Files (x86)\\Godex\\GoLabel\\QLabelSDK.DLL';
  
  constructor(logger?: ILogger) {
    this.logger = logger || new ConsoleLoggerService('GodexSDKService');
  }
  
  /**
   * Initialize the Godex SDK
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing Godex SDK...');
      
      // Check if DLLs exist
      const fs = require('fs');
      if (!fs.existsSync(this.EZIO_DLL_PATH)) {
        this.logger.error('EZio32.dll not found at:', this.EZIO_DLL_PATH);
        return false;
      }
      
      // Load EZio32.dll using ffi-napi
      try {
        this.ezioLib = ffi.Library(this.EZIO_DLL_PATH, {
          // Basic functions from EZio32.dll
          'OpenUSB': ['int', ['string']],
          'OpenDriver': ['int', ['string']],
          'OpenNet': ['int', ['string', 'int']],
          'ClosePort': ['void', []],
          'SendCommand': ['int', ['string']],
          'RcvBuf': ['int', ['char*', 'int']],
          'GetDllVersion': ['string', []],
          'FindFirstUSB': ['string', ['char*']],
          'FindNextUSB': ['string', ['char*']]
        });
        
        this.logger.info('EZio32.dll loaded successfully');
        
        // Get DLL version
        const version = this.ezioLib.GetDllVersion();
        this.logger.info('EZio32 DLL Version:', version);
        
      } catch (error) {
        this.logger.error('Failed to load EZio32.dll:', error);
        // Continue without SDK - fallback to direct USB
      }
      
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      this.logger.error('Failed to initialize Godex SDK:', error);
      return false;
    }
  }
  
  /**
   * Find connected USB printers
   */
  async findUSBPrinters(): Promise<string[]> {
    const printers: string[] = [];
    
    if (!this.ezioLib) {
      this.logger.warn('EZio32.dll not loaded, using fallback');
      return ['USB001', 'USB002', 'USB003']; // Common USB ports
    }
    
    try {
      const buffer = Buffer.alloc(256);
      
      // Find first USB printer
      let printerName = this.ezioLib.FindFirstUSB(buffer);
      if (printerName) {
        printers.push(printerName);
        
        // Find next USB printers
        while (true) {
          printerName = this.ezioLib.FindNextUSB(buffer);
          if (!printerName || printerName === '') break;
          printers.push(printerName);
        }
      }
      
      this.logger.info('Found USB printers:', printers);
      
    } catch (error) {
      this.logger.error('Error finding USB printers:', error);
    }
    
    return printers;
  }
  
  /**
   * Open connection to printer
   */
  async openConnection(portName: string): Promise<boolean> {
    try {
      if (!this.ezioLib) {
        this.logger.warn('Using direct USB without SDK');
        return true; // Fallback mode
      }
      
      this.logger.info('Opening connection to:', portName);
      
      let result: number;
      if (portName.startsWith('USB')) {
        // Open USB connection
        result = this.ezioLib.OpenUSB(portName);
      } else if (portName.includes(':')) {
        // Network printer (IP:Port)
        const [ip, portStr] = portName.split(':');
        const port = parseInt(portStr) || 9101;
        result = this.ezioLib.OpenNet(ip, port);
      } else {
        // Windows driver
        result = this.ezioLib.OpenDriver(portName);
      }
      
      if (result === 1) {
        this.logger.info('Connection opened successfully');
        return true;
      } else {
        this.logger.error('Failed to open connection, error code:', result);
        return false;
      }
      
    } catch (error) {
      this.logger.error('Error opening connection:', error);
      return false;
    }
  }
  
  /**
   * Send EZPL command to printer
   */
  async sendCommand(command: string): Promise<boolean> {
    try {
      if (!this.ezioLib) {
        // Fallback: direct file write to USB
        return this.sendDirectUSB(command);
      }
      
      this.logger.debug('Sending command:', command.substring(0, 50) + '...');
      
      const result = this.ezioLib.SendCommand(command);
      if (result === command.length) {
        this.logger.debug('Command sent successfully');
        return true;
      } else {
        this.logger.error('Failed to send command, sent bytes:', result);
        return false;
      }
      
    } catch (error) {
      this.logger.error('Error sending command:', error);
      return false;
    }
  }
  
  /**
   * Send command directly to USB port (fallback)
   */
  private async sendDirectUSB(command: string): Promise<boolean> {
    const { exec } = require('child_process');
    const fs = require('fs').promises;
    const os = require('os');
    
    try {
      // Write command to temp file
      const tempFile = path.join(os.tmpdir(), `godex_${Date.now()}.prn`);
      await fs.writeFile(tempFile, command, 'utf8');
      
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
            this.logger.error('Direct USB send failed:', error);
            resolve(false);
          } else {
            this.logger.debug('Direct USB send successful');
            resolve(true);
          }
        });
      });
      
    } catch (error) {
      this.logger.error('Direct USB error:', error);
      return false;
    }
  }
  
  /**
   * Close printer connection
   */
  async closeConnection(): Promise<void> {
    try {
      if (this.ezioLib) {
        this.ezioLib.ClosePort();
        this.logger.info('Connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing connection:', error);
    }
  }
  
  /**
   * Get printer status
   */
  async getStatus(): Promise<string> {
    try {
      // Send status command
      await this.sendCommand('~S,CHECK\r\n');
      
      // Read response
      if (this.ezioLib) {
        const buffer = Buffer.alloc(1024);
        const bytesRead = this.ezioLib.RcvBuf(buffer, 1024);
        
        if (bytesRead > 0) {
          const status = buffer.toString('utf8', 0, bytesRead);
          this.logger.info('Printer status:', status);
          return status;
        }
      }
      
      return 'Unknown';
      
    } catch (error) {
      this.logger.error('Error getting status:', error);
      return 'Error';
    }
  }
  
  /**
   * Print label using EZPL commands
   */
  async printLabel(ezplCommands: string): Promise<boolean> {
    try {
      // Ensure proper line endings
      const commands = ezplCommands.replace(/\n/g, '\r\n');
      
      // Send commands
      const success = await this.sendCommand(commands);
      
      if (success) {
        this.logger.info('Label sent to printer successfully');
      }
      
      return success;
      
    } catch (error) {
      this.logger.error('Error printing label:', error);
      return false;
    }
  }
  
  /**
   * Test print a simple label
   */
  async testPrint(): Promise<boolean> {
    const testLabel = [
      '^L',
      'A,50,50,0,4,1,1,N,"GODEX SDK TEST"',
      'A,50,100,0,3,1,1,N,"If this prints, SDK works!"',
      'B,50,150,0,1,2,2,100,B,"123456789"',
      'E'
    ].join('\r\n');
    
    return this.printLabel(testLabel);
  }
}

export default GodexSDKService;