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
  private printerIP: string = '192.168.14.200';
  private printerPort: number = 9101;
  private _isConnected: boolean = false;

  async initialize(options?: any): Promise<boolean> {
    try {
      console.log('🖨️ Initializing ZPL printer service...');
      console.log(`📡 Printer: ${this.printerIP}:${this.printerPort}`);
      
      // Тест подключения
      const connected = await this.testConnection();
      this._isConnected = connected;
      
      if (connected) {
        console.log('✅ ZPL printer initialized successfully');
      }
      
      return connected;
    } catch (error) {
      console.error('❌ Failed to initialize ZPL printer:', error);
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

  private async sendToPrinter(zplCommand: string): Promise<boolean> {
    console.log('🔍 [PRINT DEBUG] Starting print job...');
    console.log('🔍 [PRINT DEBUG] Printer config:', {
      ip: this.printerIP,
      port: this.printerPort,
      timeout: 5000
    });
    console.log('🔍 [PRINT DEBUG] Command length:', zplCommand.length, 'characters');
    console.log('🔍 [PRINT DEBUG] Command preview:', zplCommand.substring(0, 100) + '...');
    
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
    if (command.includes('B')) return 'Contains Barcodes';
    if (command.includes('A')) return 'Text Labels';
    if (command.includes('^L') && command.includes('E')) return 'EZPL Label';
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