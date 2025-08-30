import { IPrinterService } from '../interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';
import * as net from 'net';

export interface PrintJobOptions {
  copies?: number;
  labelSize?: 'small' | 'medium' | 'large';
  includeBarcodes?: boolean;
  includeText?: boolean;
  includeQuantity?: boolean;
  includePrices?: boolean;
}

export interface PrintJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
  printedItems: number;
}

export class ZPLPrinterService implements IPrinterService {
  private printerIP: string = '';
  private printerPort: number = 9100;
  private printerName: string = '';
  private connectionType: string = 'ethernet';
  private _isConnected: boolean = false;

  async initialize(options?: any): Promise<boolean> {
    try {
      // Read configuration from environment
      this.connectionType = process.env.PRINTER_CONNECTION_TYPE || 'usb';
      this.printerPort = parseInt(process.env.PRINTER_PORT || '9101');
      this.printerIP = process.env.PRINTER_IP || '192.168.14.200';
      this.printerName = process.env.PRINTER_NAME || 'Godex ZX420i';
      
      console.log('🖨️ Initializing ZPL/EZPL printer service...');
      console.log(`📡 Connection type: ${this.connectionType}`);
      console.log(`📡 Printer: ${this.printerName}`);
      
      if (this.connectionType === 'network') {
        console.log(`📡 Network: ${this.printerIP}:${this.printerPort}`);
        const connected = await this.testConnection();
        this._isConnected = connected;
        
        if (connected) {
          console.log('✅ Network printer initialized successfully');
        }
        return connected;
      } else if (this.connectionType === 'usb') {
        console.log(`📡 USB Port: ${process.env.PRINTER_PORT || 'USB002'}`);
        // For USB, we assume it's connected if Windows sees it
        this._isConnected = true;
        console.log('✅ USB printer initialized successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to initialize ZPL/EZPL printer:', error);
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(3000);
      
      client.connect(this.printerPort, this.printerIP, () => {
        client.write('~HS'); // ZPL status command
        client.end();
        resolve(true);
      });
      
      client.on('error', () => {
        resolve(false);
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });
  }

  async printLabels(items: PackingItem[], options: PrintJobOptions = {}): Promise<PrintJobResult> {
    const jobId = `job_${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`🎯 [PRINT JOB ${jobId}] Starting print job`);
    console.log(`📊 [PRINT JOB ${jobId}] Items to print: ${items.length}`);
    console.log(`⚙️ [PRINT JOB ${jobId}] Options:`, JSON.stringify(options, null, 2));
    
    if (!items || items.length === 0) {
      console.error(`❌ [PRINT JOB ${jobId}] No items provided`);
      return {
        success: false,
        error: 'No items to print',
        printedItems: 0
      };
    }

    // Test connection first
    console.log(`🔍 [PRINT JOB ${jobId}] Testing printer connection...`);
    const isConnected = await this.testConnection();
    if (!isConnected) {
      console.error(`❌ [PRINT JOB ${jobId}] Printer connection failed`);
      return {
        success: false,
        error: `Printer unreachable at ${this.printerIP}:${this.printerPort}`,
        printedItems: 0
      };
    }

    try {
      let printedCount = 0;
      const totalLabels = items.length * (options.copies || 1);
      console.log(`📋 [PRINT JOB ${jobId}] Total labels to print: ${totalLabels}`);
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`📄 [PRINT JOB ${jobId}] Processing item ${i + 1}/${items.length}: ${item.item_name}`);
        
        const labelStartTime = Date.now();
        const zplCommand = this.generateZPLLabel(item, options);
        const generateTime = Date.now() - labelStartTime;
        
        console.log(`⚡ [PRINT JOB ${jobId}] ZPL generated in ${generateTime}ms (${zplCommand.length} chars)`);
        
        // Print main label
        console.log(`🖨️ [PRINT JOB ${jobId}] Sending label to printer...`);
        const sent = await this.sendToPrinter(zplCommand);
        
        if (sent) {
          printedCount++;
          console.log(`✅ [PRINT JOB ${jobId}] Label ${i + 1} printed successfully`);
          
          // Print additional copies
          const copies = options.copies || 1;
          if (copies > 1) {
            console.log(`📋 [PRINT JOB ${jobId}] Printing ${copies - 1} additional copies...`);
            for (let copy = 1; copy < copies; copy++) {
              console.log(`🖨️ [PRINT JOB ${jobId}] Printing copy ${copy + 1}/${copies}...`);
              const copySent = await this.sendToPrinter(zplCommand);
              if (copySent) {
                printedCount++;
                console.log(`✅ [PRINT JOB ${jobId}] Copy ${copy + 1} printed successfully`);
              } else {
                console.error(`❌ [PRINT JOB ${jobId}] Failed to print copy ${copy + 1}`);
              }
            }
          }
        } else {
          console.error(`❌ [PRINT JOB ${jobId}] Failed to print label ${i + 1}`);
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 [PRINT JOB ${jobId}] Print job completed in ${totalTime}ms`);
      console.log(`📊 [PRINT JOB ${jobId}] Final stats: ${printedCount}/${totalLabels} labels printed successfully`);
      
      return {
        success: printedCount > 0,
        jobId,
        printedItems: printedCount
      };
      
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`💥 [PRINT JOB ${jobId}] Print job failed after ${errorTime}ms:`, error);
      console.error(`🔍 [PRINT JOB ${jobId}] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        printer: `${this.printerIP}:${this.printerPort}`
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        printedItems: 0
      };
    }
  }

  private generateZPLLabel(item: PackingItem, options: PrintJobOptions): string {
    // Check if we should use EZPL (Godex) or ZPL (Zebra) format
    const useEZPL = process.env.USE_EZPL !== 'false' && this.printerName.toLowerCase().includes('godex');
    
    if (useEZPL) {
      return this.generateEZPLLabel(item, options);
    } else {
      return this.generateZebraZPLLabel(item, options);
    }
  }
  
  private generateEZPLLabel(item: PackingItem, options: PrintJobOptions): string {
    // EZPL format for Godex printers
    let ezpl = '^L\r\n'; // Start of label
    
    // Set label size
    ezpl += 'Dy2-me-dd\r\n'; // Date format
    ezpl += 'Th:m:s\r\n'; // Time format
    
    // Title - item name
    ezpl += `A,50,30,0,2,1,1,N,"${this.encodeTextEZPL(item.item_name)}"\r\n`;
    
    // English name if available
    if (item.item_name_en) {
      ezpl += `A,50,80,0,1,1,1,N,"${this.encodeTextEZPL(item.item_name_en)}"\r\n`;
    }
    
    // Quantity
    if (options.includeQuantity !== false) {
      ezpl += `A,50,130,0,1,1,1,N,"Qty: ${item.packedQuantity || item.quantity}"\r\n`;
    }
    
    // Price
    if (options.includePrices && item.sale_nis > 0) {
      ezpl += `A,300,130,0,1,1,1,N,"Price: ${item.sale_nis.toFixed(2)} NIS"\r\n`;
    }
    
    // Location
    if (item.location) {
      ezpl += `A,50,180,0,1,1,1,N,"Location: ${item.location}"\r\n`;
    }
    
    // Barcode
    if (options.includeBarcodes !== false && item.barcode) {
      // B = Barcode command
      // Parameters: X,Y,rotation,barcode_type,narrow_bar_width,height,readable,data
      ezpl += `B,50,230,0,1,2,100,B,"${item.barcode}"\r\n`;
    }
    
    // Date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL');
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    
    ezpl += `A,50,350,0,1,1,1,N,"${dateStr} ${timeStr}"\r\n`;
    
    // Item ID
    ezpl += `A,400,350,0,1,1,1,N,"ID: ${item.item_id}"\r\n`;
    
    ezpl += 'E\r\n'; // End of label and print
    
    return ezpl;
  }
  
  private generateZebraZPLLabel(item: PackingItem, options: PrintJobOptions): string {
    // Original ZPL format for Zebra printers
    // Размеры этикетки в точках (203 dpi)
    const labelWidth = 609;  // 80mm at 203dpi
    const labelHeight = 406; // 50mm at 203dpi
    
    let zpl = '^XA\n'; // Начало этикетки
    
    // Заголовок - название товара
    zpl += '^FO50,30\n';
    zpl += '^A0N,35,35\n';
    zpl += `^FD${this.encodeText(item.item_name)}^FS\n`;
    
    // Английское название если есть
    if (item.item_name_en) {
      zpl += '^FO50,80\n';
      zpl += '^A0N,25,25\n';
      zpl += `^FD${item.item_name_en}^FS\n`;
    }
    
    // Количество
    if (options.includeQuantity !== false) {
      zpl += '^FO50,130\n';
      zpl += '^A0N,30,30\n';
      zpl += `^FDQty: ${item.packedQuantity || item.quantity}^FS\n`;
    }
    
    // Цена
    if (options.includePrices && item.sale_nis > 0) {
      zpl += '^FO300,130\n';
      zpl += '^A0N,30,30\n';
      zpl += `^FDPrice: ${item.sale_nis.toFixed(2)} NIS^FS\n`;
    }
    
    // Локация
    if (item.location) {
      zpl += '^FO50,180\n';
      zpl += '^A0N,25,25\n';
      zpl += `^FDLocation: ${item.location}^FS\n`;
    }
    
    // Штрих-код
    if (options.includeBarcodes !== false && item.barcode) {
      zpl += '^FO50,230\n';
      zpl += '^BY2\n'; // Ширина штриха
      zpl += '^BCN,70,Y,N,N\n'; // Code 128, высота 70, с текстом
      zpl += `^FD${item.barcode}^FS\n`;
    }
    
    // Дата и время
    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL');
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    
    zpl += '^FO50,350\n';
    zpl += '^A0N,20,20\n';
    zpl += `^FD${dateStr} ${timeStr}^FS\n`;
    
    // ID товара
    zpl += '^FO400,350\n';
    zpl += '^A0N,20,20\n';
    zpl += `^FDID: ${item.item_id}^FS\n`;
    
    zpl += '^XZ\n'; // Конец этикетки
    
    return zpl;
  }

  private encodeText(text: string): string {
    // Экранируем специальные символы ZPL
    return text
      .replace(/\^/g, '\\5E')  // ^ -> \5E
      .replace(/~/g, '\\7E')   // ~ -> \7E
      .replace(/>/g, '\\3E')   // > -> \3E
      .replace(/</g, '\\3C');  // < -> \3C
  }
  
  private encodeTextEZPL(text: string): string {
    // EZPL has different escaping rules
    // Double quotes need to be escaped
    return text.replace(/"/g, '\\"');
  }

  private async sendToPrinter(zplCommand: string): Promise<boolean> {
    console.log('🔍 [PRINT DEBUG] Starting print job...');
    console.log('🔍 [PRINT DEBUG] Connection type:', this.connectionType);
    
    if (this.connectionType === 'usb') {
      // For USB printing on Windows
      return this.sendToUSBPrinter(zplCommand);
    } else {
      // For network printing
      console.log('🔍 [PRINT DEBUG] Network printer config:', {
        ip: this.printerIP,
        port: this.printerPort,
        timeout: 5000
      });
      console.log('🔍 [PRINT DEBUG] Command length:', zplCommand.length, 'characters');
      console.log('🔍 [PRINT DEBUG] Command preview:', zplCommand.substring(0, 100) + '...');
      
      return this.sendToNetworkPrinter(zplCommand);
    }
  }
  
  private async sendToUSBPrinter(command: string): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');
      
      console.log('🔍 [USB PRINT] Sending to USB printer:', this.printerName);
      console.log('🔍 [USB PRINT] Port:', process.env.PRINTER_PORT);
      
      // Create a temporary file with the EZPL/ZPL commands
      const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.prn`);
      await fs.writeFile(tempFile, command, 'utf8');
      
      console.log('🔍 [USB PRINT] Temp file created:', tempFile);
      
      // Send to printer using raw Windows API
      return new Promise((resolve) => {
        // Try direct port copy first
        const portCommand = `copy /B "${tempFile}" "${process.env.PRINTER_PORT || 'USB002'}"`;
        console.log('🔍 [USB PRINT] Executing port command:', portCommand);
        
        exec(portCommand, async (error: any, stdout: string, stderr: string) => {
          // Clean up temp file
          try {
            await fs.unlink(tempFile);
          } catch (e) {
            console.error('Failed to delete temp file:', e);
          }
          
          if (error) {
            console.error('❌ [USB PRINT] Print failed:', error);
            console.error('❌ [USB PRINT] stderr:', stderr);
            resolve(false);
          } else {
            console.log('✅ [USB PRINT] Print succeeded');
            console.log('✅ [USB PRINT] stdout:', stdout);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ [USB PRINT] Error:', error);
      return false;
    }
  }
  
  private async sendToNetworkPrinter(zplCommand: string): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const client = new net.Socket();
      client.setTimeout(5000);
      
      console.log('🔍 [PRINT DEBUG] Creating TCP socket...');
      
      client.connect(this.printerPort, this.printerIP, () => {
        const connectTime = Date.now() - startTime;
        console.log(`✅ [PRINT DEBUG] Connected to printer in ${connectTime}ms`);
        console.log('🔍 [PRINT DEBUG] Sending EZPL command to printer...');
        
        client.write(zplCommand);
        
        setTimeout(() => {
          const totalTime = Date.now() - startTime;
          console.log(`✅ [PRINT DEBUG] Command sent successfully in ${totalTime}ms total`);
          console.log('🔍 [PRINT DEBUG] Closing connection...');
          client.end();
          resolve(true);
        }, 500);
      });
      
      client.on('error', (err) => {
        const errorTime = Date.now() - startTime;
        console.error(`❌ [PRINT DEBUG] Connection error after ${errorTime}ms:`, {
          message: err.message,
          code: (err as any).code,
          errno: (err as any).errno,
          syscall: (err as any).syscall,
          address: (err as any).address,
          port: (err as any).port
        });
        console.error('🔍 [PRINT DEBUG] This usually indicates network/printer issues');
        resolve(false);
      });
      
      client.on('timeout', () => {
        const timeoutTime = Date.now() - startTime;
        console.error(`⏱️ [PRINT DEBUG] Connection timeout after ${timeoutTime}ms`);
        console.error('🔍 [PRINT DEBUG] Printer may be offline or unreachable');
        client.destroy();
        resolve(false);
      });
    });
  }

  async printBarcodeLabels(items: PackingItem[], options?: PrintJobOptions): Promise<PrintJobResult> {
    return this.printLabels(items, { ...options, includeBarcodes: true });
  }

  async printSingleLabel(item: PackingItem, options?: PrintJobOptions): Promise<PrintJobResult> {
    return this.printLabels([item], options);
  }

  async getStatus(): Promise<any> {
    const connected = await this.testConnection();
    return {
      connected,
      model: 'GoDEX ZX420 (ZPL)',
      isReady: connected
    };
  }

  async configure(config: any): Promise<boolean> {
    if (config.printerIP) this.printerIP = config.printerIP;
    if (config.printerPort) this.printerPort = config.printerPort;
    return true;
  }

  // 🚨 CRITICAL: Add missing methods required by PrintController
  async sendRawCommand(command: string): Promise<boolean> {
    console.log('🔍 [BARCODE DEBUG] =====================================');
    console.log('🔍 [BARCODE DEBUG] Starting barcode/label print process');
    console.log('🔍 [BARCODE DEBUG] =====================================');
    console.log(`📡 [BARCODE DEBUG] Raw command length: ${command.length} characters`);
    console.log(`📊 [BARCODE DEBUG] Command type: ${this.detectCommandType(command)}`);
    console.log(`🔍 [BARCODE DEBUG] Command preview (first 200 chars):`);
    console.log(command.substring(0, 200));
    if (command.length > 200) {
      console.log(`🔍 [BARCODE DEBUG] ... [${command.length - 200} more characters]`);
    }
    console.log('🔍 [BARCODE DEBUG] Starting network transmission...');
    
    const result = await this.sendToPrinter(command);
    
    if (result) {
      console.log('✅ [BARCODE DEBUG] Print job completed successfully!');
    } else {
      console.error('❌ [BARCODE DEBUG] Print job failed!');
      console.error('🔍 [BARCODE DEBUG] Possible causes:');
      console.error('   - Printer is offline or not connected');
      console.error('   - Network connectivity issues');
      console.error('   - Incorrect IP/Port configuration');
      console.error('   - Printer busy or in error state');
    }
    console.log('🔍 [BARCODE DEBUG] =====================================');
    
    return result;
  }

  private detectCommandType(command: string): string {
    if (command.startsWith('^L')) return 'EZPL Format (Godex)';
    if (command.startsWith('^XA')) return 'ZPL Format (Zebra)';
    if (command.includes('B')) return 'Contains Barcodes';
    if (command.includes('A')) return 'Text Labels';
    return 'Unknown Format';
  }

  async getConnectionInfo(): Promise<any> {
    const connected = await this.testConnection();
    return {
      connected,
      host: this.printerIP,
      port: this.printerPort,
      model: 'GoDEX ZX420 (ZPL)',
      status: connected ? 'connected' : 'disconnected'
    };
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async testPrint(): Promise<PrintJobResult> {
    const testItem: PackingItem = {
      item_id: 999,
      item_name: 'Тестовая этикетка',
      item_name_en: 'Test Label',
      barcode: '1234567890123',
      quantity: 1,
      packedQuantity: 1,
      location: 'TEST',
      sale_nis: 10.00,
      // ... остальные поля
    } as PackingItem;
    
    return this.printLabels([testItem]);
  }
}

export default ZPLPrinterService;