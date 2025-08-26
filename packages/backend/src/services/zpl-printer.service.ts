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
  private isConnected: boolean = false;

  async initialize(options?: any): Promise<boolean> {
    try {
      console.log('🖨️ Initializing ZPL printer service...');
      console.log(`📡 Printer: ${this.printerIP}:${this.printerPort}`);
      
      // Тест подключения
      const connected = await this.testConnection();
      this.isConnected = connected;
      
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
    console.log(`🏷️ Printing ${items.length} labels via ZPL...`);
    
    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No items to print',
        printedItems: 0
      };
    }

    try {
      const jobId = `job_${Date.now()}`;
      let printedCount = 0;
      
      for (const item of items) {
        console.log(`📄 Printing: ${item.item_name}`);
        
        // Генерируем ZPL команду для этикетки
        const zplCommand = this.generateZPLLabel(item, options);
        
        // Отправляем на принтер
        const sent = await this.sendToPrinter(zplCommand);
        
        if (sent) {
          printedCount++;
          
          // Печатаем дополнительные копии если нужно
          const copies = options.copies || 1;
          for (let i = 1; i < copies; i++) {
            await this.sendToPrinter(zplCommand);
            printedCount++;
          }
        }
      }
      
      console.log(`✅ Printed ${printedCount} labels successfully`);
      
      return {
        success: true,
        jobId,
        printedItems: printedCount
      };
      
    } catch (error) {
      console.error('❌ Print job failed:', error);
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
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(5000);
      
      client.connect(this.printerPort, this.printerIP, () => {
        client.write(zplCommand);
        setTimeout(() => {
          client.end();
          resolve(true);
        }, 500);
      });
      
      client.on('error', (err) => {
        console.error('❌ Failed to send to printer:', err.message);
        resolve(false);
      });
      
      client.on('timeout', () => {
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